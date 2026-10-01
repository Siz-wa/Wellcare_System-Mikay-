<?php

namespace App\Console\Commands;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Reports whether the task scheduler is actually running.
 *
 * Reads the timestamp written by `wellcare:scheduler:heartbeat` and exits
 * non-zero when it is missing or too old, so any external monitor — a cron
 * wrapper, an uptime check, a person running it by hand before go-live — can
 * tell the difference between a healthy scheduler and one that stopped weeks
 * ago.
 *
 * This is the check that answers the question `routes/console.php` raises in
 * its own comments: it says the scheduled commands are "documentation of intent
 * until one is running", and until now there was no way to find out which.
 *
 * ## Exit codes
 *
 * `SUCCESS` when a heartbeat exists and is recent, `FAILURE` otherwise. Deliberately
 * blunt: a monitor should not have to parse output to learn that the credential
 * sweep has not run since March.
 */
class SchedulerStatus extends Command
{
    protected $signature = 'wellcare:scheduler:status
                            {--stale-minutes=30 : Age at which the heartbeat is treated as dead.}';

    protected $description = 'Report whether the task scheduler has run recently';

    public function handle(): int
    {
        $recorded = Cache::get(SchedulerHeartbeat::CACHE_KEY);

        if (! is_string($recorded) || $recorded === '') {
            $this->error('No scheduler heartbeat has ever been recorded.');
            $this->line('The scheduler is not running, or has not run since the cache was last cleared.');
            $this->newLine();
            $this->comment('Every scheduled command in routes/console.php is inert until this is fixed:');
            $this->line('  • wellcare:records:purge      — retention report');
            $this->line('  • credentials:sweep           — unpublishes lapsed PRC/PTR holders');
            $this->line('  • wellcare:access-log:clean   — audit-log retention');
            $this->line('  • consultations:close-stale   — closes abandoned video rooms');

            return self::FAILURE;
        }

        $lastRun = CarbonImmutable::parse($recorded);
        $threshold = (int) $this->option('stale-minutes');
        $age = $lastRun->diffInMinutes(now());

        if ($age > $threshold) {
            $this->error("Scheduler last ran {$lastRun->diffForHumans()} ({$lastRun->toDateTimeString()}).");
            $this->line("That is older than the {$threshold}-minute threshold — treat the scheduler as stopped.");

            return self::FAILURE;
        }

        $this->info("Scheduler is alive. Last run {$lastRun->diffForHumans()} ({$lastRun->toDateTimeString()}).");

        return self::SUCCESS;
    }
}
