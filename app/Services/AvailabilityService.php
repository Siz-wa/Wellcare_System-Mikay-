<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use Carbon\Carbon;
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

    public function __construct(private BookingService $booking) {}

    /**
     * The doctor's recurring weekly hours, keyed by ISO weekday (1 = Mon … 7 = Sun).
     *
     * Reading is done in ISO because that is what the UI renders; the column
     * itself stores the MySQL DAYOFWEEK convention (1 = Sun … 7 = Sat).
     *
     * @return Collection<int, AvailabilityBlock>
     */
    public function weeklyScheduleFor(int $doctorId): Collection
    {
        return AvailabilityBlock::where('doctor_id', $doctorId)
            ->whereNotNull('day_of_week')
            ->whereNull('specific_date')
            ->orderBy('start_time')
            ->get()
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
     * Replace the doctor's whole weekly schedule in one write.
     *
     * Replacing rather than patching keeps the stored set exactly equal to what
     * the doctor sees — a day they cleared must actually disappear, not linger
     * as an orphaned row that keeps generating slots.
     *
     * @param  array<int, array{iso_day: int, start_time: string, end_time: string, slot_duration_minutes: int}>  $days
     */
    public function replaceWeeklySchedule(int $doctorId, array $days): void
    {
        DB::transaction(function () use ($doctorId, $days) {
            // Soft delete, so the previous schedule stays auditable.
            AvailabilityBlock::where('doctor_id', $doctorId)
                ->whereNotNull('day_of_week')
                ->whereNull('specific_date')
                ->delete();

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
                ]);
            }
        });

        $this->booking->bustDoctorSlotCache($doctorId);
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
        DoctorProfile::where('user_id', $doctorId)
            ->update(['max_patients_per_day' => $cap]);

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
     * Mirrors BookingService::invalidateOutOfOffice(), which does the same for
     * the admin "mark out of office" action.
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
            ]);

            // Anything not yet seen is void; completed visits stay untouched.
            Appointment::where('doctor_id', $doctorId)
                ->where('appointment_date', $date)
                ->whereIn('status', ['pending_hmo_approval', 'requested', 'confirmed'])
                ->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => $reason ?: 'Doctor unavailable — Out of Office',
                    'cancelled_at' => now(),
                ]);

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
