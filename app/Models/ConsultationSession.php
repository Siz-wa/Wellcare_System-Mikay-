<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One consultation — the SOAP note, the vitals, and (Phase 3) the video call.
 *
 * Two independent state machines live on this row and must not be conflated:
 *
 *   `status`              the NOTE   draft → finalized          (terminal)
 *   `consultation_status` the CALL   null → waiting → active → ended
 *
 * Both transitions belong to ConsultationSessionService, not to callers. The
 * guards it enforces (a finalized note cannot be reopened; finalizing ends any
 * live call) are the reason it exists — before it, `saveSession()` could mark an
 * appointment completed from any state and silently un-finalize a signed note.
 *
 * Deliberately NOT using RecordsActivity. Its `activityLogAttributes()` would
 * have to name columns, and the interesting ones here are the SOAP fields —
 * copying clinical narrative into `activity_log`, a table the admin UI renders
 * in full. That is the exact mistake the Phase 4 concern's docblock warns
 * against. If auditing is wanted later, log `status`, `consultation_status` and
 * `mode` only.
 */
class ConsultationSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'doctor_id',
        'mode',
        'room_id',
        'consultation_status',
        'started_at',
        'ended_at',
        'meeting_link',
        'platform',
        'subjective',
        'objective',
        'assessment',
        'plan',
        'blood_pressure',
        'heart_rate',
        'temperature',
        'oxygen_saturation',
        'weight',
        'height',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(ConsultationPrescription::class, 'session_id');
    }

    /** The note is signed. Terminal — nothing may edit or reopen it. */
    public function isFinalized(): bool
    {
        return $this->status === 'finalized';
    }

    public function isVirtual(): bool
    {
        return $this->mode === 'virtual';
    }

    /**
     * A call is open — someone may still be on the channel.
     *
     * `waiting` counts as live: the doctor has opened the room and the patient
     * has not arrived yet, and the patient must be able to join. Only `ended`
     * and NULL are closed.
     */
    public function isLive(): bool
    {
        return in_array($this->consultation_status, ['waiting', 'active'], true);
    }
}
