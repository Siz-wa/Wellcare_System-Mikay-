<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Patient — the actual person receiving care.
 *
 * Distinct from User (the booking account / guarantor).
 * One User can be the guarantor for multiple Patients.
 * Each Patient has their own independent medical record.
 *
 * @property int $id
 * @property int|null $guarantor_id
 * @property string $first_name
 * @property string $last_name
 * @property string $email
 * @property string $contact_number
 * @property int|null $age
 * @property string|null $gender
 * @property string|null $birthdate
 * @property string|null $clinic_id
 */
class Patient extends Model
{
    use HasFactory;
    use RecordsActivity;
    use SoftDeletes;

    /**
     * Audited fields. `hmo_id` is excluded on purpose: it is the patient's
     * insurance member number, and LoaAccessTest already treats it as data
     * that must not leak outside the guarantor's own view. Copying it into an
     * admin-readable audit table would route around that boundary.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return [
            'first_name', 'last_name', 'email', 'contact_number',
            'guarantor_id', 'default_coverage', 'hmo_provider',
        ];
    }

    protected $fillable = [
        'guarantor_id',
        'first_name', 'last_name', 'email', 'contact_number',
        'age', 'gender', 'birthdate', 'address', 'civil_status', 'company',
        'default_coverage', 'hmo_provider', 'hmo_id',
        'clinic_id',
    ];

    protected $casts = [
        'birthdate' => 'date',
        'age' => 'integer',
    ];

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (Patient $patient) {
            if (empty($patient->clinic_id)) {
                $patient->clinic_id = self::generateClinicId();
            }
        });
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    /** The booking account that registered this patient (guarantor) */
    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'guarantor_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    public function allergies(): HasMany
    {
        return $this->hasMany(PatientAllergy::class, 'patient_id');
    }

    public function diagnoses(): HasMany
    {
        return $this->hasMany(PatientDiagnosis::class, 'patient_id')
            ->orderByDesc('diagnosed_at');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PatientDocument::class, 'patient_id');
    }

    public function labResults(): HasMany
    {
        return $this->hasMany(LabTestResult::class, 'patient_id')
            ->latest('requested_at');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function getInitialsAttribute(): string
    {
        return strtoupper(
            substr($this->first_name, 0, 1).
            substr($this->last_name, 0, 1)
        );
    }

    /**
     * Find an existing patient by name + contact, or create a new one.
     *
     * Matching on first_name + last_name + contact_number (case-insensitive).
     * This prevents duplicate records when the same person books through
     * different accounts or slightly different emails.
     */
    public static function findOrCreateFromBooking(array $data, ?int $guarantorId): self
    {
        $existing = self::whereRaw('LOWER(first_name) = ?', [strtolower($data['first_name'])])
            ->whereRaw('LOWER(last_name) = ?', [strtolower($data['last_name'])])
            ->where('contact_number', $data['contact_number'])
            ->first();

        if ($existing) {
            // Update age in case it changed since last visit
            $existing->update(['age' => $data['age'] ?? $existing->age]);

            return $existing;
        }

        return self::create([
            'guarantor_id' => $guarantorId,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'contact_number' => $data['contact_number'],
            'age' => $data['age'] ?? null,
            'gender' => $data['gender'] ?? null,
        ]);
    }

    private static function generateClinicId(): string
    {
        do {
            $id = 'WC-'.strtoupper(Str::random(6));
        } while (self::where('clinic_id', $id)->exists());

        return $id;
    }
}
