<?php

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\ServiceSeeder;

/**
 * Manage Services — the administrator's control over the bookable catalogue.
 *
 * Three properties are worth guarding here, and they are the three that fail
 * quietly:
 *
 *  1. Only an administrator reaches it. The owner is inside the same route
 *     group for reachability and must NOT hold this capability — the same
 *     §5.1 line that keeps the appointing tier out of the patient record.
 *  2. Retiring a service takes it off the booking form AND out of the
 *     validator, in the same request. A service hidden from the dropdown but
 *     still accepted by a direct POST is not retired.
 *  3. A slug with appointments behind it cannot be renamed. Nothing would
 *     error if it were — the historical rows would simply detach from the
 *     catalogue and start rendering as raw slugs.
 */
beforeEach(function () {
    $this->seed(ServiceSeeder::class);
});

/** @return array{0: User, 1: array<string, mixed>} */
function serviceFixture(): array
{
    $admin = userWithRole('admin');
    $admin->markEmailAsVerified();

    $payload = [
        'name' => 'Dental Consultation',
        'slug' => 'dental-consultation',
        'description' => 'Check-ups, cleaning and fillings.',
        'specialties' => ['general'],
        'requires_in_person' => true,
        'restricted_to_sex' => null,
        'max_age' => null,
        'is_active' => true,
        'sort_order' => 120,
    ];

    return [$admin, $payload];
}

// ── Access ───────────────────────────────────────────────────────────────────

