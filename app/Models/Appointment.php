<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use App\Services\BookingService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Appointment
 * ──────────────────────────────────────────────────────────────────────────────
 * `doctor_id`  → users.id  (the doctor — no separate Doctor model)
 * `user_id`    → users.id  (the booking account / guarantor)
 * `patient_id` → patients.id (the actual person receiving care)
 *
 * patient_id MUST be in $fillable — if it is not, BookingService::bookSlot()
 * silently drops it and every appointment stays at patient_id = NULL,
 * causing all records to bleed across patients sharing the same account.
 */
final class Appointment extends Model
{
    use HasFactory;
    use RecordsActivity;
    use SoftDeletes;

    /**
     * Audited fields — the scheduling decisions an admin may need to account
     * for, not the patient's demographic data (which is duplicated onto every
     * appointment row and would flood the log with unchanged personal details).
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return [
            'status', 'doctor_id', 'appointment_date', 'appointment_time',
            'coverage', 'cancellation_reason',
        ];
    }

    protected $fillable = [
        'user_id',            // FK → users.id  (booking account / guarantor)
        'patient_id',         // FK → patients.id (actual person receiving care) ← CRITICAL
        'first_name',
        'last_name',
        'email',
        'contact_number',
        'age',
        'gender',
        'doctor_id',          // FK → users.id (doctor), nullable = next available
        'service',
        'consultation_type',  // in_person | virtual — chosen by the patient at booking
        'branch',
        'appointment_date',
        'appointment_time',
        // Derived from the two above by booted(), never set by callers. Present
        // here only so a caller that DOES supply it (a test pinning an exact
        // instant) is not silently ignored by mass assignment.
        'appointment_at',
        'duration_minutes',  // snapshotted slot length — see the overlap rules in BookingService
        'patient_status',
        'coverage',
        'hmo',
        'hmo_id',
        'additional_info',
        'status',
        'hold_expires_at',
        // Task 2.1 — which reminder tiers have gone out. Stamped by
        // wellcare:reminders:send, never set by a user.
        'reminded_ahead_at',
        'reminded_same_day_at',
        'cancellation_reason',
        'cancelled_at',
    ];

    protected $casts = [
        // SC-5 — encrypted at rest. See the encrypt_sensitive_clinical_columns
        // migration for why these columns and not others: anything the app
        // filters on in SQL stays plaintext, because LIKE over ciphertext
        // returns nothing rather than failing, and anything audited into
        // activity_log stays plaintext too, because Spatie reads through the
        // cast and would just relocate the clear text.
        'hmo_id' => 'encrypted',
        'additional_info' => 'encrypted',
        'appointment_date' => 'date',
        'appointment_at' => 'datetime',
        'hold_expires_at' => 'datetime',
        'reminded_ahead_at' => 'datetime',
        'reminded_same_day_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'age' => 'integer',
        'duration_minutes' => 'integer',
    ];

    /**
     * Keep `appointment_at` in step with the date and display-time columns.
     *
     * A model hook rather than a line in BookingService::bookSlot(), because
     * bookSlot() is not the only writer — the factory, both seeders, and the
     * reschedule flow arriving in Phase 2 all create or move appointments. A
     * derived column maintained at one call site drifts the first time someone
     * adds a second call site; maintained here it cannot.
     *
     * Recomputed whenever either source column is dirty, so moving an
     * appointment updates the sort key rather than leaving it on the old day.
     * An explicitly supplied `appointment_at` that is NOT accompanied by a
     * change to the source columns is left alone, which is what lets a test pin
     * an exact instant.
     */
    protected static function booted(): void
    {
        self::saving(function (self $appointment): void {
            $sourcesChanged = $appointment->isDirty(['appointment_date', 'appointment_time']);

            if (! $sourcesChanged && $appointment->appointment_at !== null) {
                return;
            }

            $appointment->appointment_at = $appointment->deriveAppointmentAt();
        });

        /*
         * A visit that is no longer happening takes its undecided LOA with it.
         *
         * Left `submitted`, the request sat in the HR dashboard and the
         * approvals queue for good: a decision nobody could make, about a date
         * already gone. Here rather than in one cancel path because there are
         * four (AppointmentCancellationService, BookingService, the stale
         * sweep, the payment sweep), and the stuck records came from the gap
         * between them. `expired`, not `rejected`: HR decided nothing, and
         * "Rejected today" must count only what HR rejected. LoaService::reject
         * sets `rejected` before it cancels, so it is never caught here.
         */
        self::updated(function (self $appointment): void {
            if (! $appointment->wasChanged('status') || ! in_array($appointment->status, ['cancelled', 'no_show'], true)) {
                return;
            }

            LoaRequest::where('appointment_id', $appointment->id)
                ->where('status', 'submitted')
                ->get()
                ->each(fn (LoaRequest $loa) => $loa->update([
                    'status' => 'expired',
                    'remarks' => 'Closed without a decision: the appointment was '
                        .($appointment->status === 'no_show' ? 'marked a no-show.' : 'cancelled.'),
                ]));
        });
    }

