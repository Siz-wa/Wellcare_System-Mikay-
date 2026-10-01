<?php

use App\Http\Middleware\EnforceIdleTimeout;
use App\Models\User;
use App\Notifications\BreakGlassRecoveryNotification;
use App\Services\ForcedSignOut;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Whether a refused action SAYS what the boundary is.
 *
 * The controls themselves are asserted in AdminPrivilegeBoundaryTest and
 * GovernanceRoleTest — those prove the app refuses the right things. This file
 * proves the refusal is legible, which is a separate property and the one the
 * manual walkthrough of 2026-09-11 found broken.
 *
 * That run passed every boundary and failed three disclosures: an account was
 * bounced to Settings with the explanation composed, sent and never rendered
 * (T-08); a session ended on schedule and returned the user to an ordinary
 * login page (T-13); and a peer administrator's buttons were correctly disabled
 * while looking, and behaving, exactly like working ones (T-03).
 *
 * All three shared a shape: the server was right and the screen said nothing.
 * Each test below asserts the sentence actually reaches the page, because a
 * test that only asserts the redirect is what let these ship.
 */

/**
 * `security.edit` sits behind Fortify's `password.confirm`, so a plain GET
 * returns a 302 to the confirmation screen rather than the page. These tests
 * are about what the page renders, not about that gate — which
 * AccountLifecycleTest already covers — so they arrive already confirmed.
 */
function withConfirmedPassword(): void
{
    session(['auth.password_confirmed_at' => time()]);
}

// ── GV-9 · The password gate explains itself ──────────────────────────────────

it('tells a provisioned account why it is being held at Settings', function () {
    // T-08. The redirect was already asserted; what was missing is that
    // `settings/security` receives the state it needs to say why. Without the
    // prop the page renders a bare 2FA card and nothing else, which is what a
    // new administrator actually saw.
    $admin = userWithRole('admin');
    $admin->update([
        'must_change_password' => true,
        'two_factor_confirmed_at' => now(),
    ]);

    $this->actingAs($admin);
    withConfirmedPassword();

    $this->get('/settings/security')
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/security/index')
            ->where('mustChangePassword', true)
        );
});

it('names the page the password gate turned the account away from', function () {
    $admin = userWithRole('admin');
    $admin->update([
        'must_change_password' => true,
        'two_factor_confirmed_at' => now(),
    ]);

    // The gate records where they were going, so the notice can name it rather
    // than leaving them to guess which link stopped working.
    $this->actingAs($admin)->get('/admin/dashboard')->assertRedirect('/settings/security');

    withConfirmedPassword();

    $this->get('/settings/security')
        ->assertInertia(fn (Assert $page) => $page
            ->where('mustChangePassword', true)
            ->where('mustChangePasswordReturnLabel', 'Dashboard')
        );
});

it('stops claiming a password change is required once it is done', function () {
    $admin = userWithRole('admin');
    $admin->update(['two_factor_confirmed_at' => now()]);

    $this->actingAs($admin);
    withConfirmedPassword();

    $this->get('/settings/security')
        ->assertInertia(fn (Assert $page) => $page
            ->where('mustChangePassword', false)
            ->where('mustChangePasswordReturnLabel', null)
        );
});

// ── GV-8 · An ended session explains itself ───────────────────────────────────

it('tells a timed-out account why it was signed out', function () {
    // T-13. `withErrors(['email' => ...])` was invisible here: the login page
    // reads errors from the Inertia <Form> render-prop, which carries only that
    // form's own submission errors, so a bag flashed by a redirect had nowhere
    // to land. It travels as its own notice now.
    $admin = userWithRole('admin');

    $this->actingAs($admin)->get('/admin/dashboard')->assertOk();

    session([EnforceIdleTimeout::LAST_ACTIVITY_KEY => now()->subMinutes(25)->getTimestamp()]);

    $this->get('/admin/dashboard')->assertRedirect('/login');

    $this->get('/login')->assertInertia(fn (Assert $page) => $page
        ->component('auth/login/index')
        ->where('notice', fn (?string $notice) => $notice !== null
            && str_contains($notice, 'inactivity')
        )
    );
});

