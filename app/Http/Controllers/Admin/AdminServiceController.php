<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Specialty;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveServiceRequest;
use App\Models\Appointment;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The clinic's bookable catalogue, administered.
 *
 * Before this existed the catalogue was App\Enums\Service — eleven PHP cases
 * mirrored by hand into TypeScript. Adding a service, retiring one, or fixing
 * the sentence a patient reads under an option meant editing two source files
 * and shipping a build. That is not something a clinic administrator can do,
 * and it is not something that should have to wait for one of us.
 *
 * ## Retire, never delete
 *
 * There is no destroy action here, and that is deliberate rather than
 * unfinished. `appointments.service` holds the slug on every historical row
 * with no foreign key, so deleting a service would leave completed visits
 * pointing at a catalogue entry that no longer exists — they would render as
 * raw slugs and fall out of every report that groups by service. A service the
 * clinic stops offering is deactivated: it disappears from the booking wizard
 * and from the validator the same moment, while the record of what was already
 * delivered stays intact and readable.
 *
 * The screen says so, rather than leaving an administrator to wonder where the
 * delete button went.
 */
class AdminServiceController extends Controller
{
    public function index(): Response
    {
        $this->authorize('manage', Service::class);

        // One grouped count rather than a count per row: the list is small but
        // this is the query that would become N+1 first, and the number is on
        // every row because it is what tells an administrator whether a slug is
        // still editable.
        $bookings = Appointment::query()
            ->selectRaw('service, COUNT(*) as total')
            ->groupBy('service')
            ->pluck('total', 'service');

        return Inertia::render('admin/services/index', [
            'services' => Service::query()->inDisplayOrder()->get()->map(fn (Service $service) => [
                'id' => $service->id,
                'slug' => $service->slug,
                'name' => $service->name,
                'description' => $service->description,
                'specialties' => $service->specialties,
                'specialtyLabels' => $service->specialtyLabels(),
                'requiresInPerson' => $service->requires_in_person,
                // Float or null — never a formatted string. The form edits it
                // as a number and null is the meaningful "not offered over
                // video" state, which '0.00' would erase.
                'virtualFee' => $service->virtual_fee !== null
                    ? (float) $service->virtual_fee
                    : null,
                'restrictedToSex' => $service->restricted_to_sex,
                'maxAge' => $service->max_age,
                'minAge' => $service->min_age,
                'isActive' => $service->is_active,
                'sortOrder' => $service->sort_order,
                // Drives the "slug is locked" state on the edit form. Sent as
                // a count rather than a boolean so the form can say how many.
                'bookings' => (int) ($bookings[$service->slug] ?? 0),
            ]),

            // The specialty checkboxes. From the enum, which is still the
            // source of truth for what a DOCTOR can be credentialed in — that
            // vocabulary is a credentialing fact, not an administrator's
            // choice, so it stays in code while the services that map onto it
            // moved to the database.
            'specialties' => array_map(fn (Specialty $specialty) => [
                'value' => $specialty->value,
                'label' => $specialty->label(),
            ], Specialty::cases()),
        ]);
    }

    public function store(SaveServiceRequest $request): RedirectResponse
    {
        $this->authorize('manage', Service::class);

        $service = Service::create($this->attributes($request));

        return back()->with('success', "“{$service->name}” has been added to the catalogue.");
    }

    public function update(SaveServiceRequest $request, Service $service): RedirectResponse
    {
        $this->authorize('manage', Service::class);

        $service->update($this->attributes($request));

        return back()->with('success', "“{$service->name}” has been updated.");
    }

    /**
     * Offer or retire one service.
     *
     * Separate from update() because it is the action an administrator takes
     * most often and the one they must be able to take in a hurry — a service
     * the clinic cannot deliver this week should come off the booking form in
     * one click, not by opening a form and finding the right field.
     */
    public function toggle(Service $service): RedirectResponse
    {
        $this->authorize('manage', Service::class);

        $service->update(['is_active' => ! $service->is_active]);

        return back()->with(
            'success',
            $service->is_active
                ? "“{$service->name}” is bookable again."
                : "“{$service->name}” has been retired and is no longer offered. Existing appointments are unaffected.",
        );
    }

    /**
     * The stored shape of a submitted form.
     *
     * The one transformation worth naming: an empty specialty selection is
     * stored as NULL, not as `[]`. NULL means "any rostered doctor may take
     * this" — a blood draw, a scan, an annual physical — and the booking
     * wizard's doctor filter reads it that way. An empty array would mean "no
     * specialty may take this", which would filter the picker down to nobody
     * and make the service unbookable for a reason no screen explains.
     *
     * @return array<string, mixed>
     */
    private function attributes(SaveServiceRequest $request): array
    {
        $specialties = $request->validated('specialties') ?? [];

        return [
            'slug' => $request->validated('slug'),
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'specialties' => $specialties === [] ? null : array_values($specialties),
            'requires_in_person' => $request->boolean('requires_in_person'),
            'virtual_fee' => $request->validated('virtual_fee'),
            'restricted_to_sex' => $request->validated('restricted_to_sex'),
            'max_age' => $request->validated('max_age'),
            'min_age' => $request->validated('min_age'),
            'is_active' => $request->boolean('is_active'),
            'sort_order' => $request->validated('sort_order'),
        ];
    }
}
