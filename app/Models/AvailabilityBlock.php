<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
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

        // ── Roster approval (Phase 9) ────────────────────────────────────────
        'approval_status',      // draft | pending | published
        'submitted_at',
        'approved_by',          // FK → users.id, the administrator who published
        'approved_at',
        'review_remarks',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'slot_duration_minutes' => 'integer',
        'is_available' => 'boolean',
        'specific_date' => 'date',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    // ── Roster approval states ────────────────────────────────────────────────

    /** Being edited by the doctor; never generates slots. */
    public const APPROVAL_DRAFT = 'draft';

    /** Submitted, awaiting an administrator. Never generates slots. */
    public const APPROVAL_PENDING = 'pending';

    /** Agreed by the clinic. The ONLY state that generates bookable slots. */
    public const APPROVAL_PUBLISHED = 'published';

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

    /** The administrator who published this block. */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /**
     * Blocks the clinic has agreed to.
     *
     * ⚠️ EVERY slot-generating read must go through this scope. BookingService
     * reads availability in two separate places — getAvailabilityBlocksForDate()
     * and the day-of-week lookup used by slot generation — and omitting the
     * scope in either one silently publishes hours no administrator approved.
     * That is a leak with no visible symptom, so it is asserted directly in
     * RosterApprovalTest rather than left to review.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('approval_status', self::APPROVAL_PUBLISHED);
    }

    /** Awaiting an administrator's decision — the roster queue. */
    public function scopeAwaitingApproval(Builder $query): Builder
    {
        return $query->where('approval_status', self::APPROVAL_PENDING);
    }
}
