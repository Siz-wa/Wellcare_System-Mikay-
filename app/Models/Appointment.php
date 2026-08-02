<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
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
        'branch',
        'appointment_date',
        'appointment_time',
        'patient_status',
        'coverage',
        'hmo',
        'hmo_id',
        'additional_info',
        'status',
        'hold_expires_at',
        'cancellation_reason',
        'cancelled_at',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'hold_expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'age' => 'integer',
    ];

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

    /** Lab tests ordered during this visit, newest request first */
    public function labResults(): HasMany
    {
        return $this->hasMany(LabTestResult::class, 'appointment_id')
            ->latest('requested_at');
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
}
