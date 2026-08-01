<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityBlock;
use App\Services\AvailabilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lets a doctor set the hours they are bookable.
 *
 * Without this a doctor created in production has no availability blocks at
 * all, so BookingService generates zero slots for them forever — the only
 * writer was the seeder.
 */
class AvailabilityController extends Controller
{
    public function __construct(private AvailabilityService $availability) {}

    public function index(): Response
    {
        $doctorId = Auth::id();

        return Inertia::render('doctor/availability/availability', [
            'weekly' => $this->availability->weeklyScheduleFor($doctorId)
                ->map(fn (AvailabilityBlock $block, int $isoDay) => [
                    'isoDay' => $isoDay,
                    'startTime' => substr((string) $block->start_time, 0, 5),
                    'endTime' => substr((string) $block->end_time, 0, 5),
                    'slotDuration' => $block->slot_duration_minutes,
                ])->values(),

            'timeOff' => $this->availability->dateOverridesFor($doctorId)
                ->map(fn (AvailabilityBlock $block) => [
                    'id' => $block->id,
                    'date' => $block->specific_date->toDateString(),
                    'label' => $block->specific_date->format('D, d M Y'),
                    'isAvailable' => $block->is_available,
                ])->values(),

            'dailyCap' => $this->availability->dailyPatientCapFor($doctorId),
        ]);
    }

    public function updateWeekly(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // Optional: updating hours alone must not force a caller to restate
            // the cap, and an absent value means "leave it as it is".
            'daily_cap' => [
                'sometimes',
                'integer',
                'between:1,'.AvailabilityService::MAX_DAILY_PATIENTS,
            ],
            'days' => ['present', 'array', 'max:7'],
            'days.*.iso_day' => ['required', 'integer', 'between:1,7'],
            'days.*.start_time' => ['required', 'date_format:H:i'],
            'days.*.end_time' => ['required', 'date_format:H:i', 'after:days.*.start_time'],
            'days.*.slot_duration_minutes' => [
                'required',
                'integer',
                'between:'.AvailabilityService::MIN_SLOT_MINUTES.','.AvailabilityService::MAX_SLOT_MINUTES,
            ],
        ], [
            'daily_cap.between' => 'You can see between 1 and '
                .AvailabilityService::MAX_DAILY_PATIENTS.' patients per day.',
            'days.*.end_time.after' => 'The end time must be later than the start time.',
            'days.*.slot_duration_minutes.between' => 'Slot length must be between '
                .AvailabilityService::MIN_SLOT_MINUTES.' and '
                .AvailabilityService::MAX_SLOT_MINUTES.' minutes.',
        ]);

        // One row per weekday: two blocks on the same day would generate
        // overlapping slots that the unique-slot index then rejects at booking.
        $isoDays = array_column($validated['days'], 'iso_day');
        if (count($isoDays) !== count(array_unique($isoDays))) {
            return back()->withErrors(['days' => 'Each weekday can only be listed once.']);
        }

        $this->availability->replaceWeeklySchedule(Auth::id(), $validated['days']);

        if (isset($validated['daily_cap'])) {
            $this->availability->setDailyPatientCap(Auth::id(), $validated['daily_cap']);
        }

        return back()->with('success', 'Your weekly schedule has been updated.');
    }

    public function storeTimeOff(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:today'],
            'reason' => ['nullable', 'string', 'max:255'],
        ], [
            'date.after_or_equal' => 'You can only block out today or a future date.',
        ]);

        $this->availability->addTimeOff(
            Auth::id(),
            $validated['date'],
            $validated['reason'] ?? null,
        );

        return back()->with('success', 'Time off saved. Any pending appointments that day were cancelled.');
    }

    public function destroy(AvailabilityBlock $availabilityBlock): RedirectResponse
    {
        abort_if($availabilityBlock->doctor_id !== Auth::id(), 403);

        $this->availability->removeBlock($availabilityBlock);

        return back()->with('success', 'Entry removed from your schedule.');
    }
}
