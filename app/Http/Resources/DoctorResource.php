<?php

namespace App\Http\Resources;

use App\Models\DoctorProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * DoctorResource
 * ──────────────────────────────────────────────────────────────────────────────
 * Serialises a DoctorProfile (with its user relation eager-loaded) into the
 * shape the React front-end expects.
 *
 * The `id` field is the USER id (= doctor_id in the booking system).
 * The front-end sends this back as `doctor_id` when submitting the form.
 *
 * Usage:
 *   DoctorResource::collection(
 *       DoctorProfile::active()->with('user')->get()
 *   )
 *
 * @mixin DoctorProfile
 */
class DoctorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // user_id IS the doctor_id used in appointments.doctor_id FK
            'id' => $this->user_id,
            'name' => $this->display_name,
            'specialty' => $this->specialty,
            'specialization' => $this->specialization ?? $this->specialty,
            'initials' => $this->initials ?? $this->deriveInitials(),
            'color' => $this->color ?? '#0056b3',
            'is_active' => $this->is_active,
            // Schedules live in availability_blocks, not on the profile. Only
            // included when the caller eager-loads them — the booking picker
            // doesn't need them, the public doctors page does.
            'schedules' => $this->whenLoaded('availabilityBlocks', fn () => $this->formatSchedules()),
        ];
    }

    /**
     * Collapse recurring availability blocks into display rows, grouping days
     * that share the same hours: "Mon / Wed / Fri" + "9AM – 5PM".
     *
     * Specific-date blocks (day_of_week = null) are skipped — those are one-off
     * overrides such as Out of Office, not part of a weekly schedule.
     */
    private function formatSchedules(): array
    {
        $dayNames = [1 => 'Sun', 2 => 'Mon', 3 => 'Tue', 4 => 'Wed', 5 => 'Thu', 6 => 'Fri', 7 => 'Sat'];

        return $this->availabilityBlocks
            ->where('is_available', true)
            ->whereNotNull('day_of_week')
            ->groupBy(fn ($block) => $block->start_time.'-'.$block->end_time)
            ->map(function ($blocks) use ($dayNames) {
                $sorted = $blocks->sortBy('day_of_week');
                $first = $sorted->first();

                return [
                    'days' => $sorted
                        ->pluck('day_of_week')
                        ->map(fn ($d) => $dayNames[$d] ?? '')
                        ->filter()
                        ->implode(' / '),
                    'hours' => Carbon::parse($first->start_time)->format('gA')
                             .' – '
                             .Carbon::parse($first->end_time)->format('gA'),
                ];
            })
            ->values()
            ->all();
    }

    private function deriveInitials(): string
    {
        $parts = explode(' ', str_replace('Dr. ', '', $this->display_name));
        $first = $parts[0][0] ?? '';
        $last = end($parts)[0] ?? '';

        return strtoupper($first.$last);
    }
}
