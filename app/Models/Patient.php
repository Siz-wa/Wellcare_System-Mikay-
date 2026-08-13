<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
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
 * @property string|null $relationship_to_guarantor
 * @property string $first_name
 * @property string $last_name
 * @property string $email
 * @property string $contact_number
 * @property int|null $age
 * @property string|null $gender
 * @property Carbon|null $birthdate
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
            'guarantor_id', 'relationship_to_guarantor',
            'default_coverage', 'hmo_provider',
        ];
    }

    /**
     * Anyone this age or younger is treated as a minor: they cannot hold their
     * own HMO or PhilHealth membership, so the booking flow does not offer them
     * a coverage choice.
     *
     * Same threshold as BookAppointmentRequest::PEDIATRICS_MAX_AGE on purpose —
     * two different numbers for "is this a child" would eventually disagree.
     */
    public const MINOR_MAX_AGE = 18;

    protected $fillable = [
        'guarantor_id', 'relationship_to_guarantor', 'relationship_note',
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
     * The patient's age today.
     *
     * `age` is a stored integer, so it was only ever correct on the day it was
     * typed: a patient recorded at 17 stays 17 in the column forever, and the
     * booking flow would keep filing them as a minor and offering Pediatrics
     * years after their birthday. Where a birthdate exists it is the truth and
     * the column is just a cache; where it does not, the column is all there is.
     */
    public function getCurrentAgeAttribute(): ?int
    {
        return $this->birthdate?->age ?? $this->age;
    }

    /** Too young to hold their own coverage. Null age is not assumed to be a child. */
    public function isMinor(): bool
    {
        $age = $this->current_age;

        return $age !== null && $age <= self::MINOR_MAX_AGE;
    }

    /**
     * How this patient relates to their guarantor, in words. "Other" carries a
     * free-text note, which is the whole reason that column exists.
     */
    public function getRelationshipLabelAttribute(): ?string
    {
        if ($this->relationship_to_guarantor === 'other') {
            return $this->relationship_note ?: 'Other';
        }

        return match ($this->relationship_to_guarantor) {
            'self' => 'Myself',
            'spouse' => 'Spouse',
            'child' => 'Child',
            'parent' => 'Parent',
            'sibling' => 'Sibling',
            default => null,
        };
    }

    /**
     * Find an existing patient by name + contact, or create a new one.
     *
     * Matching on first_name + last_name + contact_number (case-insensitive).
     * This prevents duplicate records when the same person books through
     * different accounts or slightly different emails.
     *
     * The match is scoped to the guarantor. Without that scope a name + phone
     * collision between two unrelated families would hand the booking an
     * existing Patient owned by someone else, and every allergy, diagnosis and
     * document on that record would follow — `guarantor_id` is never reassigned
     * on the found branch, so the bleed is silent and permanent.
     *
     * Guarantor-less bookings (staff walk-ins) keep the old global match, since
     * there is no owner to scope by.
     */
    public static function findOrCreateFromBooking(array $data, ?int $guarantorId): self
    {
        $existing = self::whereRaw('LOWER(first_name) = ?', [strtolower($data['first_name'])])
            ->whereRaw('LOWER(last_name) = ?', [strtolower($data['last_name'])])
            ->where('contact_number', $data['contact_number'])
            ->when(
                $guarantorId !== null,
                fn ($query) => $query->where('guarantor_id', $guarantorId),
            )
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

    /**
     * The guarantor's own Patient record — the "Myself" option in the booking
     * gate. Idempotent: returns the existing `self` row if there is one.
     *
     * Returns null when the account profile is too thin to build a valid row.
     * `patients.contact_number` is NOT NULL while `patient_profiles.contact_number`
     * is nullable, so a half-filled profile cannot be promoted silently — the
     * booking gate offers a prefilled "Myself" quick-add instead, and the
     * guarantor supplies the missing field once.
     */
    public static function ensureSelfPatient(User $user): ?self
    {
        $existing = self::where('guarantor_id', $user->id)
            ->where('relationship_to_guarantor', 'self')
            ->first();

        if ($existing) {
            return $existing;
        }

        $profile = $user->profile;

        if (! $profile?->first_name || ! $profile?->last_name || ! $profile?->contact_number) {
            return null;
        }

        // Every record that predates `relationship_to_guarantor` has it null,
        // including the one the account holder has been seen under for years.
        // Creating a fresh "self" row beside it would put their whole history —
        // visits, allergies, documents — on the record the gate does NOT offer,
        // and label the empty one "Myself". Adopt the existing match instead.
        $ownRecord = self::where('guarantor_id', $user->id)
            ->whereNull('relationship_to_guarantor')
            ->whereRaw('LOWER(first_name) = ?', [strtolower($profile->first_name)])
            ->whereRaw('LOWER(last_name) = ?', [strtolower($profile->last_name)])
            ->first();

        if ($ownRecord) {
            $ownRecord->update(['relationship_to_guarantor' => 'self']);

            return $ownRecord;
        }

        return self::create([
            'guarantor_id' => $user->id,
            'relationship_to_guarantor' => 'self',
            'first_name' => $profile->first_name,
            'last_name' => $profile->last_name,
            'email' => $user->email,
            'contact_number' => $profile->contact_number,
            'age' => $profile->birthdate?->age,
            'gender' => self::normalizeGender($profile->gender),
            'birthdate' => $profile->birthdate,
            'address' => $profile->address,
            'civil_status' => $profile->civil_status,
            'company' => $profile->company,
        ]);
    }

    /**
     * `patient_profiles` stores 'M'/'F'; `patients`, the booking form and
     * BookAppointmentRequest all use 'male'/'female'/'other'.
     *
     * Passing the raw column through would silently break the OB-Gyne service
     * filter, which tests `gender === 'male'`. Unrecognised values return null
     * so the guarantor just picks for themselves.
     */
    public static function normalizeGender(?string $gender): ?string
    {
        return match (strtolower(trim((string) $gender))) {
            'm', 'male' => 'male',
            'f', 'female' => 'female',
            'other' => 'other',
            default => null,
        };
    }

    private static function generateClinicId(): string
    {
        do {
            $id = 'WC-'.strtoupper(Str::random(6));
        } while (self::where('clinic_id', $id)->exists());

        return $id;
    }
}
