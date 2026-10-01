<?php

use App\Enums\Specialty;
use App\Models\Service;
use Database\Seeders\ServiceSeeder;

/**
 * The bookable service vocabulary, and the things that can silently break it.
 *
 * ## What changed
 *
 * This file used to assert PHP ⇄ TypeScript parity: the catalogue was an enum
 * mirrored by hand into a `SERVICE_CATALOGUE` array in bookingdata.ts, and half
 * these tests existed to catch the two drifting. Both are gone. The catalogue
 * is the `services` table, an administrator edits it at /admin/services, and
 * the wizard is handed it as a prop — so there is no second copy left to drift.
 *
 * What survives is the half that was never about duplication: the properties a
 * catalogue has to hold no matter who edits it. Those matter MORE now, not
 * less, because the list is no longer reviewed by anyone reading a diff.
 *
 * The failure mode has no exception and no log line: a service simply never
 * appears in the dropdown, or appears and matches no doctor, and the roster it
 * was meant to reach is unreachable for as long as nobody notices. Five active
 * internal-medicine consultants sat behind that gap.
 */
beforeEach(function () {
    $this->seed(ServiceSeeder::class);
});

// ── The catalogue against the specialty vocabulary ───────────────────────────

// The point of the whole exercise. A specialty the clinic files doctors under
// and no service pointing at it is a roster the booking form cannot ask for —
// which is exactly what happened to internal medicine: five active
// consultants, and the only route to one was "General Consultation", which
// filtered to nothing in particular.
//
// Services that map to null are deliberately NOT counted as reaching a
// specialty. A scan or a blood draw is taken by whoever is rostered; it is not
// a way to ask for a cardiologist.
it('offers a service that asks for every specialty the clinic recognises', function () {
    $reachable = Service::query()->bookable()->get()
        ->flatMap(fn (Service $service) => $service->specialties ?? [])
        ->unique();

    $unreachable = collect(Specialty::cases())
        ->map(fn (Specialty $specialty) => $specialty->value)
        ->diff($reachable)
        ->values()
        ->all();

    expect($unreachable)->toBe(
        [],
        'These specialties have no bookable service pointing at them: '.implode(', ', $unreachable)
    );
});

// A typo here is invisible: DoctorProfile::forSpecialties() matches on exact
// string equality, so `cardiolgy` filters the picker to nobody and the service
// looks like it has no available doctors rather than like it is misconfigured.
it('points every service mapping at a declared specialty', function () {
    $declared = Specialty::values();

    foreach (Service::all() as $service) {
        foreach ($service->specialties ?? [] as $specialty) {
            // in_array + toBeTrue rather than toContain: Pest's toContain takes
            // needles, so a message passed to it becomes a second needle.
            expect(in_array($specialty, $declared, true))->toBeTrue(
                "The '{$service->slug}' service points at '{$specialty}', which is not a specialty the clinic declares."
            );
        }
    }
});

// ── Naming ───────────────────────────────────────────────────────────────────

// The complaint that produced this test: "there is no family medicine there".
//
// There were five family doctors on staff, and one specialty had four names.
// A patient read "Family Medicine" on the doctor card (doctor_profiles
// .specialization), "General / Family Medicine" in the specialty filter
// (SPECIALTY_LABELS), "General Practice" in anything rendered from the PHP
// enum, and "General Consultation" in the service dropdown — the one list they
// actually had to choose from, and the only one of the four that never said
// "family medicine" at all.
//
// Every other specialty named its service identically, which is why this was
// the only one nobody could find.
it('names a single-specialty service exactly as the specialty behind it', function () {
    // OB-Gyne is the one deliberate difference: "OB-Gyne" is what a Philippine
    // patient calls the clinic and "Obstetrics & Gynecology" is what the
    // specialty board calls the certificate. Both are correct for their
    // audience, and nobody fails to connect them.
    $abbreviated = ['ob-gyne'];

    foreach (Service::all() as $service) {
        $specialties = $service->specialties ?? [];

        if (count($specialties) !== 1 || in_array($service->slug, $abbreviated, true)) {
            continue;
        }

        expect($service->name)->toBe(
            Specialty::from($specialties[0])->label(),
            "The '{$service->slug}' service and the specialty it maps to are "
            .'called different things, so a patient looking at a doctor card '
            .'cannot find the service that reaches them.'
        );
    }
});

