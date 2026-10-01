<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Records that the scheduler is alive.
 *
 * ## Why this exists
 *
 * `routes/console.php` schedules four commands that matter and that nobody
 * watches: the retention purge report, the credential sweep that unpublishes a
 * doctor on the morning their PRC lapses, the access-log clean, and the stale
 * consultation-room closer. Every one of them fails the same way — silently.
 *
 * If cron is never installed, or the supervisor dies, or someone reboots the
 * server and forgets, nothing errors. No exception is thrown, no log line is
 * written, no screen changes. The credential sweep simply stops running and an
 * expired licence quietly stays bookable. That failure is invisible for exactly
 * as long as nobody thinks to check, which in a small clinic is indefinitely.
 *
 * A heartbeat converts "nothing happened" into "something is stale", which is a
 * condition a monitor can actually alarm on.
 *
 * ## Cache rather than a table
 *
 * `CACHE_STORE=database`, so this survives restarts and needs no migration.
 * A cleared cache reads as a stale heartbeat, which is the safe direction:
 * it reports a possible problem rather than hiding a real one.
 *
 * Paired with `wellcare:scheduler:status`, which reads this key and exits
 * non-zero when it is too old.
 */
class SchedulerHeartbeat extends Command
{
    protected $signature = 'wellcare:scheduler:heartbeat';

    protected $description = 'Record that the task scheduler ran (paired with wellcare:scheduler:status)';

    /**
     * Where the timestamp lives. Named in one place because two commands read
     * it and a typo in either would produce a permanently "dead" scheduler.
     */
    public const CACHE_KEY = 'wellcare:scheduler:last-run';

    /**
     * Kept far longer than any staleness threshold so the key never expires on
     * its own — an absent key must mean "the scheduler stopped", never "the
     * cache entry timed out while it was running fine".
     */
    public const TTL_DAYS = 30;

    public function handle(): int
    {
        Cache::put(
            self::CACHE_KEY,
            now()->toIso8601String(),
            now()->addDays(self::TTL_DAYS),
        );

        $this->info('Scheduler heartbeat recorded at '.now()->toDateTimeString().'.');

        return self::SUCCESS;
    }
}
