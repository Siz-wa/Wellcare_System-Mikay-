<?php

use App\Models\User;

/**
 * The regression this file exists for.
 *
 * `require routes/settings.php` used to sit inside the `role:user` group in
 * web.php. Nested route middleware accumulates rather than replaces, so every
 * settings route inherited `role:user` and returned 403 for the four staff
 * roles — a doctor could not open their own profile, change their own
 * password, or turn on two-factor authentication.
 *
 * The failure was invisible from the patient portal, which is the role most of
 * the suite exercises, so nothing caught it.
 */
test('every role can reach their own profile settings', function (string $role) {
    $user = User::factory()->role($role)->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk();
})->with(['user', 'doctor', 'nurse', 'hr', 'admin']);

test('every role can reach their own security settings', function (string $role) {
    $user = User::factory()->role($role)->create();

    // Fortify is configured with `confirmPassword` on the two-factor feature,
    // so SecurityController::middleware() puts `password.confirm` on edit().
    // Seeding the confirmation is what the rest of the suite does too — the
    // assertion under test is the role gate, not the password prompt.
    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertOk();
})->with(['user', 'doctor', 'nurse', 'hr', 'admin']);

/**
 * The remaining three sections, which have no password-confirmation gate.
 *
 * Worth asserting per role rather than once: SettingsShell dispatches the page
 * into the signed-in role's own dashboard chrome, and the layout it picked
 * before this phase was the patient one for everybody — so "a doctor can open
 * settings" and "a doctor gets the doctor shell" are two different claims.
 */
test('every role can reach the remaining settings sections', function (string $role) {
    $user = User::factory()->role($role)->create();

    foreach (['settings.notifications.edit', 'settings.privacy', 'accessibility.edit'] as $routeName) {
        $this->actingAs($user)
            ->get(route($routeName))
            ->assertOk();
    }
})->with(['user', 'doctor', 'nurse', 'hr', 'admin']);

test('every role can update their own password', function (string $role) {
    $user = User::factory()->role($role)->create();

    $this->actingAs($user)
        ->from(route('security.edit'))
        ->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'a-much-longer-password',
            'password_confirmation' => 'a-much-longer-password',
        ])
        ->assertSessionHasNoErrors();
})->with(['user', 'doctor', 'nurse', 'hr', 'admin']);

test('settings are closed to guests', function (string $routeName) {
    $this->get(route($routeName))->assertRedirect(route('login'));
})->with([
    'profile.edit',
    'security.edit',
    'settings.notifications.edit',
    'settings.privacy',
    'accessibility.edit',
]);

test('the settings index redirects to the profile page', function () {
    $this->actingAs(User::factory()->create())
        ->get('/settings')
        ->assertRedirect('/settings/profile');
});

/**
 * The old /doctor/settings rendered a read-only mock whose Edit and Save
 * buttons did nothing. It is kept only as a redirect because the route name is
 * referenced from the doctor sidebar and from any bookmark a doctor holds.
 */
test('the retired doctor settings page redirects to the real one', function () {
    $this->actingAs(User::factory()->role('doctor')->create())
        ->get(route('doctor.settings'))
        ->assertRedirect('/settings/profile');
});