    /**
     * Recombine the date and the display string into one instant, or null if
     * either is missing or the string does not parse.
     *
     * Null rather than a guess: a missing sort key is visible and recoverable,
     * a plausible-looking wrong one is neither.
     */
    private function deriveAppointmentAt(): ?Carbon
    {
        if (blank($this->appointment_date) || blank($this->appointment_time)) {
            return null;
        }

        $date = $this->appointment_date instanceof CarbonInterface
            ? $this->appointment_date->toDateString()
            : (string) $this->appointment_date;

        try {
            return Carbon::parse($date.' '.$this->appointment_time);
        } catch (\Throwable) {
            return null;
        }
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    /** The Patient record — actual person receiving care */
    public function patientRecord(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /** The booking account (guarantor) — who logged in and made the booking */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** The assigned doctor */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function patientProfile(): BelongsTo
    {
        return $this->belongsTo(PatientProfile::class, 'user_id', 'user_id');
    }

    public function consultationSession(): HasOne
    {
        return $this->hasOne(ConsultationSession::class, 'appointment_id');
    }

    /**
     * The HMO letter of authorisation behind this booking, for `coverage=hmo`.
     *
     * The inverse of LoaRequest::appointment(), which existed on its own until
     * 2026-09-11. Null for a cash booking.
     */
    public function loaRequest(): HasOne
    {
        return $this->hasOne(LoaRequest::class, 'appointment_id');
    }

    /**
     * What this visit costs the patient and whether it has been settled.
     *
     * Only ever present on a virtual self-pay booking — the one combination
     * that owes the clinic money up front, because it is the one with no
     * cashier between the patient and the doctor. Null everywhere else, which
     * is why isSettledForConsultation() reads a null as "nothing to collect"
     * rather than as "unpaid".
     */
    public function paymentVerification(): HasOne
    {
        return $this->hasOne(PaymentVerification::class, 'appointment_id');
    }

    /** Lab tests ordered during this visit, newest request first */
    public function labResults(): HasMany
    {
        return $this->hasMany(LabTestResult::class, 'appointment_id')
            ->latest('requested_at');
    }

    /**
     * Statuses that no longer occupy the calendar.
     *
     * A cancelled or no-show appointment frees its slot, its share of the
     * doctor's daily cap, and — since a patient may hold several bookings a day
     * — its share of the patient's own day. Every query that asks "is this time
     * spoken for?" excludes exactly these, so they are named once here rather
     * than repeated as a literal array in each one.
     *
     * @var array<int, string>
     */
    public const RELEASED_STATUSES = ['cancelled', 'no_show'];

    /**
     * The visit's start as a real point in time.
     *
     * Reads the stored `appointment_at` column, which booted() keeps in step
     * with the date and display-time columns. The recombination is kept as a
     * fallback for the one case the column can be absent on an otherwise valid
     * model: an instance built in memory and not yet saved.
     */
    public function startsAt(): CarbonInterface
    {
        return $this->appointment_at
            ?? $this->deriveAppointmentAt()
            ?? Carbon::parse(
                $this->appointment_date->toDateString().' '.$this->appointment_time
            );
    }

    /**
     * The moment the clinic is free again — start plus the snapshotted slot
     * length. Exclusive: a 30-minute 9:00 visit ends at 9:30, and a 9:30 visit
     * does not overlap it.
     */
    public function endsAt(): CarbonInterface
    {
        return $this->startsAt()->addMinutes(
            $this->duration_minutes ?: BookingService::FALLBACK_SLOT_MINUTES
        );
    }

    /**
     * Does this appointment's time window collide with the given one?
     *
     * Half-open on both sides ([start, end)), which is what makes back-to-back
     * bookings legal — the whole point of allowing a patient more than one
     * appointment a day.
     */
    public function overlaps(CarbonInterface $start, CarbonInterface $end): bool
    {
        return $this->startsAt()->lt($end) && $this->endsAt()->gt($start);
    }

    public function isHeld(): bool
    {
        return $this->hold_expires_at !== null
            && $this->hold_expires_at->isFuture();
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, ['completed', 'cancelled', 'no_show'], true);
    }

    /** The patient asked for a video visit rather than an in-clinic one. */
    public function isVirtual(): bool
    {
        return $this->consultation_type === 'virtual';
    }

    /**
     * The visit is underway — the only window in which a video room may open.
     *
     * Excludes `confirmed`: a room opened before the patient checks in has no
     * one to admit, and excludes everything terminal for the obvious reason.
     */
    public function isInConsultation(): bool
    {
        return in_array($this->status, ['checked_in', 'in_progress'], true);
    }

    /**
     * Has the clinic been paid for this visit, insofar as it expects to be?
     *
     * DERIVED, never stored. The obvious alternative is an
     * `appointments.payment_status` column kept in step with the record, and it
     * is the wrong one for the reason LoaRequest::$is_expired gives: a
     * denormalised copy drifts the first time something writes one table and
     * not the other, and a visit wrongly marked paid opens a consultation
     * nobody collected for.
     *
     * A NULL relation means TRUE, and that is the important case rather than an
     * edge one. Every in-person visit, every HMO, PhilHealth and corporate
     * booking, and every appointment that predates this module has no payment
     * record — none of them owe anything here, and reading a missing record as
     * "unpaid" would lock the entire existing appointment book out of its own
     * consultations.
     */
    public function isSettledForConsultation(): bool
    {
        $payment = $this->paymentVerification;

        return $payment === null || $payment->isSettled();
    }
}
