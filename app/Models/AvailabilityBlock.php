<?php

namespace App\Models;

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
 */
final class AvailabilityBlock extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'doctor_id',            // FK → users.id
        'day_of_week',          // 0 = Sun … 6 = Sat, null = specific-date only
        'specific_date',        // date, null = recurring weekly
        'start_time',
        'end_time',
        'slot_duration_minutes',
        'is_available',         // false = Out of Office block
    ];

    protected $casts = [
        'day_of_week'           => 'integer',
        'slot_duration_minutes' => 'integer',
        'is_available'          => 'boolean',
        'specific_date'         => 'date',
    ];

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