<?php

namespace App\Http\Resources;

use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\StaffCredential;
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
 *       DoctorProfile::active()->with(['user', 'credential'])->get()
 *   )
 *
 * ── This is the only definition of "what a patient may see about a doctor" ───
 *
 * The public directory, the individual profile page and the booking picker all
 * render from here, deliberately: three presenters would be three chances for
 * one surface to publish something the others correctly withhold.
 *
 * What that means in practice is `publishedCredentials()` below. Two fields
 * from `staff_credentials` reach a patient — the PRC registration number and
 * the specialty board standing — and only while the file permits practice. The
 * PTR number, the PhilHealth accreditation number and the PDEA/DDB S2 licence
 * are never serialised at all; an S2 identifies a prescriber of dangerous
 * drugs, and publishing one is an invitation to prescription fraud.
 *
 * `credential` must be eager-loaded by the caller. It is read for every row, so
 * without it the directory is an N+1 across the whole roster.
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
            // Null whenever the doctor has not agreed to their likeness being
            // published, or is no longer published at all — the avatar falls
            // back to initials, which is what every one of these surfaces
            // rendered before photographs existed.
            'photo_url' => $this->hasPublishablePhoto()
                ? route('doctors.photo', [
                    'doctor' => $this->user_id,
                    'v' => $this->photoVersion(),
                ])
                : null,
            'profile_url' => route('doctors.show', ['doctor' => $this->user_id]),
            'bio' => $this->bio,
            'languages' => $this->languages,
            'practising_since' => $this->practising_since,
            'credentials' => $this->publishedCredentials(),
            // Schedules live in availability_blocks, not on the profile. Only
            // included when the caller eager-loads them — the public doctors
            // page and the booking picker both do, the latter so it can tell a
            // patient which days the doctor holds clinic instead of only that
            // the date they picked is not one of them.
            'schedules' => $this->whenLoaded('availabilityBlocks', fn () => $this->formatSchedules()),
        ];
    }

    /**
     * The credentials a patient may see, or null when there are none to show.
     *
     * Reads publishedCredential(), so a pending, rejected, suspended or lapsed
     * file yields nothing: printing a licence number beside a doctor's name
     * asserts that the clinic has checked it and that it is good today, and for
     * any status other than verified-and-unlapsed that assertion is false.
     *
     * The PRC number is published rather than hidden because it is exactly what
     * makes the rest of the page checkable — PRC runs a public verification
     * portal, and a patient can look the number up without the clinic's help.
     * That is the practice Philippine doctor directories already follow.
     *
     * @return array<string, mixed>|null
     */
    private function publishedCredentials(): ?array
    {
        $credential = $this->publishedCredential();

        if ($credential === null) {
            return null;
        }

        return [
            'prc_license_no' => $credential->prc_license_no,
            'verified_on' => $credential->verified_at?->format('d M Y'),
            // "Diplomate, Philippine Board of Pediatrics" — stated as the fact
            // it is. Null for a general practitioner, which is a legitimate way
            // to practise and not an omission.
            'board' => $this->boardStanding($credential),
        ];
    }

    /**
     * The specialty board line, or null when no certificate is on file.
     *
     * Both halves are required — hasBoardCertificate() refuses a rank without a
     * named board — because "Fellow" on its own tells a patient nothing they
     * can verify.
     */
    private function boardStanding(StaffCredential $credential): ?string
    {
        if (! $credential->hasBoardCertificate()) {
            return null;
        }

        return $credential->board_status->label().', '.$credential->specialty_board;
    }

    /**
     * Collapse recurring availability blocks into display rows, grouping days
     * that share the same hours: "Mon / Wed / Fri" + "9AM – 5PM".
     *
     * Specific-date blocks (day_of_week = null) are skipped — those are one-off
     * overrides such as Out of Office, not part of a weekly schedule.
     *
     * Only PUBLISHED blocks are shown. A draft the doctor is still editing and
     * a roster still sitting in an administrator's queue generate no bookable
     * slot (AvailabilityBlock::scopePublished), so advertising either of them
     * as clinic hours promises a patient a day they cannot actually book —
     * the same mismatch, from the other side, as the "no availability
     * configured" message this list now feeds.
     */
    private function formatSchedules(): array
    {
        $dayNames = [1 => 'Sun', 2 => 'Mon', 3 => 'Tue', 4 => 'Wed', 5 => 'Thu', 6 => 'Fri', 7 => 'Sat'];

        return $this->availabilityBlocks
            ->where('approval_status', AvailabilityBlock::APPROVAL_PUBLISHED)
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
