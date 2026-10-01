<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

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

    /**
     * SC-1(a). Nothing deletes a session today, which is exactly why the guard
     * is cheap to add now and expensive to add after something does.
     *
     * Note this is orthogonal to the RecordsActivity decision above: that one
     * is about keeping SOAP narrative OUT of a table the admin UI renders; this
     * one is about keeping the narrative itself recoverable.
     */
    use SoftDeletes;

    /**
     * Where the six vitals on this row came from.
     *
     * A doctor on a video call cannot measure any of them, so a virtual visit's
     * numbers are always something the patient read out to them. Telehealth
     * documentation guidance is consistent on this point: a patient-supplied
     * reading has to be identified as patient-supplied in the record, because
     * otherwise it is indistinguishable from one taken with an instrument.
     *
     * `not_obtained` is the explicit form of an empty vitals form -- the patient
     * had no cuff -- as distinct from a blank one nobody filled in.
     *
     * @var array<int, string>
     */
    public const VITALS_SOURCES = [
        'clinic_measured',
        'patient_reported',
        'home_device',
        'not_obtained',
    ];

    /** @var array<string, string> */
    public const VITALS_SOURCE_LABELS = [
        'clinic_measured' => 'Measured in clinic',
        'patient_reported' => 'Patient-reported',
        'home_device' => 'Home device reading',
        'not_obtained' => 'Not obtained',
    ];

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
        // The display strings the editor posts and every current reader shows.
        'blood_pressure',
        'heart_rate',
        'temperature',
        'oxygen_saturation',
        'weight',
        'height',
        // Task 3.1 — the same readings as measurements. Written alongside the
        // strings by ConsultationSessionService::numericVitals(), and the only
        // form a trend, a BMI or a range check can be computed from.
        'systolic',
        'diastolic',
        'heart_rate_bpm',
        'temperature_c',
        'oxygen_saturation_pct',
        'weight_kg',
        'height_cm',
        'vitals_source',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            // SC-5 — encrypted at rest. See the encrypt_sensitive_clinical_columns
            // migration for why these columns and not others: anything the app
            // filters on in SQL stays plaintext, because LIKE over ciphertext
            // returns nothing rather than failing, and anything audited into
            // activity_log stays plaintext too, because Spatie reads through the
            // cast and would just relocate the clear text.
            'subjective' => 'encrypted',
            'objective' => 'encrypted',
            'assessment' => 'encrypted',
            'plan' => 'encrypted',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            // Task 3.1 — the measurement half of the vitals. Cast so a trend
            // chart receives numbers rather than numeric strings.
            'systolic' => 'integer',
            'diastolic' => 'integer',
            'heart_rate_bpm' => 'integer',
            'temperature_c' => 'float',
            'oxygen_saturation_pct' => 'integer',
            'weight_kg' => 'float',
            'height_cm' => 'float',
        ];
    }

    /**
     * Body mass index, or null when either measurement is missing.
     *
     * Derived rather than stored: it is a pure function of two columns, and a
     * stored copy is one that can disagree with them after a correction.
     */
    public function bmi(): ?float
    {
        if (! $this->weight_kg || ! $this->height_cm) {
            return null;
        }

        $metres = $this->height_cm / 100;

        return round($this->weight_kg / ($metres ** 2), 1);
    }

    /**
     * Adult reference ranges, used to flag a reading as out of range.
     *
     * Deliberately wide. These are screening bounds meant to catch a value
     * worth a second look, not diagnostic thresholds — and they are ADULT
     * ranges, which is the limitation that matters most here: a healthy
     * newborn's heart rate of 140 sits far outside every row below.
     *
     * WellCare sees paediatric patients, so this must not be presented to a
     * clinician as a judgement about a child. Until age-banded ranges exist,
     * outOfRange() returns nothing for patients under 18 rather than flagging
     * normal childhood physiology as abnormal.
     *
     * @var array<string, array{0: float, 1: float, 2: string}>
     */
    public const ADULT_RANGES = [
        'systolic' => [90, 140, 'Systolic BP'],
        'diastolic' => [60, 90, 'Diastolic BP'],
        'heart_rate_bpm' => [50, 100, 'Heart rate'],
        'temperature_c' => [36.0, 37.5, 'Temperature'],
        'oxygen_saturation_pct' => [95, 100, 'Oxygen saturation'],
    ];

    /**
     * Which recorded vitals fall outside the adult reference range.
     *
     * Returns an empty array when the patient is under 18 or their age is
     * unknown — see ADULT_RANGES. An empty result therefore means "nothing to
     * flag OR not assessable", never "everything is normal", and the UI must
     * not word it as reassurance.
     *
     * @return array<int, array{field: string, label: string, value: float, low: float, high: float}>
     */
    public function outOfRange(): array
    {
        $age = $this->appointment?->age;

        if ($age === null || $age < 18) {
            return [];
        }

        $flags = [];

        foreach (self::ADULT_RANGES as $field => [$low, $high, $label]) {
            $value = $this->{$field};

            if ($value === null) {
                continue;
            }

            if ($value < $low || $value > $high) {
                $flags[] = [
                    'field' => $field,
                    'label' => $label,
                    'value' => (float) $value,
                    'low' => (float) $low,
                    'high' => (float) $high,
                ];
            }
        }

        return $flags;
    }

    /**
     * This patient's recorded vitals over time, oldest first.
     *
     * The view structured vitals exist for: a clinician reads the shape of the
     * last several readings, not the last one. Keyed on the PATIENT rather than
     * the account, so a guarantor's own readings never appear on their child's
     * chart.
     *
     * Only rows with at least one measurement are returned — a consultation
     * where nothing was obtained is not a gap in the trend, it is not a point
     * on it.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function vitalsTrendFor(int $patientId, int $limit = 12): array
    {
        return static::query()
            ->whereHas('appointment', fn ($q) => $q->where('patient_id', $patientId))
            ->whereNotNull('appointment_id')
            ->where(function ($q) {
                foreach (['systolic', 'heart_rate_bpm', 'temperature_c', 'oxygen_saturation_pct', 'weight_kg'] as $column) {
                    $q->orWhereNotNull($column);
                }
            })
            ->with('appointment:id,patient_id,appointment_at,appointment_date')
            ->join('appointments', 'appointments.id', '=', 'consultation_sessions.appointment_id')
            ->orderBy('appointments.appointment_at')
            ->select('consultation_sessions.*')
            ->limit($limit)
            ->get()
            ->map(fn (self $session) => [
                'date' => $session->appointment?->appointment_at?->toDateString(),
                'systolic' => $session->systolic,
                'diastolic' => $session->diastolic,
                'heartRate' => $session->heart_rate_bpm,
                'temperature' => $session->temperature_c,
                'oxygenSaturation' => $session->oxygen_saturation_pct,
                'weight' => $session->weight_kg,
                'height' => $session->height_cm,
                'bmi' => $session->bmi(),
            ])
            ->values()
            ->all();
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
     * The source to assume when the doctor did not pick one.
     *
     * Derived from the mode rather than defaulted in the schema, because the
     * honest default differs per mode and the schema cannot see the mode: in
     * the clinic someone had an instrument in their hand, on a video call
     * nobody did.
     */
    public function defaultVitalsSource(): string
    {
        return $this->isVirtual() ? 'patient_reported' : 'clinic_measured';
    }

    /**
     * Human label for the record, or null for a row that predates the column --
     * whose provenance is genuinely unknown and must not be guessed at.
     */
    public function vitalsSourceLabel(): ?string
    {
        return self::VITALS_SOURCE_LABELS[$this->vitals_source] ?? null;
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
