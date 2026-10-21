<?php

use Illuminate\Console\Scheduling\Schedule;

/**
 * Shared hosting runs cron and nothing else, so the scheduler is what sends
 * queued mail there. See the last entry in routes/console.php.
 */
function queueDrainEvent(): ?object
{
    return collect(app(Schedule::class)->events())
        ->first(fn ($event) => str_contains((string) $event->command, 'queue:work'));
}

it('drains the queue every minute and then exits', function () {
    $event = queueDrainEvent();

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('* * * * *')
        ->and($event->command)->toContain('--stop-when-empty')
        ->and($event->command)->toContain('--max-time=50');
});

it('never runs two drains at once, and frees the lock if one is killed', function () {
    $event = queueDrainEvent();

    expect($event->withoutOverlapping)->toBeTrue()
        ->and($event->expiresAt)->toBe(5);
});

it('runs after every other scheduled task', function () {
    $events = app(Schedule::class)->events();

    expect((string) end($events)->command)->toContain('queue:work');
});
