<?php

namespace App\Services;

use App\Enums\Specialty;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The write side of doctor availability.
 *
 * BookingService owns reading and slot generation; this owns the schedule a
 * doctor sets for themselves. Until this existed the only way to create a
 * bookable block was the seeder, so a doctor added in production had zero
 * slots forever.
 *
 * ⚠️ Every method that changes availability must bust the doctor's slot cache.
 * A weekly block affects many dates, so that means the whole booking window —
 * see BookingService::bustDoctorSlotCache().
 */
class AvailabilityService
{
    public const MIN_SLOT_MINUTES = 10;

    public const MAX_SLOT_MINUTES = 120;

    /**
     * Upper bound on the daily patient cap. The clinic's documented policy is
     * five; this only stops a typo from turning the limit into a non-limit.
     */
    public const MAX_DAILY_PATIENTS = 50;

    public function __construct(
        private BookingService $booking,
        private AppointmentCancellationService $cancellations,
    ) {}

    /**
     * The doctor's recurring weekly hours, keyed by ISO weekday (1 = Mon … 7 = Sun).
     *
     * Shows the doctor's open proposal (pending or sent back) when there is
     * one, because that is what they are editing; otherwise the published,
     * bookable schedule.
     *
     * Reading is done in ISO because that is what the UI renders; the column
     * itself stores the MySQL DAYOFWEEK convention (1 = Sun … 7 = Sat).
     *
     * @return Collection<int, AvailabilityBlock>
     */
    public function weeklyScheduleFor(int $doctorId): Collection
    {
        $blocks = $this->weeklyBlocks($doctorId)->get();

        $proposal = $blocks->where('approval_status', '!=', AvailabilityBlock::APPROVAL_PUBLISHED);
        $shown = $proposal->isNotEmpty() ? $proposal : $blocks;

        return $shown
            ->sortBy('start_time')
            ->keyBy(fn (AvailabilityBlock $block) => $this->storedDayToIso($block->day_of_week));
    }

    /**
     * Upcoming specific-date entries: time off and one-off custom hours.
     *
     * @return Collection<int, AvailabilityBlock>
     */
    public function dateOverridesFor(int $doctorId): Collection
    {
        return AvailabilityBlock::where('doctor_id', $doctorId)
            ->whereNotNull('specific_date')
            ->whereDate('specific_date', '>=', Carbon::today())
            ->orderBy('specific_date')
            ->get();
    }

    /**
     * Propose a new weekly schedule.
     *
     * Phase 9: the result is a **proposal**, not a live schedule. Blocks are
     * written as `pending` and generate no slots until an administrator
     * publishes them. publishSchedule() is the other half.
     *
     * The published schedule is left untouched and stays bookable while the
     * proposal waits. Replacing it here took a doctor off the booking system
     * the moment they pressed Save, even when they changed nothing. A proposal
     * identical to what is already published withdraws any open proposal and
     * queues nothing.
     *
     * @param  array<int, array{iso_day: int, start_time: string, end_time: string, slot_duration_minutes: int}>  $days
     * @return bool whether a proposal was queued for approval
     */
    public function replaceWeeklySchedule(int $doctorId, array $days): bool
    {
        $published = $this->weeklyBlocks($doctorId)->published()->get();
        $unchanged = $this->signature($published->map(fn (AvailabilityBlock $b) => [
            'iso_day' => $this->storedDayToIso($b->day_of_week),
            'start_time' => $b->start_time,
            'end_time' => $b->end_time,
            'slot_duration_minutes' => $b->slot_duration_minutes,
        ])->all()) === $this->signature($days);

        DB::transaction(function () use ($doctorId, $days, $unchanged) {
            // Only the previous proposal is replaced. Soft delete, so it stays
            // auditable.
            $this->weeklyBlocks($doctorId)
                ->where('approval_status', '!=', AvailabilityBlock::APPROVAL_PUBLISHED)
                ->delete();

            if ($unchanged) {
                return;
            }

            foreach ($days as $day) {
                AvailabilityBlock::create([
                    'doctor_id' => $doctorId,
                    // Never write a raw integer here — the column is MySQL
                    // DAYOFWEEK (1 = Sun), not ISO (1 = Mon).
                    'day_of_week' => AvailabilityBlock::isoToStoredDay($day['iso_day']),
                    'specific_date' => null,
                    'start_time' => $day['start_time'],
                    'end_time' => $day['end_time'],
                    'slot_duration_minutes' => $day['slot_duration_minutes'],
                    'is_available' => true,
                    'approval_status' => AvailabilityBlock::APPROVAL_PENDING,
                    'submitted_at' => now(),
                ]);
            }
        });

        return ! $unchanged;
    }

    /**
     * Publish a doctor's pending weekly schedule — the administrator's half of
     * the roster agreement. The proposal replaces the published schedule in
     * one transaction, so the doctor is never without bookable hours.
     *
     * @return int the number of blocks published
     */
    public function publishSchedule(int $doctorId, User $actor): int
    {
        $published = DB::transaction(function () use ($doctorId, $actor) {
            if (! AvailabilityBlock::awaitingApproval()->where('doctor_id', $doctorId)->exists()) {
                return 0;
            }

            $this->weeklyBlocks($doctorId)->published()->delete();

            return AvailabilityBlock::awaitingApproval()
                ->where('doctor_id', $doctorId)
                ->update([
                    'approval_status' => AvailabilityBlock::APPROVAL_PUBLISHED,
                    'approved_by' => $actor->id,
                    'approved_at' => now(),
                    'review_remarks' => null,
                ]);
        });

        // These hours are bookable from this instant; a stale slot list would
        // hide them for up to 60 seconds after the doctor was told they are live.
        $this->booking->bustDoctorSlotCache($doctorId);

        return $published;
    }

