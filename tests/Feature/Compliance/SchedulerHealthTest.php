<?php

use App\Console\Commands\SchedulerHeartbeat;
use Illuminate\Support\Facades\Cache;

/**
 * Task 0.2 — proof that the scheduler is alive.
 *
 * The failure this guards against is not a crash. It is silence: cron never
 * installed, or a worker that died months ago, with every scheduled command in
 * routes/console.php quietly not running and nothing on any screen to say so.
 *
 * The exit codes are the contract — a monitor should learn the scheduler is
 * dead without parsing prose — so they are what these tests assert.
 */
test('the heartbeat records a timestamp', function () {
    $this->artisan('wellcare:scheduler:heartbeat')->assertSuccessful();

    expect(Cache::get(SchedulerHeartbeat::CACHE_KEY))->toBeString();
});

test('status succeeds when the heartbeat is recent', function () {
    $this->artisan('wellcare:scheduler:heartbeat')->assertSuccessful();

    $this->artisan('wellcare:scheduler:status')->assertSuccessful();
});

test('status fails when no heartbeat has ever been recorded', function () {
    Cache::forget(SchedulerHeartbeat::CACHE_KEY);

    $this->artisan('wellcare:scheduler:status')->assertFailed();
});

test('status fails when the heartbeat is older than the threshold', function () {
    // Written two hours ago; the default threshold is thirty minutes.
    Cache::put(
        SchedulerHeartbeat::CACHE_KEY,
        now()->subHours(2)->toIso8601String(),
        now()->addDay(),
    );

    $this->artisan('wellcare:scheduler:status')->assertFailed();
});

test('the threshold is adjustable for hosts that run the scheduler less often', function () {
    Cache::put(
        SchedulerHeartbeat::CACHE_KEY,
        now()->subHours(2)->toIso8601String(),
        now()->addDay(),
    );

    $this->artisan('wellcare:scheduler:status --stale-minutes=180')->assertSuccessful();
});

test('a cleared cache reads as stale rather than healthy', function () {
    $this->artisan('wellcare:scheduler:heartbeat')->assertSuccessful();
    Cache::flush();

    // The safe direction: report a possible problem rather than hide a real one.
    $this->artisan('wellcare:scheduler:status')->assertFailed();
});

test('the failure output names the commands that are silently not running', function () {
    Cache::forget(SchedulerHeartbeat::CACHE_KEY);

    $this->artisan('wellcare:scheduler:status')
        ->expectsOutputToContain('credentials:sweep')
        ->assertFailed();
});
