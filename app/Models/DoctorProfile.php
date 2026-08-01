<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

/**
 * DoctorProfile
 * ──────────────────────────────────────────────────────────────────────────────
 * Extended profile for users who hold the "doctor" Spatie role.
 * Keeps doctor-specific columns out of the core `users` table.
 *
 * Always query via the `active()` scope unless you intentionally need
 * inactive doctors (e.g. admin panel).
 *
 * @property int         $id
 * @property int         $user_id
 * @property string      $display_name
 * @property string      $specialty
 * @property string|null $specialization
 * @property string|null $initials
 * @property string|null $color
 * @property bool        $is_active
 * @property int         $max_patients_per_day
 * @property \App\Models\User $user
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
        'is_active',
        'max_patients_per_day',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'max_patients_per_day' => 'integer',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
}