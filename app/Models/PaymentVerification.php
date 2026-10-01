<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One video consultation's fee and the evidence that it was settled.
 *
 * The lifecycle mirrors LoaRequest's, because it is the same kind of object —
 * something a patient raises, staff works from a queue, and a decision on which
 * releases or blocks a visit:
 *
 *   pending → (patient declares a remittance) → submitted
 *           → (staff confirms against the clinic's records) → verified
 *           → (staff finds nothing matching)                → rejected
 *   pending → (clinic chooses not to collect)               → waived
 *
 * `rejected` is NOT terminal, and that is the one place this diverges from
 * LoaRequest. A rejected LOA means the insurer declined coverage and the visit
 * cannot proceed; a rejected payment usually means the patient fat-fingered a
 * reference number, which they can simply correct. Sending them back to
 * `submitted` costs nothing and saves a re-booking.
 *
 * Every transition lives in PaymentVerificationService, never in a controller —
 * the same split LoaService, BookingService and LabResultService use.
 *
 * @property int $id
 * @property int $appointment_id
 * @property int $patient_id
 * @property string $payment_reference
 * @property string $status
 */
class PaymentVerification extends Model
{
    use HasFactory;
    use RecordsActivity;
    use SoftDeletes;

    /**
     * Statuses in which the clinic considers the consultation settled.
     *
     * Named once here because three different surfaces ask the question — the
     * room gate, the sweeper and the patient's badge — and a literal array
     * repeated in each is how one of them ends up disagreeing.
     *
     * @var array<int, string>
     */
    public const SETTLED_STATUSES = ['verified', 'waived'];

    /**
     * Audited fields — the money trail. `remittance_reference` is excluded for
     * the same reason `hmo_id` is excluded on LoaRequest: it is the financial
     * identifier the encryption cast exists to protect, and Spatie reads
     * through the cast, so logging it would just relocate the clear text.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return ['status', 'method', 'amount_due', 'amount_paid', 'verified_by', 'remarks'];
    }

    protected $fillable = [
        'appointment_id',
        'patient_id',       // the person seen — never drop this, see CLAUDE.md
        'user_id',          // guarantor account (mirrors the other patient_* tables)
        'verified_by',
        'payment_reference',
        'status',
        'method',
        'amount_due',
        'amount_paid',
        'remittance_reference',
        'proof_path',
        'proof_name',
        'proof_mime',
        'remarks',
        'due_at',
        'submitted_at',
        'verified_at',
        'rejected_at',
    ];

    protected $casts = [
        // SC-5 — encrypted at rest, for the reasons the create migration gives.
        'remittance_reference' => 'encrypted',
        'amount_due' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'due_at' => 'datetime',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (self $payment) {
            if (empty($payment->payment_reference)) {
                $payment->payment_reference = self::generatePaymentReference();
            }
        });
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /** The booking account, kept to match the other patient record tables */
    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** The HR officer or cashier who checked the clinic's records */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Remittances staff still has to check — the verification queue */
    public function scopeAwaitingVerification(Builder $query): Builder
    {
        return $query->where('status', 'submitted');
    }

    /** Owed, with nothing declared against it yet — what the sweeper watches */
    public function scopeUnsettled(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending', 'rejected']);
    }

    /**
     * Only payments against a visit that can still happen.
     *
     * Without this the staff queue silently fills with dead rows. A patient
     * who books, never pays and is swept still owns a `pending` record, and a
     * completed visit's record is settled history — neither is work, and an
     * officer scrolling past a month of them stops reading the list.
     *
     * Deliberately NOT applied inside unsettled(): the sweeper composes its own
     * appointment filter, and a scope that quietly narrowed the set it operates
     * on would be the kind of hidden coupling that makes a cron job skip rows
     * nobody can explain.
     */
    public function scopeForLiveAppointments(Builder $query): Builder
    {
        return $query->whereHas('appointment', fn (Builder $appointment) => $appointment
            ->whereNotIn('status', [...Appointment::RELEASED_STATUSES, 'completed'])
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * May the consultation go ahead on the strength of this record?
     *
     * The single question the room gate asks. Note that `submitted` is NOT
     * enough: an unchecked claim is a claim, and treating it as payment would
     * make the whole verification step decorative.
     */
    public function isSettled(): bool
    {
        return in_array($this->status, self::SETTLED_STATUSES, true);
    }

    /** Waiting on the patient to do something */
    public function isOwed(): bool
    {
        return in_array($this->status, ['pending', 'rejected'], true);
    }

    /**
     * Past its deadline and still unpaid.
     *
     * Derived rather than stored, for the reason LoaRequest::$is_expired gives:
     * the sweeper is the only thing that acts on a lapsed deadline, and a
     * column it had not reached yet would show a stale badge.
     */
    public function getIsOverdueAttribute(): bool
    {
        return $this->isOwed()
            && $this->due_at !== null
            && $this->due_at->isPast();
    }

    /**
     * What the patient is short by, or null when nothing is outstanding.
     *
     * A declared amount that does not match the fee is the single most common
     * reason a remittance needs a human, so the queue renders this rather than
     * making the officer subtract two columns by eye.
     */
    public function getShortfallAttribute(): ?float
    {
        if ($this->amount_paid === null) {
            return null;
        }

        $difference = (float) $this->amount_due - (float) $this->amount_paid;

        return abs($difference) < 0.01 ? null : round($difference, 2);
    }

    /**
     * The channel as the clinic labels it, falling back to the stored value so
     * a channel removed from config still reads as something.
     */
    public function getMethodLabelAttribute(): ?string
    {
        if ($this->method === null) {
            return null;
        }

        return config("payments.channels.{$this->method}.label")
            ?? ucwords(str_replace('_', ' ', $this->method));
    }

    /**
     * WC-PAY-YYYYMM-NNNN — a monthly sequence, mirroring loa_requests.
     * The uniqueness loop covers the race between two concurrent bookings
     * picking the same sequence number; the unique index is the real guarantee.
     */
    private static function generatePaymentReference(): string
    {
        $period = now()->format('Ym');

        $sequence = self::withTrashed()
            ->where('payment_reference', 'like', "WC-PAY-{$period}-%")
            ->count() + 1;

        do {
            $reference = sprintf('WC-PAY-%s-%04d', $period, $sequence);
            $sequence++;
        } while (self::withTrashed()->where('payment_reference', $reference)->exists());

        return $reference;
    }
}
