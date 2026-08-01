<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\DatabaseNotificationCollection;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property DatabaseNotificationCollection $notifications
 * @property DatabaseNotificationCollection $unreadNotifications
 *
 * @method \Illuminate\Notifications\DatabaseNotificationCollection notifications()
 * @method \Illuminate\Notifications\DatabaseNotificationCollection unreadNotifications()
 * @method \Illuminate\Support\Collection getRoleNames()
 * @method static \Illuminate\Database\Eloquent\Builder role(string|array $roles)
 * @method bool hasRole(string|array $roles)
 * @method bool hasPermissionTo(string $permission)
 * @method void assignRole(string|array $roles)
 * @method void notify(mixed $notification)
 */
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, RecordsActivity, TwoFactorAuthenticatable;

    /**
     * Audited fields. `email` and `is_active` only — deliberately NOT
     * `password`, `two_factor_secret`, `two_factor_recovery_codes` or
     * `remember_token`. See App\Concerns\RecordsActivity for why naming these
     * explicitly (rather than logFillable()) is the security boundary.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return ['email', 'is_active'];
    }

    /**
     * The attributes that are mass assignable.
     * Only authentication credentials live on this table now.
     *
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'password',
        'is_active',
    ];

    /**
     * Model-level defaults.
     *
     * `is_active` also defaults to true in the database, but a column default
     * is only applied on INSERT — it is never read back into the model that
     * performed the insert. So a freshly created User carries a NULL
     * `is_active` in memory until it is refreshed, and EnsureUserIsActive
     * (which reads the in-memory model off the session) would treat that as
     * deactivated and log them straight back out. Declaring it here means the
     * attribute is true from the moment the model exists.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_active' => true,
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    /** Accounts that may still sign in — Figure 4's "Deactivate/Reactivate Acc". */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('is_active', false);
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function profile(): HasOne
    {
        return $this->hasOne(PatientProfile::class, 'user_id');
    }

    public function medical(): HasOneThrough
    {
        return $this->hasOneThrough(
            PatientMedical::class,
            PatientProfile::class,
            'user_id',    // FK on patient_profiles → users
            'profile_id', // FK on patient_medical  → patient_profiles
        );
    }

    // ── Computed: full name via profile relationship ───────────────────────────
    // Keeps $user->name working across Fortify, emails, and notifications.
    public function getNameAttribute(): string
    {
        return trim(
            ($this->profile?->first_name ?? '').' '.
            ($this->profile?->last_name ?? '')
        );
    }

    public function doctorProfile(): HasOne
    {
        return $this->hasOne(DoctorProfile::class);
    }

    public function isDoctor(): bool
    {
        return $this->hasRole('doctor');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'user_id');
    }

    /**
     * The people this account receives care for — the inverse of
     * Patient::guarantor().
     *
     * One account can hold several patients (a parent booking for their
     * children). This is the ONLY correct way to scope a patient-facing
     * medical record query: keying on `user_id` instead bleeds records
     * between two patients who share a guarantor.
     */
    public function guaranteedPatients(): HasMany
    {
        return $this->hasMany(Patient::class, 'guarantor_id');
    }

    /** Allergies on record for this patient */
    public function patientAllergies(): HasMany
    {
        return $this->hasMany(PatientAllergy::class, 'user_id');
    }

    /** Diagnosis history for this patient */
    public function patientDiagnoses(): HasMany
    {
        return $this->hasMany(PatientDiagnosis::class, 'user_id')
            ->orderByDesc('diagnosed_at');
    }

    /** Uploaded documents for this patient */
    public function patientDocuments(): HasMany
    {
        return $this->hasMany(PatientDocument::class, 'user_id');
    }
}
