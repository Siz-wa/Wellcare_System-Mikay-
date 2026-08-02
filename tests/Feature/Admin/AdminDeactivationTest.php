<?php

use App\Exceptions\AccountActionNotAllowedException;
use App\Models\User;
use App\Services\StaffAccountService;

/**
 * Figure 4's "Deactivate/Reactivate Acc" flow.
 *
 * Deactivation is enforced in two independent places and both are tested,
 * because each covers a case the other does not:
 *
 *   Fortify::authenticateUsing()  — refuses a NEW login
 *   EnsureUserIsActive middleware — ends a session that was ALREADY open
 *
 * Only testing the first would leave a dismissed employee logged in until they
 * happened to sign out, which is exactly the window deactivation exists to close.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
});

// ── The flag itself ───────────────────────────────────────────────────────────

it('defaults a new account to active', function () {
    expect(userWithRole('user')->is_active)->toBeTrue();
});

it('deactivates and reactivates an account', function () {
    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$nurse->id}/deactivate")
        ->assertRedirect();

    expect($nurse->fresh()->is_active)->toBeFalse();

    $this->actingAs($this->admin)
        ->post("/admin/users/{$nurse->id}/activate")
        ->assertRedirect();

    expect($nurse->fresh()->is_active)->toBeTrue();
});

it('keeps the account row and its records rather than deleting them', function () {
    // The reason is_active is a flag and not a soft delete: deleting the user
    // would fire nullOnDelete() across appointments.user_id and
    // patients.guarantor_id, orphaning the medical record.
    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)->post("/admin/users/{$nurse->id}/deactivate");

    expect(User::find($nurse->id))->not->toBeNull();
});

// ── Login is refused ──────────────────────────────────────────────────────────

it('refuses a login from a deactivated account', function () {
    $user = User::factory()->deactivated()->role('user')->create([
        'email' => 'suspended@wellcare.com',
        'password' => 'Str0ng-Passw0rd!',
    ]);

    $this->post('/login', [
        'email' => 'suspended@wellcare.com',
        'password' => 'Str0ng-Passw0rd!',
    ])->assertSessionHasErrors();

    $this->assertGuest();
    expect($user->fresh()->is_active)->toBeFalse();
});

it('still lets an active account log in', function () {
    User::factory()->role('user')->create([
        'email' => 'fine@wellcare.com',
        'password' => 'Str0ng-Passw0rd!',
    ]);

    $this->post('/login', [
        'email' => 'fine@wellcare.com',
        'password' => 'Str0ng-Passw0rd!',
    ]);

    $this->assertAuthenticated();
});

// ── An open session is ended ──────────────────────────────────────────────────

it('boots a signed-in user whose account is deactivated mid-session', function () {
    $patient = userWithRole('user');

    // Already signed in and working normally.
    $this->actingAs($patient)->get('/user/dashboard')->assertOk();

    $patient->update(['is_active' => false]);

    $this->actingAs($patient)
        ->get('/user/dashboard')
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

it('restores access once the account is reactivated', function () {
    $patient = User::factory()->deactivated()->role('user')->create();

    $this->actingAs($patient)->get('/user/dashboard')->assertRedirect(route('login'));

    $patient->update(['is_active' => true]);

    $this->actingAs($patient)->get('/user/dashboard')->assertOk();
});

// ── Lockout guards ────────────────────────────────────────────────────────────

it('refuses to let an admin deactivate their own account', function () {
    $this->actingAs($this->admin)
        ->post("/admin/users/{$this->admin->id}/deactivate")
        ->assertSessionHas('error');

    expect($this->admin->fresh()->is_active)->toBeTrue();
});

it('still deactivates an admin while another active admin remains', function () {
    $other = userWithRole('admin');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$other->id}/deactivate")
        ->assertSessionHas('success');

    expect($other->fresh()->is_active)->toBeFalse();
});

/**
 * The last-active-admin guard is defence in depth, not a live HTTP path.
 *
 * Over HTTP it cannot be reached: only an active admin can call these routes,
 * so an active admin always remains — and the one case that would empty the
 * set, an admin acting on themselves, is caught first by the self-guard. It is
 * therefore asserted against the service directly, which is the layer that
 * would matter if a console command, a seeder or a future bulk action ever
 * called setActive() without a session behind it.
 */
it('refuses at the service layer to remove the last active admin', function () {
    $service = app(StaffAccountService::class);
    $lastAdmin = userWithRole('admin');
    $actor = userWithRole('admin');

    // Leave exactly one active admin — beforeEach's own admin counts too.
    $this->admin->update(['is_active' => false]);
    $actor->update(['is_active' => false]);

    expect(fn () => $service->setActive($lastAdmin, false, $actor))
        ->toThrow(AccountActionNotAllowedException::class);

    expect($lastAdmin->fresh()->is_active)->toBeTrue();
});

it('refuses at the service layer to demote the last active admin', function () {
    $service = app(StaffAccountService::class);
    $lastAdmin = userWithRole('admin');
    $actor = userWithRole('admin');

    $this->admin->update(['is_active' => false]);
    $actor->update(['is_active' => false]);

    expect(fn () => $service->changeRole($lastAdmin, 'hr', $actor))
        ->toThrow(AccountActionNotAllowedException::class);

    expect($lastAdmin->fresh()->hasRole('admin'))->toBeTrue();
});

it('allows the change while a second active admin still exists', function () {
    // The mirror of the two tests above — proves they fail for the stated
    // reason (the set would empty) and not because the guard rejects
    // everything.
    $service = app(StaffAccountService::class);
    $target = userWithRole('admin');
    $actor = userWithRole('admin');

    $service->setActive($target, false, $actor);

    expect($target->fresh()->is_active)->toBeFalse();
});

it('allows deactivating a non-admin even when only one admin exists', function () {
    $doctor = userWithRole('doctor');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$doctor->id}/deactivate")
        ->assertSessionHas('success');

    expect($doctor->fresh()->is_active)->toBeFalse();
});
