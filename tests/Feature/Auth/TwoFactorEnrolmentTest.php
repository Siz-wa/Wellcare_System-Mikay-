<?php

use App\Http\Middleware\EnsureTwoFactorEnrolled;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use App\Models\User;
use PragmaRX\Google2FA\Google2FA;

/**
 * X-01, part two — enrolment has to be completable, not only mandatory.
 *
 * StaffTwoFactorRequiredTest covers the gate: who is stopped and which routes
 * stay open. This file covers the other half, which was broken: a doctor held
 * at the enrolment screen could scan the QR code and then never get past it.
 *
 * Fortify's `ensureStateIsValid()` discards a generated-but-unconfirmed secret
 * on the second load of the security page. Combined with a gate that redirects
 * every un-enrolled staff member back to that page on every click, the secret
 * behind the QR code was wiped before the first code could be typed.
 */
function staffPendingEnrolment(string $role = 'doctor'): User
{
    $user = User::factory()->role($role)->create();

    $user->forceFill([
        'two_factor_secret' => null,
        'two_factor_recovery_codes' => null,
        'two_factor_confirmed_at' => null,
    ])->save();

    return $user;
}

/** The code an authenticator app would be showing for this account right now. */
function currentTotpFor(User $user): string
{
    return app(Google2FA::class)->getCurrentOtp(decrypt($user->fresh()->two_factor_secret));
}

/** Walks the password confirmation that sits in front of the security page. */
function confirmPasswordAs(mixed $test, User $user): void
{
    $test->actingAs($user);
    $test->post(route('password.confirm.store'), ['password' => 'password'])
        ->assertSessionHasNoErrors();
}

// ── Enrolment survives the gate ──────────────────────────────────────────────

test('a scanned setup survives being bounced back by the gate', function () {
    // The exact sequence a doctor performs: start enrolling, scan the code,
    // click something in the sidebar, get sent back here, type the code.
    $doctor = staffPendingEnrolment();
    confirmPasswordAs($this, $doctor);

    $this->get(route('security.edit'))->assertOk();
    $this->post(route('two-factor.enable'))->assertRedirect();
    $this->get(route('security.edit'))->assertOk();
    $this->get(route('two-factor.qr-code'))->assertOk();

    $code = currentTotpFor($doctor);

    $this->get(route('doctor.appointments'))->assertRedirect(route('security.edit'));
    $this->get(route('security.edit'))->assertOk();

    expect($doctor->fresh()->two_factor_secret)->not->toBeNull();

    $this->post(route('two-factor.confirm'), ['code' => $code])
        ->assertSessionHasNoErrors();

    expect($doctor->fresh()->two_factor_confirmed_at)->not->toBeNull();
});

test('reloading the security page repeatedly does not discard the setup', function () {
    $doctor = staffPendingEnrolment();
    confirmPasswordAs($this, $doctor);

    $this->get(route('security.edit'))->assertOk();
    $this->post(route('two-factor.enable'))->assertRedirect();

    $secret = $doctor->fresh()->two_factor_secret;

    foreach (range(1, 5) as $ignored) {
        $this->get(route('security.edit'))->assertOk();
    }

    expect($doctor->fresh()->two_factor_secret)->toBe($secret);
});

test('a setup abandoned for longer than the window is discarded', function () {
    $doctor = staffPendingEnrolment();
    confirmPasswordAs($this, $doctor);

    $this->get(route('security.edit'))->assertOk();
    $this->post(route('two-factor.enable'))->assertRedirect();
    $this->get(route('security.edit'))->assertOk();

    $this->travel(TwoFactorAuthenticationRequest::PENDING_SETUP_TTL_MINUTES + 1)->minutes();

    $this->get(route('security.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('twoFactorSetupExpired', true)
            ->where('twoFactorPending', false)
        );

    expect($doctor->fresh()->two_factor_secret)->toBeNull();
});

// ── The page says why it opened ──────────────────────────────────────────────

test('the security page names the page the gate turned them away from', function () {
    $doctor = staffPendingEnrolment();
    $this->actingAs($doctor);

    $this->get(route('doctor.appointments'))->assertRedirect(route('security.edit'));

    confirmPasswordAs($this, $doctor);

    $this->get(route('security.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('twoFactorRequired', true)
            ->where('twoFactorReturnLabel', 'Appointments')
        );
});

test('the password prompt explains itself when the gate caused it', function () {
    $doctor = staffPendingEnrolment();
    $this->actingAs($doctor);

    $this->get(route('doctor.appointments'))->assertRedirect(route('security.edit'));
    $this->get(route('security.edit'))->assertRedirect(route('password.confirm'));

    $this->get(route('password.confirm'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where(
            'reason',
            'Staff accounts need two-factor authentication before they can be used. Confirm your password to set it up — we will take you back to Appointments when you are done.'
        ));
});

test('an already enrolled account gets the stock password prompt copy', function () {
    // Somebody who opened Settings -> Security deliberately was never told
    // anything about 2FA, and should not be.
    $this->actingAs(userWithRole('doctor'))
        ->get(route('password.confirm'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('reason', null));
});

test('a patient is never told 2FA is required of them', function () {
    $this->actingAs(userWithRole('user'))
        ->get(route('password.confirm'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('reason', null));
});

// ── Finishing enrolment returns them to what they were doing ─────────────────

test('confirming 2FA lands on the page the gate had blocked', function () {
    $doctor = staffPendingEnrolment();
    $this->actingAs($doctor);

    $this->get(route('doctor.appointments'))->assertRedirect(route('security.edit'));

    confirmPasswordAs($this, $doctor);
    $this->get(route('security.edit'))->assertOk();
    $this->post(route('two-factor.enable'))->assertRedirect();
    $this->get(route('security.edit'))->assertOk();

    $this->post(route('two-factor.confirm'), ['code' => currentTotpFor($doctor)])
        ->assertRedirect(route('doctor.appointments'));

    expect(session(EnsureTwoFactorEnrolled::BLOCKED_URL_KEY))->toBeNull();
});

test('enrolling without having been blocked stays on the settings page', function () {
    $doctor = staffPendingEnrolment();
    confirmPasswordAs($this, $doctor);

    $this->get(route('security.edit'))->assertOk();
    $this->post(route('two-factor.enable'))->assertRedirect();
    $this->get(route('security.edit'))->assertOk();

    $this->post(route('two-factor.confirm'), ['code' => currentTotpFor($doctor)])
        ->assertRedirect(route('security.edit'));
});
