<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

/**
 * phpunit.xml pins SESSION_DRIVER to `array` for the whole suite, which is the
 * right default — persisting a session row on every one of the ~600 requests
 * this suite makes would be pure cost.
 *
 * BrowserSessionService::supported() reads that config and correctly reports
 * "no sessions to enumerate", so these tests flip it back to the driver the
 * application actually runs on (see CLAUDE.md: cache, queue and sessions are
 * all `database` locally). The test's OWN session still lives in the array
 * store and is therefore never among the rows — which is why the counts below
 * only ever include the seeded rows.
 */
beforeEach(function () {
    config(['session.driver' => 'database']);
});

/**
 * Writes a row straight into the `sessions` table.
 *
 * There is no way to make the test client hold two real sessions at once, and
 * inserting the row is exactly what the database session driver does — so this
 * is the honest shape of "the same account is signed in on another device".
 */
function seedSession(User $user, string $id, string $agent = 'Mozilla/5.0 (iPhone) Mobile Safari'): void
{
    DB::table('sessions')->insert([
        'id' => $id,
        'user_id' => $user->id,
        'ip_address' => '203.0.113.7',
        'user_agent' => $agent,
        'payload' => base64_encode(serialize([])),
        'last_activity' => now()->getTimestamp(),
    ]);
}

test('the security page lists this account\'s sessions', function () {
    $user = User::factory()->create();

    seedSession($user, 'other-device-session');

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('sessionsSupported', true)
            ->has('sessions', 1)
            ->where('sessions.0.browser', 'Safari')
            ->where('sessions.0.platform', 'iOS')
            ->where('sessions.0.device', 'Phone')
            ->where('sessions.0.ip_address', '203.0.113.7')
        );
});

test('another account\'s sessions are never listed', function () {
    $user = User::factory()->create();
    $stranger = User::factory()->create();

    seedSession($stranger, 'stranger-session');

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertInertia(fn ($page) => $page->has('sessions', 0));
});

/**
 * The raw session id is a bearer credential — anyone holding it holds the
 * session. It must never reach the browser, so the payload identifies each row
 * by a hash instead.
 */
test('raw session ids are not sent to the browser', function () {
    $user = User::factory()->create();

    seedSession($user, 'a-secret-session-id');

    $response = $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'));

    expect($response->getContent())->not->toContain('a-secret-session-id');
});

test('a stale session is not listed', function () {
    $user = User::factory()->create();

    seedSession($user, 'live-session');

    DB::table('sessions')
        ->where('id', 'live-session')
        ->update(['last_activity' => now()->subDays(60)->getTimestamp()]);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertInertia(fn ($page) => $page->has('sessions', 0));
});

test('other sessions can be signed out with the correct password', function () {
    $user = User::factory()->create();

    seedSession($user, 'other-device-session');

    $this->actingAs($user)
        ->from(route('security.edit'))
        ->delete(route('settings.sessions.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors();

    expect(DB::table('sessions')->where('id', 'other-device-session')->exists())->toBeFalse();
});

test('the wrong password leaves other sessions alone', function () {
    $user = User::factory()->create();

    seedSession($user, 'other-device-session');

    $this->actingAs($user)
        ->from(route('security.edit'))
        ->delete(route('settings.sessions.destroy'), ['password' => 'not-the-password'])
        ->assertSessionHasErrors('password');

    expect(DB::table('sessions')->where('id', 'other-device-session')->exists())->toBeTrue();
});

test('signing out other sessions does not touch another account', function () {
    $user = User::factory()->create();
    $stranger = User::factory()->create();

    seedSession($stranger, 'stranger-session');

    $this->actingAs($user)
        ->delete(route('settings.sessions.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors();

    expect(DB::table('sessions')->where('id', 'stranger-session')->exists())->toBeTrue();
});

test('signing other sessions out is recorded in the audit trail', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->delete(route('settings.sessions.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors();

    expect(Activity::where('log_name', 'auth')->where('event', 'sessions-revoked')->exists())->toBeTrue();
});

/**
 * On a `file` or `cookie` driver there is nothing to enumerate. The page must
 * say so rather than silently render an empty list that looks like "you are
 * signed in nowhere".
 */
test('the page reports when session listing is unavailable', function () {
    config(['session.driver' => 'array']);

    $this->actingAs(User::factory()->create())
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertInertia(fn ($page) => $page
            ->where('sessionsSupported', false)
            ->has('sessions', 0)
        );
});
