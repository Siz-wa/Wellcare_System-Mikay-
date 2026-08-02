<?php

use App\Models\Patient;
use App\Models\User;

/**
 * The security boundary around the admin module.
 *
 * The admin surface can create accounts, assign roles and deactivate other
 * people — it is the most privileged thing in the system, and until this phase
 * `role:admin` guarded exactly one route. Every surface is asserted closed to
 * every other role, including `hr`, who shares a route group with admins
 * elsewhere and is the easiest role to accidentally let in.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
    $this->hr = userWithRole('hr');
    $this->doctor = userWithRole('doctor');
    $this->nurse = userWithRole('nurse');
    $this->patient = userWithRole('user');
});

// ── Read surfaces ─────────────────────────────────────────────────────────────

it('opens every admin page for an admin', function (string $url, string $component) {
    $this->actingAs($this->admin)
        ->get($url)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component($component));
})->with([
    ['/admin/dashboard', 'admin/dashboard'],
    ['/admin/users', 'admin/users/users'],
    ['/admin/patients', 'admin/patients/patients'],
    ['/admin/archive', 'admin/archive/archive'],
    ['/admin/activity-log', 'admin/activity-log/activity-log'],
]);

it('refuses every admin page to every other role', function (string $actor, string $url) {
    $this->actingAs($this->{$actor})->get($url)->assertForbidden();
})->with(['hr', 'doctor', 'nurse', 'patient'])
    ->with([
        '/admin/dashboard',
        '/admin/users',
        '/admin/patients',
        '/admin/archive',
        '/admin/activity-log',
    ]);

it('requires a login for every admin surface', function (string $url) {
    $this->get($url)->assertRedirect('/login');
})->with([
    '/admin/dashboard',
    '/admin/users',
    '/admin/patients',
    '/admin/archive',
    '/admin/activity-log',
]);

// ── Write surfaces ────────────────────────────────────────────────────────────

it('refuses account creation to every other role', function (string $actor) {
    $this->actingAs($this->{$actor})
        ->post('/admin/users', [
            'first_name' => 'Mal', 'last_name' => 'Actor',
            'email' => 'mal@wellcare.com',
            'password' => 'Str0ng-Passw0rd!', 'password_confirmation' => 'Str0ng-Passw0rd!',
            'role' => 'admin',
        ])
        ->assertForbidden();

    expect(User::where('email', 'mal@wellcare.com')->exists())->toBeFalse();
})->with(['hr', 'doctor', 'nurse', 'patient']);

it('refuses role assignment to every other role', function (string $actor) {
    $target = userWithRole('user');

    $this->actingAs($this->{$actor})
        ->post("/admin/users/{$target->id}/role", ['role' => 'admin'])
        ->assertForbidden();

    expect($target->fresh()->hasRole('admin'))->toBeFalse();
})->with(['hr', 'doctor', 'nurse', 'patient']);

it('refuses deactivation to every other role', function (string $actor) {
    $target = userWithRole('user');

    $this->actingAs($this->{$actor})
        ->post("/admin/users/{$target->id}/deactivate")
        ->assertForbidden();

    expect($target->fresh()->is_active)->toBeTrue();
})->with(['hr', 'doctor', 'nurse', 'patient']);

it('refuses archive restoration to every other role', function (string $actor) {
    $patient = Patient::factory()->create();
    $patient->delete();

    $this->actingAs($this->{$actor})
        ->post("/admin/archive/patients/{$patient->id}/restore")
        ->assertForbidden();

    expect(Patient::onlyTrashed()->find($patient->id))->not->toBeNull();
})->with(['hr', 'doctor', 'nurse', 'patient']);

// ── Landing route ─────────────────────────────────────────────────────────────

it('lands an admin on the admin dashboard, not the HR one', function () {
    $this->actingAs($this->admin)
        ->get('/dashboard')
        ->assertRedirect(route('admin.dashboard'));
});

it('still lets an admin reach the HR queue', function () {
    // The admin landing route changed; their membership of the role:hr|admin
    // group did not. Losing it would recreate the 403 that group exists to fix.
    $this->actingAs($this->admin)->get('/hr/dashboard')->assertOk();
});

it('keeps HR landing on the HR dashboard', function () {
    $this->actingAs($this->hr)
        ->get('/dashboard')
        ->assertRedirect(route('hr.dashboard'));
});
