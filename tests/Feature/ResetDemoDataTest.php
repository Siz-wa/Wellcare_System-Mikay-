<?php

use App\Models\User;

/**
 * `wellcare:demo:reset` is destructive by design, so the tests cover the two
 * ways it must decline to be: on a production database, and when setup re-runs
 * over a laptop that already holds a demo in progress.
 */
it('refuses to wipe a production database', function () {
    app()->detectEnvironment(fn () => 'production');

    $user = userWithRole('user');

    $this->artisan('wellcare:demo:reset', ['--force' => true])
        ->expectsOutputToContain('Refusing')
        ->assertFailed();

    expect(User::whereKey($user->id)->exists())->toBeTrue();
});

it('leaves an existing demo alone when asked to seed only an empty database', function () {
    $user = userWithRole('user');

    $this->artisan('wellcare:demo:reset', ['--force' => true, '--if-empty' => true])
        ->expectsOutputToContain('left as it is')
        ->assertSuccessful();

    expect(User::whereKey($user->id)->exists())->toBeTrue();
});

it('changes nothing when the confirmation is declined', function () {
    $user = userWithRole('user');

    $this->artisan('wellcare:demo:reset')
        ->expectsConfirmation(
            'This deletes EVERYTHING in '.DB::connection()->getDatabaseName().' and reseeds the demo. Continue?',
            'no',
        )
        ->assertSuccessful();

    expect(User::whereKey($user->id)->exists())->toBeTrue();
});
