<?php

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Models\Activity;

function authLog(): Builder
{
    return Activity::query()->where('log_name', 'auth');
}

test('a successful sign-in is recorded', function () {
    $user = User::factory()->create();

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $entry = authLog()->where('event', 'signed-in')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->subject_id)->toBe($user->id)
        ->and($entry->properties['ip'])->not->toBeNull();
});

test('a failed sign-in is recorded against the account', function () {
    $user = User::factory()->create();

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    expect(authLog()->where('event', 'sign-in-failed')->where('subject_id', $user->id)->exists())
        ->toBeTrue();
});

/**
 * Logging attempts on addresses that do not exist would fill the table with
 * whatever a scanner is spraying, and — because the admin activity log renders
 * `properties` — would turn the audit trail into a list of the addresses
 * attackers are guessing.
 */
test('a failed sign-in on an unknown address is not recorded', function () {
    $this->post(route('login'), [
        'email' => 'nobody@example.com',
        'password' => 'whatever',
    ]);

    expect(authLog()->where('event', 'sign-in-failed')->exists())->toBeFalse();
});

test('a sign-out is recorded', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('logout'));

    expect(authLog()->where('event', 'signed-out')->where('subject_id', $user->id)->exists())
        ->toBeTrue();
});

/**
 * The rule from App\Concerns\RecordsActivity, restated for the auth log: the
 * Failed event carries the submitted credentials, and an audit log that leaks
 * them is worse than no audit log.
 */
test('no credential ever reaches the audit trail', function () {
    $user = User::factory()->create();

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'hunter2-is-the-password',
    ]);

    $properties = authLog()->get()->map(fn (Activity $a) => json_encode($a->properties))->implode(' ');

    expect($properties)->not->toContain('hunter2')
        ->and($properties)->not->toContain('password');
});

test('the security page shows the account its own recent activity', function () {
    $user = User::factory()->create();

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('recentActivity.0.event', 'signed-in')
        );
});

test('the security page never shows another account\'s activity', function () {
    $user = User::factory()->create();
    $stranger = User::factory()->create();

    $this->post(route('login'), [
        'email' => $stranger->email,
        'password' => 'password',
    ]);
    $this->post(route('logout'));

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertInertia(fn ($page) => $page->has('recentActivity', 0));
});
