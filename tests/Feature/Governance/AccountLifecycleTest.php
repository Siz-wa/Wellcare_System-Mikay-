<?php

use App\Http\Middleware\EnforceIdleTimeout;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use App\Models\User;
use App\Notifications\AccountChangedNotification;
use App\Services\StaffAccountService;
use Illuminate\Support\Facades\Notification;
use Spatie\Activitylog\Models\Activity;

/**
 * GV-7, GV-8, GV-9 and GV-10 in WELLCARE-GOVERNANCE-PLAN.md — the operational
 * half of the governance pass.
 *
 * These four are about what happens *around* an account rather than what it can
 * reach: whether its owner is told when it changes, how long it stays open
 * unattended, whether a credential somebody else chose survives first contact,
 * and how a locked-out clinic gets back in.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
});

// ── GV-7 · The subject is told ────────────────────────────────────────────────

it('notifies a user when their role is changed', function () {
    Notification::fake();

    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$nurse->id}/role", ['role' => 'hr'])
        ->assertSessionHas('success');

    Notification::assertSentTo(
        $nurse,
        AccountChangedNotification::class,
        fn (AccountChangedNotification $n) => $n->event === 'role' && $n->detail === 'hr',
    );
});

it('notifies a user when their account is suspended', function () {
    // The notice that MUST be mail: a suspended account cannot sign in to read
    // an in-app bell, so an in-app-only suspension notice is not a notice.
    Notification::fake();

    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)
        ->post("/admin/users/{$nurse->id}/deactivate")
        ->assertSessionHas('success');

    Notification::assertSentTo(
        $nurse,
        AccountChangedNotification::class,
        fn (AccountChangedNotification $n) => $n->event === 'suspended'
            && $n->via($nurse) === ['mail'],
    );
});

it('notifies a user when their account is reactivated', function () {
    Notification::fake();

    $nurse = User::factory()->role('nurse')->deactivated()->create();

    $this->actingAs($this->admin)
        ->post("/admin/users/{$nurse->id}/activate")
        ->assertSessionHas('success');

    Notification::assertSentTo(
        $nurse,
        AccountChangedNotification::class,
        fn (AccountChangedNotification $n) => $n->event === 'reactivated',
    );
});

it('sends the sign-in address notice to the OLD address, not the new one', function () {
    // The whole point. A change made by somebody who has already taken over the
    // mailbox would otherwise notify only them.
    Notification::fake();

    $nurse = userWithRole('nurse');
    $previousEmail = $nurse->email;

    $this->actingAs($this->admin)
        ->put("/admin/users/{$nurse->id}", [
            'first_name' => 'Corazon',
            'last_name' => 'Villamor',
            'email' => 'moved@wellcare.com',
            'contact_number' => '09181234567',
        ])
        ->assertSessionHas('success');

    Notification::assertSentOnDemand(
        AccountChangedNotification::class,
        function (AccountChangedNotification $n, array $channels, object $notifiable) use ($previousEmail) {
            return $n->event === 'email'
                && $notifiable->routes['mail'] === $previousEmail;
        },
    );
});

it('does not notify about an email change that did not happen', function () {
    Notification::fake();

    $nurse = userWithRole('nurse');

    $this->actingAs($this->admin)
        ->put("/admin/users/{$nurse->id}", [
            'first_name' => 'Same',
            'last_name' => 'Address',
            'email' => $nurse->email,
            'contact_number' => '09181234567',
        ])
        ->assertSessionHas('success');

    Notification::assertNothingSentTo($nurse);
});

// ── GV-9 · A password somebody else chose does not survive first contact ──────

it('flags an admin-created account to change its password', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', [
            'first_name' => 'Grace',
            'last_name' => 'Alonzo',
            'email' => 'grace.alonzo@wellcare.com',
            'password' => 'Str0ng-Passw0rd!',
            'password_confirmation' => 'Str0ng-Passw0rd!',
            'role' => 'nurse',
            'contact_number' => '09171234567',
        ])
        ->assertSessionHas('success');

    expect(User::where('email', 'grace.alonzo@wellcare.com')->first()->must_change_password)
        ->toBeTrue();
});

it('does not flag an account whose holder chose their own password', function () {
    // The public-registration path. Asserted at the service rather than through
    // POST /register, because CreateNewUser validates fourteen fields and this
    // is a test about one default, not about the registration form.
    $user = app(StaffAccountService::class)->create([
        'first_name' => 'Self',
        'last_name' => 'Registered',
        'email' => 'self.registered@example.com',
        'password' => 'Str0ng-Passw0rd!',
        'contact_number' => '09171234567',
    ], 'user', verified: false);

    expect($user->must_change_password)->toBeFalse();
});

it('holds a flagged account at the password screen', function () {
    $nurse = userWithRole('nurse');
    $nurse->update(['must_change_password' => true]);

    $this->actingAs($nurse)
        ->get('/nurse/dashboard')
        ->assertRedirect('/settings/security');
});

it('refuses writes from a flagged account rather than silently discarding them', function () {
    // Redirecting a POST would drop its payload and look to the user like it
    // saved. A write from an account whose password a second person knows is
    // also exactly what the flag exists to prevent.
    $nurse = userWithRole('nurse');
    $nurse->update(['must_change_password' => true]);

    // `settings/profile` deliberately: a route with no model binding, so the
    // request reaches the middleware instead of 404ing on a missing record
    // first.
    $this->actingAs($nurse)
        ->patch('/settings/profile', ['first_name' => 'Changed'])
        ->assertForbidden();
});

it('does not trap a flagged account in a redirect loop', function () {
    // `security.edit` sits behind Fortify's `password.confirm`, so a 302 from
    // it is correct and expected — the account is being sent to confirm its
    // password on the way to changing it.
    //
    // What must never happen is the middleware bouncing that request back to
    // `security.edit` again, which is a lockout with no way out. That absence
    // is the property worth asserting, not the status code.
    $nurse = userWithRole('nurse');
    $nurse->update(['must_change_password' => true]);

    $location = $this->actingAs($nurse)
        ->get('/settings/security')
        ->headers->get('Location');

    expect($location)->not->toContain('/settings/security');
});

it('clears the flag when the password is changed', function () {
    $nurse = userWithRole('nurse');
    $nurse->update([
        'password' => 'Original-Passw0rd!',
        'must_change_password' => true,
    ]);

    $this->actingAs($nurse)
        ->put('/settings/password', [
            'current_password' => 'Original-Passw0rd!',
            'password' => 'Chosen-By-M3-Alone!',
            'password_confirmation' => 'Chosen-By-M3-Alone!',
        ])
        ->assertSessionHasNoErrors();

    expect($nurse->fresh()->must_change_password)->toBeFalse();
});

it('lets a brand-new staff account change its password before enrolling 2FA', function () {
    // An admin-created account starts in BOTH states: an issued password and
    // no second factor. Each gate must leave open the step the other one
    // requires first, or the account can do nothing but log out.
    $nurse = userWithRole('nurse');
    $nurse->forceFill([
        'password' => 'Original-Passw0rd!',
        'must_change_password' => true,
        'two_factor_secret' => null,
        'two_factor_confirmed_at' => null,
    ])->save();

    $this->actingAs($nurse)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->put('/settings/password', [
            'current_password' => 'Original-Passw0rd!',
            'password' => 'Chosen-By-M3-Alone!',
            'password_confirmation' => 'Chosen-By-M3-Alone!',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($nurse->fresh()->must_change_password)->toBeFalse();

    $this->actingAs($nurse->fresh())
        ->withSession(['auth.password_confirmed_at' => time()])
        ->post('/user/two-factor-authentication')
        ->assertSessionHasNoErrors();

    expect($nurse->fresh()->two_factor_secret)->not->toBeNull();
});

// ── GV-8 · Idle timeout follows the blast radius ──────────────────────────────

it('signs out a privileged account after its own idle window', function () {
    $this->actingAs($this->admin)->get('/admin/dashboard')->assertOk();

    // Move the session's last-activity stamp past the admin window (20 min).
    session([EnforceIdleTimeout::LAST_ACTIVITY_KEY => now()->subMinutes(25)->getTimestamp()]);

    $this->get('/admin/dashboard')->assertRedirect('/login');
    expect(auth()->check())->toBeFalse();
});

it('leaves a patient signed in over the same gap', function () {
    // The asymmetry, asserted from the other side: 25 minutes idle is an expiry
    // for an administrator and nothing at all for a patient on their own phone.
    $patient = userWithRole('user');

    $this->actingAs($patient)->get('/user/dashboard')->assertOk();

    session([EnforceIdleTimeout::LAST_ACTIVITY_KEY => now()->subMinutes(25)->getTimestamp()]);

    $this->get('/user/dashboard')->assertOk();
    expect(auth()->check())->toBeTrue();
});

it('keeps an active session alive indefinitely', function () {
    // Idle-based, not absolute: a doctor working continuously is never kicked
    // out mid-consultation.
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)->get('/doctor/appointments')->assertOk();
    $this->travel(20)->minutes();
    $this->get('/doctor/appointments')->assertOk();
    $this->travel(20)->minutes();
    $this->get('/doctor/appointments')->assertOk();

    expect(auth()->check())->toBeTrue();
});

it('gives every configured role a window no longer than the patient default', function () {
    $map = config('security.idle_timeout_minutes');
    $default = config('security.idle_timeout_default');

    foreach (['owner', 'dpo', 'admin', 'hr', 'doctor', 'nurse'] as $role) {
        expect($map[$role])->toBeLessThan($default);
    }
});

it('keeps the two-factor setup window inside the shortest idle window', function () {
    // A constraint GV-8 created and nothing else enforces.
    //
    // `TwoFactorAuthenticationRequest::PENDING_SINCE_KEY` lives in the session,
    // and `expireStalePendingSetup()` deliberately gives a secret first seen in
    // a fresh session a FULL new window rather than expiring it on sight. So if
    // the setup TTL ever exceeds the idle window, the session always ends
    // first, the marker dies with it, and every sign-in restarts the clock —
    // a stale unconfirmed secret would then live forever and this expiry would
    // never fire for any staff account.
    //
    // It is not a hole (an unconfirmed secret grants nothing, and
    // EnsureTwoFactorEnrolled gates on `two_factor_confirmed_at`), but it makes
    // the mechanism decorative, which is worse than not having it.
    $shortestStaffWindow = collect(config('security.idle_timeout_minutes'))
        ->only(['owner', 'dpo', 'admin', 'hr', 'doctor', 'nurse'])
        ->min();

    expect(TwoFactorAuthenticationRequest::PENDING_SETUP_TTL_MINUTES)
        ->toBeLessThan($shortestStaffWindow);
});

// ── GV-10 · Break-glass recovery ──────────────────────────────────────────────

it('refuses to run while an active administrator exists', function () {
    // Not an emergency. The change belongs in /admin/users, where it is
    // attributable to a signed-in person.
    $target = userWithRole('nurse');

    $this->artisan('wellcare:admin:recover', [
        '--email' => $target->email,
        '--operator' => 'Ana Reyes',
    ])->assertFailed();

    expect($target->fresh()->hasRole('admin'))->toBeFalse();
});

it('restores administrative access when nobody can sign in, and records why', function () {
    $this->admin->update(['is_active' => false]);
    $target = userWithRole('nurse');

    $this->artisan('wellcare:admin:recover', [
        '--email' => $target->email,
        '--operator' => 'Ana Reyes',
    ])
        ->expectsQuestion(
            'Why is this necessary? This is recorded permanently.',
            'Sole administrator lost their 2FA device and the clinic cannot process LOAs.',
        )
        ->expectsConfirmation('Proceed?', 'yes')
        ->assertSuccessful();

    expect($target->fresh()->hasRole('admin'))->toBeTrue();

    $entry = Activity::where('log_name', 'emergency')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->properties['operator'])->toBe('Ana Reyes')
        ->and($entry->properties['reason'])->toContain('2FA device')
        ->and($entry->properties['previous_role'])->toBe('nurse');
});

it('changes nothing when the operator declines the confirmation', function () {
    // The last stop before an irreversible grant. Declining must leave no role
    // change AND no audit entry — a recorded "emergency access" that did not
    // happen would poison the one log the DPO is meant to trust.
    $this->admin->update(['is_active' => false]);
    $target = userWithRole('nurse');

    $this->artisan('wellcare:admin:recover', [
        '--email' => $target->email,
        '--operator' => 'Ana Reyes',
    ])
        ->expectsQuestion(
            'Why is this necessary? This is recorded permanently.',
            'Sole administrator locked out overnight, clinic opens at 7am.',
        )
        ->expectsConfirmation('Proceed?', 'no')
        ->assertSuccessful();

    expect($target->fresh()->hasRole('admin'))->toBeFalse()
        ->and($target->fresh()->hasRole('nurse'))->toBeTrue()
        ->and(Activity::where('log_name', 'emergency')->count())->toBe(0);
});

it('will not revive a closed account', function () {
    // A closed account is a retention artefact whose credentials have already
    // been scrubbed by User::closeAccount(). Reviving it would resurrect an
    // identity somebody deliberately retired.
    $this->admin->update(['is_active' => false]);

    $closed = userWithRole('user');
    $email = $closed->email;
    $closed->closeAccount();

    $this->artisan('wellcare:admin:recover', [
        '--email' => $email,
        '--operator' => 'Ana Reyes',
    ])->assertFailed();
});

it('surfaces emergency recoveries to the DPO', function () {
    activity('emergency')
        ->performedOn(userWithRole('nurse'))
        ->withProperties([
            'operator' => 'Ana Reyes',
            'reason' => 'Clinic locked out before opening.',
            'forced' => false,
        ])
        ->log('Break-glass administrative recovery');

    $this->actingAs(userWithRole('dpo'))
        ->get('/dpo/dashboard')
        ->assertInertia(fn ($page) => $page
            ->where('stats.emergencyEvents', 1)
            ->has('emergencyAccess', 1)
            ->where('emergencyAccess.0.operator', 'Ana Reyes')
            ->where('emergencyAccess.0.reason', 'Clinic locked out before opening.')
        );
});