test('an administrator can open the catalogue', function () {
    [$admin] = serviceFixture();

    $this->actingAs($admin)
        ->get(route('admin.services'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/services/index')
            ->has('services', Service::count())
            ->has('specialties')
            ->has('services.0.bookings')
        );
});

test('the owner cannot reach the catalogue', function () {
    // GV / §5.1. The owner is in `role:admin|owner` for reachability and holds
    // no clinic-operations permission — so this is a 403, not a redirect.
    $owner = userWithRole('owner');
    $owner->markEmailAsVerified();

    $this->actingAs($owner)->get(route('admin.services'))->assertForbidden();
});

test('a patient cannot reach the catalogue', function () {
    $user = userWithRole('user');
    $user->markEmailAsVerified();

    $this->actingAs($user)->get(route('admin.services'))->assertForbidden();
});

test('a doctor cannot add a service', function () {
    $doctor = userWithRole('doctor');
    $doctor->markEmailAsVerified();

    [, $payload] = serviceFixture();

    $this->actingAs($doctor)
        ->post(route('admin.services.store'), $payload)
        ->assertForbidden();

    $this->assertDatabaseMissing('services', ['slug' => 'dental-consultation']);
});

// ── Creating ─────────────────────────────────────────────────────────────────

test('an administrator can add a service and patients can book it immediately', function () {
    [$admin, $payload] = serviceFixture();

    $this->actingAs($admin)
        ->post(route('admin.services.store'), $payload)
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('services', [
        'slug' => 'dental-consultation',
        'name' => 'Dental Consultation',
        'requires_in_person' => true,
        'is_active' => true,
    ]);

    // The point of the whole change: no rebuild, no deploy. The validator and
    // the wizard both read the table.
    expect(Service::bookableSlugs())->toContain('dental-consultation');
});

test('an empty specialty selection is stored as "any doctor", not an empty list', function () {
    [$admin, $payload] = serviceFixture();

    // The key absent altogether, which is what an untouched checkbox group
    // sends. Stored as [] this would mean "no specialty may take this" and
    // would filter the doctor picker down to nobody — a service nobody can
    // book, for a reason no screen explains.
    unset($payload['specialties']);

    $this->actingAs($admin)
        ->post(route('admin.services.store'), $payload)
        ->assertSessionHasNoErrors();

    expect(Service::where('slug', 'dental-consultation')->sole()->specialties)->toBeNull();
});

test('a duplicate slug is refused', function () {
    [$admin, $payload] = serviceFixture();
    $payload['slug'] = 'cardiology';

    $this->actingAs($admin)
        ->post(route('admin.services.store'), $payload)
        ->assertSessionHasErrors('slug');
});

test('a slug with spaces or capitals is refused', function () {
    [$admin, $payload] = serviceFixture();
    $payload['slug'] = 'Dental Consultation';

    $this->actingAs($admin)
        ->post(route('admin.services.store'), $payload)
        ->assertSessionHasErrors('slug');
});

test('an undeclared specialty is refused', function () {
    [$admin, $payload] = serviceFixture();
    $payload['specialties'] = ['astrology'];

    $this->actingAs($admin)
        ->post(route('admin.services.store'), $payload)
        ->assertSessionHasErrors('specialties.0');
});

// ── Editing ──────────────────────────────────────────────────────────────────

test('an administrator can rename a service without touching its slug', function () {
    [$admin] = serviceFixture();
    $service = Service::where('slug', 'dermatology')->sole();

    $this->actingAs($admin)
        ->put(route('admin.services.update', $service), [
            'name' => 'Skin & Dermatology Clinic',
            'slug' => $service->slug,
            'description' => $service->description,
            'specialties' => $service->specialties,
            'requires_in_person' => false,
            'restricted_to_sex' => null,
            'max_age' => null,
            'is_active' => true,
            'sort_order' => $service->sort_order,
        ])
        ->assertSessionHasNoErrors();

    expect($service->fresh()->name)->toBe('Skin & Dermatology Clinic');
});

test('a slug cannot be renamed once an appointment carries it', function () {
    [$admin] = serviceFixture();
    $service = Service::where('slug', 'cardiology')->sole();

    Appointment::factory()->create(['service' => 'cardiology']);

    $this->actingAs($admin)
        ->put(route('admin.services.update', $service), [
            'name' => $service->name,
            'slug' => 'heart-clinic',
            'description' => $service->description,
            'specialties' => $service->specialties,
            'requires_in_person' => false,
            'restricted_to_sex' => null,
            'max_age' => null,
            'is_active' => true,
            'sort_order' => $service->sort_order,
        ])
        ->assertSessionHasErrors('slug');

    // The historical appointment still resolves to a named service, which is
    // the whole reason the rename is refused.
    expect($service->fresh()->slug)->toBe('cardiology')
        ->and(Service::labelFor('cardiology'))->toBe('Cardiology');
});

test('a slug can still be corrected before anyone books it', function () {
    [$admin, $payload] = serviceFixture();
    $payload['slug'] = 'dental-consultaton'; // typo

    $this->actingAs($admin)->post(route('admin.services.store'), $payload);

    $service = Service::where('slug', 'dental-consultaton')->sole();
    $payload['slug'] = 'dental-consultation';

    $this->actingAs($admin)
        ->put(route('admin.services.update', $service), $payload)
        ->assertSessionHasNoErrors();

    expect($service->fresh()->slug)->toBe('dental-consultation');
});

// ── Retiring ─────────────────────────────────────────────────────────────────

test('retiring a service removes it from booking in the same request', function () {
    [$admin] = serviceFixture();
    $service = Service::where('slug', 'imaging')->sole();

    $this->actingAs($admin)
        ->post(route('admin.services.toggle', $service))
        ->assertSessionHasNoErrors();

    expect($service->fresh()->is_active)->toBeFalse()
        // Both halves, because hiding it from the dropdown alone would leave a
        // direct POST able to book it.
        ->and(Service::bookableSlugs())->not->toContain('imaging')
        ->and(collect(Service::catalogue())->pluck('value'))->not->toContain('imaging');
});

test('a retired service can be offered again', function () {
    [$admin] = serviceFixture();
    $service = Service::where('slug', 'imaging')->sole();

    $this->actingAs($admin)->post(route('admin.services.toggle', $service));
    $this->actingAs($admin)->post(route('admin.services.toggle', $service));

    expect($service->fresh()->is_active)->toBeTrue();
});

test('retiring a service keeps the appointments already booked against it', function () {
    [$admin] = serviceFixture();
    $service = Service::where('slug', 'cardiology')->sole();

    $appointment = Appointment::factory()->create(['service' => 'cardiology']);

    $this->actingAs($admin)->post(route('admin.services.toggle', $service));

    // The record survives AND still renders a readable name — Service::labelFor
    // deliberately searches the whole table rather than the bookable subset.
    expect($appointment->fresh()->service)->toBe('cardiology')
        ->and(Service::labelFor('cardiology'))->toBe('Cardiology');
});

test('there is no route that deletes a service', function () {
    $routes = collect(app('router')->getRoutes())
        ->filter(fn ($route) => str_starts_with($route->uri(), 'admin/services'))
        ->flatMap(fn ($route) => $route->methods())
        ->unique()
        ->values()
        ->all();

    expect($routes)->not->toContain('DELETE');
});
