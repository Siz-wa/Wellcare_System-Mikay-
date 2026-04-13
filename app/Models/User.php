<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Spatie\Permission\Traits\HasRoles;


/**
 * @property \Illuminate\Notifications\DatabaseNotificationCollection $notifications
 * @property \Illuminate\Notifications\DatabaseNotificationCollection $unreadNotifications
 *
 * @method \Illuminate\Notifications\DatabaseNotificationCollection notifications()
 * @method \Illuminate\Notifications\DatabaseNotificationCollection unreadNotifications()
 * @method \Illuminate\Support\Collection getRoleNames()
 * @method bool hasRole(string|array $roles)
 * @method bool hasPermissionTo(string $permission)
 * @method void assignRole(string|array $roles)
 * @method void notify(mixed $notification)
 */
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles;

    /**
     * The attributes that are mass assignable.
     * Only authentication credentials live on this table now.
     *
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'password',
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
            'email_verified_at'       => 'datetime',
            'password'                => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
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
            ($this->profile?->first_name ?? '') . ' ' .
            ($this->profile?->last_name  ?? '')
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
        return $this->hasMany(\App\Models\Appointment::class, 'user_id');
    }
 
    /** Allergies on record for this patient */
    public function patientAllergies(): HasMany
    {
        return $this->hasMany(\App\Models\PatientAllergy::class, 'user_id');
    }
 
    /** Diagnosis history for this patient */
    public function patientDiagnoses(): HasMany
    {
        return $this->hasMany(\App\Models\PatientDiagnosis::class, 'user_id')
                    ->orderByDesc('diagnosed_at');
    }
 
    /** Uploaded documents for this patient */
    public function patientDocuments(): HasMany
    {
        return $this->hasMany(\App\Models\PatientDocument::class, 'user_id');
    }
}