it('reads the idle notice as singular at a one-minute window', function () {
    // "signed out after 1 minutes of inactivity" is what the shortened window
    // used during manual testing actually produced.
    config(['security.idle_timeout_minutes.admin' => 1]);

    $admin = userWithRole('admin');
    $this->actingAs($admin)->get('/admin/dashboard')->assertOk();

    session([EnforceIdleTimeout::LAST_ACTIVITY_KEY => now()->subMinutes(5)->getTimestamp()]);
    $this->get('/admin/dashboard')->assertRedirect('/login');

    expect(session(ForcedSignOut::NOTICE_KEY))
        ->toContain('1 minute of inactivity')
        ->not->toContain('1 minutes');
});

it('tells a deactivated account why it was signed out', function () {
    // Same invisible-message bug, and the worse half of it: without this a
    // suspended nurse cannot tell a deactivation from a mistyped password.
    $nurse = userWithRole('nurse');

    $this->actingAs($nurse)->get('/nurse/dashboard')->assertOk();

    $nurse->forceFill(['is_active' => false])->save();

    $this->get('/nurse/dashboard')->assertRedirect('/login');

    $this->get('/login')->assertInertia(fn (Assert $page) => $page
        ->where('notice', fn (?string $notice) => $notice !== null
            && str_contains($notice, 'deactivated')
        )
    );
});

it('leaves the login notice empty for an ordinary visit', function () {
    // The banner is for a session the app ended. Somebody who simply opened the
    // page should not be told anything happened.
    $this->get('/login')->assertInertia(fn (Assert $page) => $page
        ->where('notice', null)
    );
});

// ── GV-2 · Navigation does not advertise doors that 403 ───────────────────────

it('shares the permissions a sidebar needs to hide what an account cannot open', function () {
    // OB-02. The owner sits inside `role:admin|owner` for reachability but
    // holds none of the patient, archive or credentialing permissions, so the
    // shared admin sidebar offered seven links that all 403 for that tier.
    $owner = userWithRole('owner');

    $this->actingAs($owner)
        ->get('/admin/users')
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.permissions', fn ($permissions) => $permissions->contains('users.view')
                && ! $permissions->contains('patients.demographics.view')
                && ! $permissions->contains('archive.view')
                && ! $permissions->contains('staff.credential')
            )
        );
});

it('gives an administrator the permissions the owner lacks', function () {
    // The same assertion from the other side, so the filter is proven to be
    // reading a real difference rather than an empty list.
    $admin = userWithRole('admin');

    $this->actingAs($admin)
        ->get('/admin/users')
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.permissions', fn ($permissions) => $permissions->contains('patients.demographics.view')
                && $permissions->contains('archive.view')
                && $permissions->contains('staff.credential')
            )
        );
});

// ── GV-10 · The break-glass alert describes the right event ───────────────────

it('alerts oversight about the recovered account, not their own', function () {
    // OB-03. The command used to send AccountChangedNotification('role'), so
    // the alert reached the owner and the DPO titled "your access level
    // changed" and opened "An administrator changed **your** account role to
    // ...". Neither recipient's access had changed.
    Notification::fake();

    $owner = userWithRole('owner');
    $dpo = userWithRole('dpo');
    $nurse = userWithRole('nurse');

    User::role('admin')->get()->each(fn (User $u) => $u->forceFill(['is_active' => false])->save());

    $this->artisan('wellcare:admin:recover', [
        '--email' => $nurse->email,
        '--operator' => 'Test Operator',
    ])
        ->expectsQuestion('Why is this necessary? This is recorded permanently.', 'Sole administrator lost their 2FA device')
        ->expectsConfirmation('Proceed?', 'yes')
        ->assertSuccessful();

    foreach ([$owner, $dpo] as $recipient) {
        Notification::assertSentTo(
            $recipient,
            BreakGlassRecoveryNotification::class,
            fn (BreakGlassRecoveryNotification $n) => $n->subjectEmail === $nurse->email
                && $n->operator === 'Test Operator'
                && str_contains($n->reason, '2FA device'),
        );
    }
});

it('states in the alert that recovery reaches no patient record', function () {
    $notification = new BreakGlassRecoveryNotification(
        subjectEmail: 'nurse@wellcare.com',
        operator: 'Test Operator',
        reason: 'Sole administrator lost their 2FA device',
    );

    $mail = $notification->toMail(userWithRole('owner'));
    $body = collect($mail->introLines)->implode(' ');

    expect($mail->subject)->toContain('emergency administrator access')
        ->and($body)->toContain('account access only')
        ->and($body)->toContain('nurse@wellcare.com')
        ->and($body)->toContain('Test Operator');
});
