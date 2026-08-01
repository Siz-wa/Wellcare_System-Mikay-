<?php

use App\Http\Controllers\DashboardController;
use App\Models\User;

/**
 * Figure 4's "Add New User", "Manage User Acc" and "Manage User/Roles" flows.
 *
 * The assertion that matters most here is the profile row. This project keeps
 * no name on `users` — User::getNameAttribute() reads `patient_profiles`, and
 * the topbar renders it on every authenticated page. An account created
 * without one is not visibly broken until someone logs into it, so it is
 * tested directly rather than assumed.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
});

function validAccountPayload(array $overrides = []): array
{
    return array_merge([
        'first_name' => 'Grace',
        'last_name' => 'Alonzo',
        'email' => 'grace.alonzo@wellcare.com',
        'password' => 'Str0ng-Passw0rd!',
        'password_confirmation' => 'Str0ng-Passw0rd!',
        'role' => 'nurse',
        'contact_number' => '09171234567',
    ], $overrides);
}

// ── Creation ──────────────────────────────────────────────────────────────────

it('creates an account with its role, profile and medical row together', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', validAccountPayload())
        ->assertRedirect();

    $user = User::where('email', 'grace.alonzo@wellcare.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->hasRole('nurse'))->toBeTrue()
        ->and($user->is_active)->toBeTrue()
        // The whole point: a User with no profile renders a blank name.
        ->and($user->profile)->not->toBeNull()
        ->and($user->name)->toBe('Grace Alonzo')
        ->and($user->profile->contact_number)->toBe('09171234567')
        ->and($user->medical)->not->toBeNull();
});

it('marks an admin-created account verified so it can reach its own dashboard', function () {
    // Every non-patient route group sits behind `verified`. Without this the
    // new nurse logs in and then 403s on /nurse/lab-queue.
    $this->actingAs($this->admin)->post('/admin/users', validAccountPayload());

    $user = User::where('email', 'grace.alonzo@wellcare.com')->first();

    expect($user->hasVerifiedEmail())->toBeTrue();
});

it('lets a newly created account sign in and land on its role dashboard', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', validAccountPayload(['role' => 'doctor']));

    $doctor = User::where('email', 'grace.alonzo@wellcare.com')->first();

    expect(DashboardController::routeForUser($doctor))->toBe('doctor.appointments');

    $this->actingAs($doctor)->get('/dashboard')->assertRedirect(route('doctor.appointments'));
});

it('rejects a duplicate email', function () {
    User::factory()->create(['email' => 'taken@wellcare.com']);

    $this->actingAs($this->admin)
        ->post('/admin/users', validAccountPayload(['email' => 'taken@wellcare.com']))
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'taken@wellcare.com')->count())->toBe(1);
});

it('rejects a role that is not one of the system roles', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', validAccountPayload(['role' => 'superuser']))
        ->assertSessionHasErrors('role');

    expect(User::where('email', 'grace.alonzo@wellcare.com')->exists())->toBeFalse();
});

it('rejects a password that fails confirmation', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', validAccountPayload(['password_confirmation' => 'something-else']))
        ->assertSessionHasErrors('password');
});

// ── Update ────────────────────────────────────────────────────────────────────

it('updates the account and its profile in one request', function () {
    $this->actingAs($this->admin)->post('/admin/users', validAccountPayload());
    $user = User::where('email', 'grace.alonzo@wellcare.com')->first();

    $this->actingAs($this->admin)
        ->put("/admin/users/{$user->id}", [
            'first_name' => 'Grace',
            'last_name' => 'Alonzo-Reyes',
            'email' => 'grace.reyes@wellcare.com',
            'contact_number' => '09998887777',
        ])
        ->assertRedirect();

    $user = $user->fresh();

    expect($user->email)->toBe('grace.reyes@wellcare.com')
        ->and($user->name)->toBe('Grace Alonzo-Reyes')
        ->and($user->profile->contact_number)->toBe('09998887777');
});

it('leaves the password alone when the field is left blank', function () {
    $this->actingAs($this->admin)->post('/admin/users', validAccountPayload());
    $user = User::where('email', 'grace.alonzo@wellcare.com')->first();
    $originalHash = $user->password;

    $this->actingAs($this->admin)->put("/admin/users/{$user->id}", [
        'first_name' => 'Grace',
        'last_name' => 'Alonzo',
        'email' => 'grace.alonzo@wellcare.com',
        'password' => '',
    ]);

    expect($user->fresh()->password)->toBe($originalHash);
});

it('lets an account keep its own email on update', function () {
    $user = userWithRole('nurse');
    $user->profile()->create(['first_name' => 'Nina', 'last_name' => 'Cruz', 'classification' => 'old']);

    $this->actingAs($this->admin)
        ->put("/admin/users/{$user->id}", [
            'first_name' => 'Nina',
            'last_name' => 'Cruz',
            'email' => $user->email,
        ])
        ->assertSessionHasNoErrors();
});

// ── Roles ─────────────────────────────────────────────────────────────────────

it('reassigns a role and moves the account to the new landing route', function () {
    $user = userWithRole('user');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$user->id}/role", ['role' => 'nurse'])
        ->assertRedirect();

    $user = $user->fresh();

    expect($user->hasRole('nurse'))->toBeTrue()
        // syncRoles, not assignRole — a user holding two roles would land
        // wherever routeForUser happens to test first.
        ->and($user->hasRole('user'))->toBeFalse()
        ->and(DashboardController::routeForUser($user))->toBe('nurse.lab-queue');
});

it('refuses to let an admin change their own role', function () {
    $this->actingAs($this->admin)
        ->post("/admin/users/{$this->admin->id}/role", ['role' => 'user'])
        ->assertSessionHas('error');

    expect($this->admin->fresh()->hasRole('admin'))->toBeTrue();
});

it('refuses to demote the last active admin', function () {
    $other = userWithRole('admin');

    // Two admins exist, so demoting one is allowed…
    $this->actingAs($this->admin)
        ->post("/admin/users/{$other->id}/role", ['role' => 'hr'])
        ->assertSessionHas('success');

    expect($other->fresh()->hasRole('hr'))->toBeTrue();

    // …but now $this->admin is the only one left, and nobody may demote them.
    $promoted = userWithRole('admin');
    $this->actingAs($promoted)
        ->post("/admin/users/{$this->admin->id}/role", ['role' => 'hr'])
        ->assertSessionHas('success');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$promoted->id}/role", ['role' => 'hr'])
        ->assertSessionHas('error');

    expect($promoted->fresh()->hasRole('admin'))->toBeTrue();
});

// ── Listing ───────────────────────────────────────────────────────────────────

it('lists accounts with their role and active state', function () {
    userWithRole('doctor');
    userWithRole('nurse');

    $this->actingAs($this->admin)
        ->get('/admin/users')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/users/users')
            ->has('users', 3)
            ->where('stats.total', 3)
            ->where('stats.active', 3)
            ->where('stats.inactive', 0)
        );
});

it('filters the account list by role', function () {
    userWithRole('doctor');
    userWithRole('doctor');
    userWithRole('nurse');

    $this->actingAs($this->admin)
        ->get('/admin/users?role=doctor')
        ->assertInertia(fn ($page) => $page->has('users', 2));
});

it('filters the account list by active state', function () {
    User::factory()->deactivated()->role('nurse')->create();

    $this->actingAs($this->admin)
        ->get('/admin/users?status=inactive')
        ->assertInertia(fn ($page) => $page
            ->has('users', 1)
            ->where('stats.inactive', 1)
        );
});

it('never sends a password hash or two-factor secret to the account list', function () {
    User::factory()->withTwoFactor()->role('doctor')->create();

    $response = $this->actingAs($this->admin)->get('/admin/users');

    $response->assertOk();
    expect($response->getContent())
        ->not->toContain('two_factor_secret')
        ->not->toContain('$2y$');   // every bcrypt hash starts with this
});
