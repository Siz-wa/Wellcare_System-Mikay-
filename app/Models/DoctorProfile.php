<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * DoctorProfile
 * ──────────────────────────────────────────────────────────────────────────────
 * Extended profile for users who hold the "doctor" Spatie role.
 * Keeps doctor-specific columns out of the core `users` table.
 *
 * Always query via the `active()` scope unless you intentionally need
 * inactive doctors (e.g. admin panel).
 *
 * @property int $id
 * @property int $user_id
 * @property string $display_name
 * @property string $specialty
 * @property string|null $specialization
 * @property string|null $initials
 * @property string|null $color
 * @property string|null $photo_path
 * @property Carbon|null $photo_consent_at
 * @property string|null $bio
 * @property string|null $languages
 * @property int|null $practising_since
 * @property bool $is_active
 * @property int $max_patients_per_day
 * @property User $user
 */
class DoctorProfile extends Model
{
    /** Clinic policy default when a doctor has no explicit cap. */
    public const DEFAULT_DAILY_PATIENT_CAP = 5;

    protected $fillable = [
        'user_id',
        'display_name',
        'specialty',
        'specialization',
        'initials',
        'color',
        'photo_path',
        'photo_consent_at',
        'bio',
        'languages',
        'practising_since',
        'is_active',
        'max_patients_per_day',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'photo_consent_at' => 'datetime',
        'max_patients_per_day' => 'integer',
        'practising_since' => 'integer',
    ];

    /** Longest professional statement the profile form accepts. */
    public const BIO_MAX_LENGTH = 600;

    /**
     * Bind {doctor} route parameters on `user_id`, not the primary key.
     *
     * `doctor_id` means a User everywhere else in this application —
     * appointments, availability blocks, consultation sessions — and a public
     * profile URL that used `doctor_profiles.id` would be the one place a
     * doctor had a second, different number. Nothing outside this table
     * references that key.
     */
    public function getRouteKeyName(): string
    {
        return 'user_id';
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The credentialing file for the same person.
     *
     * Joined on `user_id` on both sides, because `staff_credentials` is keyed
     * by account like everything else clinical — `doctor_profiles.id` is used
     * by nothing outside this table.
     *
     * Written only by CredentialingService. Reading it here is what lets a
     * doctor see their own PRC standing and a patient see the two credentials
     * they can independently verify; see publishedCredential() for the filter
     * that decides which of those a public page may render.
     */
    public function credential(): HasOne
    {
        return $this->hasOne(StaffCredential::class, 'user_id', 'user_id');
    }

    /**
     * Availability blocks are keyed by users.id, not doctor_profiles.id —
     * `doctor_id` throughout the booking system means a User.
     */
    public function availabilityBlocks(): HasMany
    {
        return $this->hasMany(AvailabilityBlock::class, 'doctor_id', 'user_id');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Only doctors who are currently accepting appointments */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Filter by one or more specialty slugs.
     * Matches the SERVICE_TO_SPECIALTIES mapping from the front-end.
     *
     * @param  string|string[]  $specialties
     */
    public function scopeForSpecialties(Builder $query, string|array $specialties): Builder
    {
        return $query->whereIn('specialty', (array) $specialties);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** The user_id is the doctor_id used everywhere in the booking system */
    public function getDoctorIdAttribute(): int
    {
        return $this->user_id;
    }

    /**
     * The credentialing file, but only when it currently permits practice.
     *
     * Every public surface reads THIS rather than `credential` directly. A
     * pending, rejected, suspended or lapsed file must not put a PRC number in
     * front of a patient: printing one next to a doctor's name is an assertion
     * that the clinic has checked it and that it is good today, and for any
     * status other than verified-and-unlapsed that assertion is false.
     *
     * `hasLapsed()` is re-read rather than trusting the column, because
     * `credentials:sweep` runs nightly — a licence that expired this morning is
     * still marked `verified` until it next runs.
     */
    public function publishedCredential(): ?StaffCredential
    {
        $credential = $this->credential;

        return $credential?->permitsPractice() === true ? $credential : null;
    }

    /**
     * A short token that changes whenever the photograph does.
     *
     * Appended to every photo URL as `?v=`. Without it the URL is fixed for the
     * life of the account, so the long `Cache-Control` on the response would
     * keep serving a replaced photograph out of the browser cache for a day —
     * the doctor uploads a new one, sees the old one, and re-uploads.
     *
     * Derived from the stored path, which already carries 20 random bytes per
     * upload, so a new file is a new URL. Hashed rather than used directly
     * because the path is internal and does not belong in a public link.
     */
    public function photoVersion(): string
    {
        return substr(sha1((string) $this->photo_path), 0, 8);
    }

    /**
     * Whether a photograph of this doctor may be shown to patients.
     *
     * Three conditions, all required, and the middle one is the point: a file
     * on disk is not permission to publish a person's likeness. `is_active`
     * carries the credentialing gate (CredentialingService is its only writer),
     * so an unpublished doctor's photograph disappears with the rest of their
     * entry rather than lingering as the one fragment that outlived it.
     */
    public function hasPublishablePhoto(): bool
    {
        return $this->is_active
            && filled($this->photo_path)
            && $this->photo_consent_at !== null;
    }
}
