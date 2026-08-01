<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * AvailabilityBlock
 * ──────────────────────────────────────────────────────────────────────────────
 * Defines when a doctor (= a User with the "doctor" Spatie role) is available.
 *
 * `doctor_id` is a FK → users.id  (NOT a separate Doctor model).
 * Use the `doctor()` relation to eager-load the User, then access
 * `->doctor->doctorProfile` for specialty/display-name data.
 *
 * DAY-OF-WEEK CONVENTION
 * ──────────────────────────────────────────────────────────────────────────────
 * `day_of_week` is stored in the MySQL DAYOFWEEK convention: 1 = Sun … 7 = Sat.
 * This differs from BOTH Carbon (0 = Sun … 6 = Sat) and ISO-8601 (1 = Mon …
 * 7 = Sun), which is exactly how the two conventions got mixed up before.
 *
 * Never write a raw integer to this column and never hand-roll the offset —
 * go through storedDayFor() when reading and isoToStoredDay() when seeding.
 */
final class AvailabilityBlock extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'doctor_id',            // FK → users.id
        'day_of_week',          // 1 = Sun … 7 = Sat, null = specific-date only
        'specific_date',        // date, null = recurring weekly
        'start_time',
        'end_time',
        'slot_duration_minutes',
        'is_available',         // false = Out of Office block
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'slot_duration_minutes' => 'integer',
        'is_available' => 'boolean',
        'specific_date' => 'date',
    ];

    // ── Day-of-week conversion ────────────────────────────────────────────────

    /**
     * The stored `day_of_week` value matching a given date.
     * Carbon is 0 = Sun … 6 = Sat; this column is 1 = Sun … 7 = Sat.
     */
    public static function storedDayFor(Carbon $date): int
    {
        return $date->dayOfWeek + 1;
    }

    /**
     * Convert an ISO-8601 weekday (1 = Mon … 7 = Sun) to the stored convention.
     * Seed data is written in ISO because "1 = Monday" is the natural reading.
     */
    public static function isoToStoredDay(int $isoDay): int
    {
        return $isoDay % 7 + 1;
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    /**
     * The doctor who owns this block.
     * Resolves to the User account — there is no separate Doctor model.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