it('says family medicine wherever the general specialty is named', function () {
    expect(Service::labelFor('general'))->toContain('Family Medicine')
        ->and(Specialty::General->label())->toContain('Family Medicine');

    // The third copy, which the specialty filter and every doctor card render.
    $ts = file_get_contents(resource_path('js/lib/specialties.ts'));

    expect($ts)->toContain("general: 'General / Family Medicine'");
});

// ── The wizard is served the catalogue, not a copy of it ─────────────────────

// The property that replaced the old parity test. There is no longer a list in
// bookingdata.ts to compare against — this asserts there is still no list,
// because reintroducing one would restore exactly the drift this file exists
// to prevent.
it('keeps the catalogue out of the front-end bundle', function () {
    $source = file_get_contents(
        resource_path('js/pages/user/book-appointment/sections/bookingdata.ts')
    );

    expect(str_contains($source, 'SERVICE_CATALOGUE'))->toBeFalse(
        'The service catalogue has been hardcoded into bookingdata.ts again. It is served '
        .'from the `services` table via Service::catalogue(); a second copy here would drift '
        .'from it the first time an administrator edits a service.'
    );
});

it('hands the booking wizard the bookable catalogue', function () {
    $user = userWithRole('user');
    $user->markEmailAsVerified();

    $this->actingAs($user)
        ->get(route('book'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('services', Service::query()->bookable()->count())
            ->has('services.0.value')
            ->has('services.0.label')
            ->has('services.0.description')
            ->has('services.0.inPersonOnly')
        );
});

it('withholds a retired service from the wizard', function () {
    Service::where('slug', 'cardiology')->update(['is_active' => false]);

    $user = userWithRole('user');
    $user->markEmailAsVerified();

    $this->actingAs($user)
        ->get(route('book'))
        ->assertOk()
        ->assertInertia(function ($page) {
            $slugs = collect($page->toArray()['props']['services'])->pluck('value');

            expect($slugs)->not->toContain('cardiology');
        });
});

// ── Every public "Book this service" link reaches a real service ─────────────

// These `?service=` slugs are typed by hand in the marketing page's data file.
// A slug that is not in the catalogue is not an error — the wizard silently
// ignores the prefill — so the patient clicks "Book this service" and lands on
// a blank dropdown. Four of these once pointed at services that did not exist.
it('points every public service link at a bookable service', function () {
    $source = file_get_contents(
        resource_path('js/pages/generals/services/sections/service-data.ts')
    );

    preg_match_all("/\?service=([a-z0-9-]+)/", $source, $matches);

    $linked = array_unique($matches[1]);
    expect($linked)->not->toBeEmpty('No ?service= links found — has service-data.ts been restructured?');

    $bookable = Service::bookableSlugs();

    foreach ($linked as $slug) {
        expect(in_array($slug, $bookable, true))->toBeTrue(
            "The public services page links to '?service={$slug}', which is not a bookable service. "
            .'The wizard ignores an unknown prefill, so that card opens on a blank dropdown.'
        );
    }
});

// ── Eligibility ──────────────────────────────────────────────────────────────

it('keeps OB-Gyne away from male patients and open to everyone else', function () {
    $obGyne = Service::where('slug', 'ob-gyne')->sole();

    expect($obGyne->isEligibleFor('male', 30))->toBeFalse()
        ->and($obGyne->isEligibleFor('female', 30))->toBeTrue()
        // "Prefer not to say" is not a reason to withhold a service.
        ->and($obGyne->isEligibleFor('other', 30))->toBeTrue()
        ->and($obGyne->isEligibleFor(null, null))->toBeTrue();
});

it('caps Pediatrics at eighteen', function () {
    $pediatrics = Service::where('slug', 'pediatrics')->sole();

    expect($pediatrics->isEligibleFor('female', 18))->toBeTrue()
        ->and($pediatrics->isEligibleFor('female', 19))->toBeFalse()
        // Unanswered age rules nothing out — Step 1 has not been filled in yet.
        ->and($pediatrics->isEligibleFor('female', null))->toBeTrue();
});

it('puts no age or sex restriction on any other service', function () {
    $restricted = Service::query()->inDisplayOrder()
        ->where(fn ($q) => $q->whereNotNull('restricted_to_sex')->orWhereNotNull('max_age'))
        ->pluck('slug')
        ->all();

    expect($restricted)->toBe(['pediatrics', 'ob-gyne']);
});

// ── The seeder is safe to re-run ─────────────────────────────────────────────

// It is the documented way to correct the shipped copy, so a second run must
// not resurrect a service the clinic retired or renumber a hand-ordered
// catalogue. Both are silent failures: the service simply reappears on the
// booking form.
it('leaves an administrator’s decisions alone when the seeder is re-run', function () {
    Service::where('slug', 'imaging')->update(['is_active' => false, 'sort_order' => 5]);

    $this->seed(ServiceSeeder::class);

    $imaging = Service::where('slug', 'imaging')->sole();

    expect($imaging->is_active)->toBeFalse()
        ->and($imaging->sort_order)->toBe(5)
        // The copy itself is still refreshed — that is what a re-run is for.
        ->and($imaging->name)->toBe('Imaging / Radiology');
});

it('does not duplicate the catalogue when the seeder is re-run', function () {
    $before = Service::count();

    $this->seed(ServiceSeeder::class);

    expect(Service::count())->toBe($before);
});

it('keeps adult-only and male-only services from patients they do not fit', function () {
    // An 8-year-old girl used to be offered OB-Gyne and adult Internal Medicine.
    $obgyne = Service::where('slug', 'ob-gyne')->first();
    $internal = Service::where('slug', 'internal-medicine')->first();

    expect($obgyne->isEligibleFor('female', 8))->toBeFalse()
        ->and($obgyne->isEligibleFor('female', 30))->toBeTrue()
        ->and($internal->isEligibleFor('female', 8))->toBeFalse()
        ->and($internal->ineligibilityReason('male', 8))->toContain('aged 18 and over');

    $urology = new Service(['name' => 'Urology', 'restricted_to_sex' => 'male']);
    expect($urology->isEligibleFor('female', 40))->toBeFalse()
        ->and($urology->isEligibleFor('male', 40))->toBeTrue();
});

it('lets an administrator set a minimum age and a male-only restriction', function () {
    $this->actingAs(userWithRole('admin'))
        ->post('/admin/services', [
            'name' => 'Urology',
            'slug' => 'urology',
            'description' => 'Kidney, bladder and prostate care for men.',
            'specialties' => [],
            'restricted_to_sex' => 'male',
            'min_age' => 18,
            'max_age' => null,
            'virtual_fee' => null,
            'sort_order' => 200,
            'requires_in_person' => false,
            'is_active' => true,
        ])
        ->assertSessionHasNoErrors();

    $service = Service::where('slug', 'urology')->first();
    expect($service->min_age)->toBe(18)->and($service->restricted_to_sex)->toBe('male');
});

it('refuses a minimum age above the maximum', function () {
    $this->actingAs(userWithRole('admin'))
        ->post('/admin/services', [
            'name' => 'Odd', 'slug' => 'odd', 'description' => 'An impossible age range for testing.',
            'specialties' => [], 'min_age' => 30, 'max_age' => 18,
            'sort_order' => 210, 'requires_in_person' => false, 'is_active' => true,
        ])
        ->assertSessionHasErrors('min_age');
});