    /**
     * The doctor's recurring (weekday) blocks, in any approval state.
     *
     * @return Builder<AvailabilityBlock>
     */
    private function weeklyBlocks(int $doctorId): Builder
    {
        return AvailabilityBlock::where('doctor_id', $doctorId)
            ->whereNotNull('day_of_week')
            ->whereNull('specific_date');
    }

    /**
     * A comparable fingerprint of a weekly schedule, ignoring order and the
     * seconds MySQL appends to TIME columns.
     *
     * @param  array<int, array{iso_day: int, start_time: string, end_time: string, slot_duration_minutes: int}>  $days
     */
    private function signature(array $days): string
    {
        return collect($days)
            ->map(fn (array $d) => sprintf(
                '%d|%s|%s|%d',
                $d['iso_day'],
                substr((string) $d['start_time'], 0, 5),
                substr((string) $d['end_time'], 0, 5),
                $d['slot_duration_minutes'],
            ))
            ->sort()
            ->implode(',');
    }

    /**
     * Send a proposed schedule back to the doctor with a reason.
     *
     * The blocks are kept rather than deleted, in `draft`, so the doctor edits
     * what they proposed instead of rebuilding it from an empty page.
     *
     * @return int the number of blocks returned
     */
    public function rejectSchedule(int $doctorId, User $actor, string $remarks): int
    {
        return AvailabilityBlock::awaitingApproval()
            ->where('doctor_id', $doctorId)
            ->update([
                'approval_status' => AvailabilityBlock::APPROVAL_DRAFT,
                'approved_by' => $actor->id,
                'approved_at' => now(),
                'review_remarks' => $remarks,
            ]);
    }

    /**
     * Set how many patients this doctor sees per day.
     *
     * Busts the slot cache because getAvailableSlots() reports a day as full
     * once the cap is reached — a lowered cap must close days immediately, not
     * 60 seconds from now.
     */
    public function setDailyPatientCap(int $doctorId, int $cap): void
    {
        // firstOrNew, not update(): update() on a missing doctor_profiles row
        // matches nothing and returns 0, so the cap was silently discarded for
        // any doctor whose profile had not been created. A bare updateOrCreate
        // is not the fix either — `display_name` and `specialty` are NOT NULL,
        // so it would trade the silent no-op for a SQL error. Phase 9 makes the
        // row mandatory at account creation; this covers accounts predating it.
        $profile = DoctorProfile::firstOrNew(['user_id' => $doctorId]);

        if (! $profile->exists) {
            $doctor = User::find($doctorId);
            $profile->fill([
                'display_name' => $doctor?->name ?: 'Doctor',
                'specialty' => Specialty::General->value,
                // Not credentialed by anyone, so not published to patients.
                'is_active' => false,
            ]);
        }

        $profile->max_patients_per_day = $cap;
        $profile->save();

        $this->booking->bustDoctorSlotCache($doctorId);
    }

    /** The doctor's current daily patient cap. */
    public function dailyPatientCapFor(int $doctorId): int
    {
        return $this->booking->dailyCapFor($doctorId);
    }

    /**
     * Black out a single date and cancel anything already booked on it.
     *
     * Used by both the doctor's own time-off and the administrator's "out of
     * office" action, so the two can no longer cancel different sets of
     * appointments. Each cancelled patient is notified individually and any
     * fee already paid is put in front of the cashier.
     */
    public function addTimeOff(int $doctorId, string $date, ?string $reason = null): AvailabilityBlock
    {
        $block = DB::transaction(function () use ($doctorId, $date, $reason) {
            $block = AvailabilityBlock::create([
                'doctor_id' => $doctorId,
                'day_of_week' => null,
                'specific_date' => $date,
                'start_time' => '00:00:00',
                'end_time' => '23:59:00',
                'is_available' => false,
                // Time off is PUBLISHED IMMEDIATELY and never queued for
                // approval. Two reasons, and both matter:
                //  1. Safety. A doctor who cannot attend must be able to close
                //     the day now; making a cancellation wait on an
                //     administrator is the wrong failure mode.
                //  2. Correctness. scopePublished() filters this row out if it
                //     is not published, so an unapproved blackout would leave
                //     the day quietly open for booking — the opposite of what
                //     the doctor just asked for.
                'approval_status' => AvailabilityBlock::APPROVAL_PUBLISHED,
                'approved_at' => now(),
            ]);

            // Anything not yet seen is void; completed visits stay untouched.
            $this->cancellations->cancelDay(
                $doctorId,
                $date,
                $reason ?: 'Doctor unavailable — Out of Office',
            );

            return $block;
        });

        $this->booking->bustDoctorSlotCache($doctorId);

        return $block;
    }

    /**
     * Remove a date override, putting the day back on the weekly schedule.
     */
    public function removeBlock(AvailabilityBlock $block): void
    {
        $doctorId = $block->doctor_id;

        $block->delete();

        $this->booking->bustDoctorSlotCache($doctorId);
    }

    /** MySQL DAYOFWEEK (1 = Sun … 7 = Sat) → ISO-8601 (1 = Mon … 7 = Sun). */
    private function storedDayToIso(int $storedDay): int
    {
        return ($storedDay + 5) % 7 + 1;
    }
}
