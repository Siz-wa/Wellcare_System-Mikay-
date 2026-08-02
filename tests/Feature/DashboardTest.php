<?php

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

// There is no single dashboard — /dashboard dispatches to the one for the
// signed-in user's role. See DashboardController::routeForUser().
test('patients are sent to the patient dashboard', function () {
    $this->actingAs(userWithRole('user'));

    $this->get(route('dashboard'))->assertRedirect(route('user.dashboard'));
});

test('doctors are sent to their appointment list', function () {
    $this->actingAs(userWithRole('doctor'));

    $this->get(route('dashboard'))->assertRedirect(route('doctor.appointments'));
});

test('hr staff are sent to the hr dashboard', function () {
    $this->actingAs(userWithRole('hr'));

    $this->get(route('dashboard'))->assertRedirect(route('hr.dashboard'));
});

// Admins used to fall through to user.dashboard, which is gated on role:user —
// so logging in as an admin produced a 403. That was first fixed by sending
// them to hr.dashboard; since the admin module exists (Phase 4) they get their
// own workspace instead. The point this test has always guarded is unchanged:
// an admin lands somewhere they are actually allowed to be.
test('admins are sent to the admin dashboard, not a 403', function () {
    $this->actingAs(userWithRole('admin'));

    $this->get(route('dashboard'))->assertRedirect(route('admin.dashboard'));
});

// The landing route moved; the access did not. Admins remain members of the
// role:hr|admin group, so the HMO queue is still theirs to work.
test('admins can still reach the hr dashboard', function () {
    $this->actingAs(userWithRole('admin'));

    $this->get(route('hr.dashboard'))->assertOk();
});
