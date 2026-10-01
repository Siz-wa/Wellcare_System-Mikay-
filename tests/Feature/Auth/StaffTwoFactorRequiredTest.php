<?php

use App\Models\User;

/**
 * X-01 — 2FA required of staff, optional for patients.
 *
 * The risk this file exists to catch is not "does the gate work" — it is the
 * redirect loop. Every staff account is locked out of the entire application if
 * the enrolment page itself, or the Fortify endpoints it posts to, ever fall
 * behind the gate. The exemption tests below are the important half.
 */
function enrolledStaff(string $role = 'doctor'): User
{
    // userWithRole() already enrols staff — see the note in tests/Pest.php.
    return userWithRole($role);
}

/**
 * A staff account that has NOT set up 2FA.
 *
 * Built explicitly because the shared helper enrols staff by default, which is
 * the right default everywhere except here: this file's whole subject is what
 * happens to an account that has not enrolled yet.
 */
function unenrolledStaff(string $role = 'doctor'): User
{
    $user = userWithRole($role);
    $user->forceFill(['two_factor_confirmed_at' => null])->save();

    return $user;
}

// ── The gate ─────────────────────────────────────────────────────────────────

test('a staff account without 2FA is sent to its security settings', function (string $role) {
    $this->actingAs(unenrolledStaff($role))
        ->get(route('dashboard'))
        ->assertRedirect(route('security.edit'));
})->with(['doctor', 'nurse', 'hr', 'admin']);

test('a staff account with 2FA confirmed passes through', function () {
    $this->actingAs(enrolledStaff())
        ->get(route('dashboard'))
        ->assertRedirect(route('doctor.appointments'));
});

test('a half-finished enrolment does not count', function () {
    // A secret generated but never verified. Reading `two_factor_secret`
    // instead of `two_factor_confirmed_at` would wave this account through.
    $user = unenrolledStaff('doctor');
    $user->forceFill([
        'two_factor_secret' => encrypt('SECRET'),
        'two_factor_confirmed_at' => null,
    ])->save();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('security.edit'));
});

// ── Patients are not covered ─────────────────────────────────────────────────

test('a patient account is never forced to enrol', function () {
    $this->actingAs(userWithRole('user'))
        ->get(route('dashboard'))
        ->assertRedirect(route('user.dashboard'));
});

test('a guest is untouched by the gate', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

// ── No lockout: the enrolment path stays reachable ───────────────────────────

test('the security settings page is not bounced back by the gate', function () {
    // It does redirect — to Fortify's password confirmation, which
    // settings.php puts in front of it and which predates this middleware.
    // What matters is that it is NOT sent back to security.edit, which is what
    // a loop would look like.
    $this->actingAs(unenrolledStaff('doctor'))
        ->get(route('security.edit'))
        ->assertRedirect(route('password.confirm'));
});

test('the password confirmation step is itself exempt', function () {
    // The step security.edit hands off to. Gating it would make enrolment
    // impossible and lock every staff account out permanently.
    $this->actingAs(unenrolledStaff('doctor'))
        ->get(route('password.confirm'))
        ->assertOk();
});

test('the enrolment chain terminates instead of looping', function () {
    // dashboard → security.edit → password.confirm → (a real page).
    // Walk it and assert the last hop is not another redirect back into the
    // chain. This is the test that would catch a lockout.
    $doctor = unenrolledStaff('doctor');

    $this->actingAs($doctor)->get(route('dashboard'))
        ->assertRedirect(route('security.edit'));

    $this->actingAs($doctor)->get(route('security.edit'))
        ->assertRedirect(route('password.confirm'));

    $this->actingAs($doctor)->get(route('password.confirm'))
        ->assertOk();
});

test('email verification stays reachable so unverified staff cannot be trapped', function () {
    $doctor = unenrolledStaff('doctor');
    $doctor->forceFill(['email_verified_at' => null])->save();

    // Without the verification exemption this bounces to security.edit, which
    // bounces to verification.notice, forever.
    $this->actingAs($doctor)
        ->get(route('verification.notice'))
        ->assertOk();
});

test('logout stays available to a locked-out staff account', function () {
    $this->actingAs(unenrolledStaff('doctor'))
        ->post(route('logout'))
        ->assertRedirect();

    $this->assertGuest();
});

// ── Writes are refused rather than silently discarded ────────────────────────

test('an un-enrolled staff account cannot POST past the gate', function () {
    $this->actingAs(unenrolledStaff('doctor'))
        ->post(route('notifications.read-all'))
        ->assertForbidden();
});
