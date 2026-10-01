<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use App\Notifications\QueuedResetPassword;
use App\Notifications\QueuedVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\DatabaseNotificationCollection;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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
     * SC-1(c) — closing an account must not destroy a medical record.
     *
     * `ProfileController::destroy()` used to call a hard `delete()` on this
     * model, and six ON DELETE CASCADE keys carried that straight into
     * `patient_allergies`, `patient_diagnoses` and `patient_documents`. The
     * foreign keys are fixed too (see the retention-safe migration) — this is
     * the other half: the row is now retired rather than removed.
     *
     * The SoftDeletes global scope is also what blocks sign-in for a closed
     * account, because Fortify resolves the user with a plain
     * `User::where('email', …)->first()`. Do not add a second "is closed"
     * check anywhere; one gate is testable, two drift apart.
     */
    use SoftDeletes;

    /**
     * Audited fields — deliberately NOT `password`, `two_factor_secret`,
     * `two_factor_recovery_codes` or `remember_token`. See
     * App\Concerns\RecordsActivity for why naming these explicitly (rather than
     * logFillable()) is the security boundary.
     *
     * `must_change_password` (GV-9) is deliberately NOT here, and the reason is
     * worth recording because the instinct is to add it.
     *
     * `ActivityLogTest > it never records a password hash` asserts that no
     * serialised property anywhere contains the substring `password`. That is a
     * blunt check and it is blunt on purpose — it catches a credential reaching
     * the log no matter which key carries it, including keys nobody has thought
     * of yet. A column merely NAMED `must_change_password` trips it.
     *
     * The choice was between loosening that guard to allow one known-safe field
     * name, and dropping a low-value audit entry. The audit value really is low:
     * account creation is already logged, and the password change that clears
     * the flag already moves `updated_at`. Weakening a security guard test to
     * buy that is a bad trade — so the flag is not audited.
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
        // GV-9. Mass-assignable because the only writers are
        // StaffAccountService (provisioning) and SecurityController (clearing
        // it), both of which pass it explicitly — it is never populated from
        // request input.
        'must_change_password',
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
            'must_change_password' => 'boolean',
        ];
    }

    // ── Outbound mail ──────────────────────────────────────────────────────────

    /**
     * Send the verification mail on the queue rather than in the request.
     *
     * Fortify sends this from inside the registration request, so a slow mail
     * host used to hold the signup open for the whole SMTP timeout — about 25
     * seconds against the configured Gmail host before the failover chain fell
     * through to the log driver. See [QueuedVerifyEmail].
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new QueuedVerifyEmail);
    }

    /**
     * Same for the reset link, for the same reason. See [QueuedResetPassword].
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new QueuedResetPassword($token));
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

    /**
     * This account's credentialing file — PRC, PTR, specialty board.
     *
     * Only clinical roles (doctor, nurse) have one; it is legitimately absent
     * on an admin, HR or patient account, so every caller must null-check.
     * CredentialingService is the only writer.
     */
    public function credential(): HasOne
    {
        return $this->hasOne(StaffCredential::class);
    }

    /**
     * Whether this account is credentialed to see patients right now.
     *
     * False when no file exists at all: a clinical account with no credentials
     * on record has not been cleared, and defaulting that to "yes" is the one
     * mistake this whole module exists to prevent.
     */
    public function isCredentialed(): bool
    {
        return $this->credential?->permitsPractice() === true;
    }

    /**
     * Notification switches for this account.
     *
     * May legitimately be absent — NotificationPreference::allows() treats a
     * missing row as "everything on", so no backfill migration is needed and
     * the row is written the first time the settings page is opened or saved.
     */
    public function notificationPreference(): HasOne
    {
        return $this->hasOne(NotificationPreference::class);
    }

    public function isDoctor(): bool
    {
        return $this->hasRole('doctor');
    }

    /**
     * Roles whose accounts are attached to clinical records that outlive the
     * person's employment.
     *
     * @var array<int, string>
     */
    public const CLINICAL_ROLES = ['doctor', 'nurse', 'hr', 'admin'];

    /**
     * How much authority over *other accounts* each role carries.
     *
     * GV-1 in WELLCARE-GOVERNANCE-PLAN.md. This is not a general seniority
     * ranking and it says nothing about clinical standing — a consultant
     * physician and a ward nurse sit on the same rung here, because neither can
     * touch anybody's login. The only question it answers is "may this account
     * reach into that one".
     *
     * `dpo` is deliberately a PEER of `admin` rather than below it. The Data
     * Protection Officer's whole value is that their view of administrator
     * activity is independent of the administrators it describes (NIST
     * AU-9(4)); an admin who could edit the DPO's account could take it over and
     * the independence would be decorative. Only the owner manages either.
     *
     * A role absent from this map scores 0, which is the safe direction: an
     * unknown role gets no authority rather than inheriting somebody else's.
     *
     * @var array<string, int>
     */
    public const ROLE_TIERS = [
        'owner' => 3,
        'admin' => 2,
        'dpo' => 2,
        'hr' => 1,
        'doctor' => 1,
        'nurse' => 1,
        'user' => 0,
    ];

    /**
     * This account's authority tier — the highest of its roles.
     *
     * `max` rather than "the first role", even though StaffAccountService
     * syncRoles() to exactly one: an account that somehow holds two roles must
     * be treated as the more powerful of them, or the multi-role case becomes a
     * way to be quietly under-guarded.
     */
    public function privilegeTier(): int
    {
        $tiers = $this->getRoleNames()
            ->map(fn (string $role): int => self::ROLE_TIERS[$role] ?? 0);

        return $tiers->isEmpty() ? 0 : (int) $tiers->max();
    }

    /**
     * May this account mutate the *credentials* of that one?
     *
     * The rule is strict inequality: an administrator reaches accounts below
     * their tier and never sideways. Peer-to-peer credential access is the
     * whole of GV-1 — an admin who can set another admin's password owns that
     * admin's identity, and an admin who can set a doctor's password owns every
     * chart in the clinic.
     *
     * Self is excluded on purpose. Changing your own password is a real and
     * necessary thing, and it happens at /settings/security behind password
     * confirmation — not through the account-management screen, where the
     * audit trail says "an administrator edited a user" rather than "this
     * person changed their own credentials".
     */
    public function mayAdminister(User $target): bool
    {
        if ($this->is($target)) {
            return false;
        }

        return $this->privilegeTier() > $target->privilegeTier();
    }

    /**
     * May this account grant that role to somebody?
     *
     * You cannot hand out authority you do not have. This is what stops an
     * administrator minting a second administrator (GV-6) — `admin` is tier 2,
     * so granting it requires tier 3, which only the owner holds.
     */
    public function mayGrantRole(string $role): bool
    {
        return $this->privilegeTier() > (self::ROLE_TIERS[$role] ?? 0);
    }

    /**
     * May this account holder delete their own account?
     *
     * A doctor account IS `appointments.doctor_id`; deleting it cascades
     * through consultation sessions, availability blocks and validated lab
     * results, and there is no version of that which is correct. Staff
     * offboarding is an administrator's deactivation
     * (AdminUserController::deactivate), which ends access while preserving
     * the record.
     *
     * Lives on the model rather than in a controller because two surfaces ask
     * the question — ProfileController::destroy() enforces it and
     * PrivacyController::show() renders from it — and two copies of a rule
     * about irreversible deletion is one copy too many.
     */
    public function canCloseOwnAccount(): bool
    {
        return ! $this->hasRole(self::CLINICAL_ROLES);
    }

    /**
     * Close this account: destroy the credentials, retire the row, keep the
     * medical record.
     *
     * SC-1(c) in WELLCARE-COMPLIANCE-PLAN.md. This replaces a hard
     * `$user->delete()` that cascaded into `patient_allergies`,
     * `patient_diagnoses` and `patient_documents` and destroyed the person's
     * clinical history — a self-service button that defeated the record
     * retention obligation.
     *
     * ## What is erased
     *
     * Everything that makes the account an account: the email (rewritten to a
     * non-routable placeholder on the reserved `.invalid` TLD), the password
     * hash, both two-factor secrets, the remember token. Sessions on every
     * device are dropped, not just this browser's.
     *
     * The email is REWRITTEN rather than simply hidden because `users.email`
     * carries a UNIQUE index, and a unique index does not respect
     * `deleted_at` — a closed account would otherwise squat on the address and
     * refuse the same person a new one forever.
     *
     * ## What is deliberately retained, and why this is not full erasure
     *
     * `patients` and everything hanging off it — allergies, diagnoses,
     * documents, consultations, lab results — stay whole and stay attached to
     * their `patient_id`. So do `patient_profiles` and `patient_medical`.
     *
     * That is the point rather than an oversight: a medical record carries a
     * retention obligation that outlives the patient's wish to close a login,
     * and those tables hold the record, including the identity that makes it a
     * record of a specific person. Erasing them would destroy clinical history
     * that other people's care may depend on — a shared allergy note on a
     * child's chart does not stop mattering because a parent closed an account.
     *
     * Two open questions govern how far this can go, and both are flagged in
     * §5 of the compliance plan rather than decided here: ND-6 (the retention
     * period, after which a genuine purge becomes permissible) and ND-9
     * (whether any regime demanding unconditional erasure applies at all).
     * Until those are answered, this method retires an account; it does not
     * erase a person.
     */
    public function closeAccount(): void
    {
        DB::transaction(function (): void {
            $this->forceFill([
                // `.invalid` is reserved by RFC 2606 and can never resolve, so
                // this address cannot be mailed even by accident.
                'email' => "closed-account-{$this->id}@wellcare.invalid",
                'password' => Hash::make(Str::random(64)),
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'remember_token' => null,
                'is_active' => false,
            ])->save();

            // Every other browser this account is signed in on. Without this
            // the row is soft-deleted but a session already in flight keeps
            // resolving until it expires on its own.
            DB::connection(config('session.connection'))
                ->table(config('session.table', 'sessions'))
                ->where('user_id', $this->id)
                ->delete();

            $this->delete();
        });
    }

    /** Consent given by this account — its own, and on behalf of its patients. */
    public function consents(): HasMany
    {
        return $this->hasMany(Consent::class, 'granted_by_user_id');
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
