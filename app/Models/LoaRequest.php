<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One Letter of Authorization and its approval state.
 *
 * The lifecycle implements Figure 6's processes 3 and 4:
 *
 *   submitted → (HR approves) → approved
 *             → (HR rejects)  → rejected
 *
 * `expired` is a fourth terminal state for an approved LOA whose `valid_until`
 * has passed. Nothing sweeps for it yet — read `is_expired` instead of trusting
 * the column. See WELLCARE-BUILD-PLAN.md Phase 2 "Deferred".
 *
 * Every transition lives in LoaService, never in a controller — the same split
 * LabResultService and BookingService use.
 *
 * @property int $id
 * @property int $patient_id
 * @property string $loa_number
 * @property string $status
 */
class LoaRequest extends Model
{
    use HasFactory;
    use RecordsActivity;
    use SoftDeletes;

    /**
     * Audited fields — the decision trail. `hmo_id` is excluded for the same
     * reason as on Patient: it is the insurance member number that
     * LoaAccessTest asserts must never reach another account.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return ['status', 'approved_by', 'valid_until', 'remarks', 'hmo_provider'];
    }

    protected $fillable = [
        'patient_id',       // the person seen — never drop this, see CLAUDE.md
        'user_id',          // guarantor account (mirrors the other patient_* tables)
        'appointment_id',
        'approved_by',
        'loa_number',
        'hmo_provider',
        'hmo_id',
        'status',
        'remarks',
        'valid_until',
        'requested_at',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'valid_until' => 'date',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (LoaRequest $loa) {
            if (empty($loa->loa_number)) {
                $loa->loa_number = self::generateLoaNumber();
            }
        });
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /** The booking account, kept to match the other patient record tables */
    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    /** The HR/admin user who decided the request */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Requests HR still has to decide — the HMO approvals queue */
    public function scopeAwaitingApproval(Builder $query): Builder
    {
        return $query->where('status', 'submitted');
    }

    /** Approved and still inside its validity window */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'approved')
            ->where(function (Builder $q) {
                $q->whereNull('valid_until')
                    ->orWhereDate('valid_until', '>=', today());
            });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * An approved LOA past its validity date. Derived rather than stored,
     * because no scheduled job writes the `expired` status yet — trusting the
     * column alone would show a stale "approved" badge indefinitely.
     */
    public function getIsExpiredAttribute(): bool
    {
        if ($this->status === 'expired') {
            return true;
        }

        return $this->status === 'approved'
            && $this->valid_until !== null
            && $this->valid_until->isPast();
    }

    /**
     * Collapse status and expiry into the single field the UIs render, so an
     * approved-but-lapsed LOA never reads as usable coverage.
     */
    public function getDisplayStatusAttribute(): string
    {
        return $this->is_expired ? 'expired' : $this->status;
    }

    /**
     * WC-LOA-YYYYMM-NNNN — a monthly sequence, mirroring the WC-XXXXXX shape of
     * patients.clinic_id. The uniqueness loop covers the race between two
     * concurrent bookings picking the same sequence number; the unique index on
     * `loa_number` is the real guarantee.
     */
    private static function generateLoaNumber(): string
    {
        $period = now()->format('Ym');

        $sequence = self::withTrashed()
            ->where('loa_number', 'like', "WC-LOA-{$period}-%")
            ->count() + 1;

        do {
            $number = sprintf('WC-LOA-%s-%04d', $period, $sequence);
            $sequence++;
        } while (self::withTrashed()->where('loa_number', $number)->exists());

        return $number;
    }
}
