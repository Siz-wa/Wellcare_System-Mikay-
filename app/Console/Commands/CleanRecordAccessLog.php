<?php

namespace App\Console\Commands;

use App\Models\RecordAccessLog;
use Illuminate\Console\Command;

/**
 * ND-3 / AU-6 — bound the access log.
 *
 * `record_access_log` records who read whose chart, and it was created with no
 * retention at all, which is only half a decision. An unbounded log is a
 * permanent, ever-growing record of the reading habits of every member of staff
 * and of who has looked at every patient — a data-minimisation problem in its
 * own right, and one this table creates rather than solves if left to run.
 *
 * The period comes from config/retention.php and is shared with `activity_log`
 * (see config/activitylog.php), because both answer the same accountability
 * question about the same people.
 *
 * The counterpart of Spatie's `activitylog:clean`, which handles the other
 * table. Two commands rather than one because the two tables have different
 * owners — one is a package's, one is ours — and wrapping the package command
 * would break the day it changes.
 */
class CleanRecordAccessLog extends Command
{
    protected $signature = 'wellcare:access-log:clean {--dry-run : Report what would be removed and stop}';

    protected $description = 'Remove record access log entries older than the configured audit retention period';

    public function handle(): int
    {
        $years = (int) config('retention.audit_log_years');
        $cutoff = now()->subYears($years);

        $query = RecordAccessLog::where('created_at', '<', $cutoff);
        $count = $query->count();

        $this->info("Audit retention: {$years} years (cutoff {$cutoff->toDateString()}).");

        if ($count === 0) {
            $this->info('No access log entries are older than the cutoff.');

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->comment("{$count} entr(ies) would be removed. Nothing was deleted.");

            return self::SUCCESS;
        }

        // Chunked rather than one DELETE: this table is the highest-volume one
        // in the schema, and a single unbounded delete on a few years of it
        // would hold locks long enough to be felt by anyone using the app.
        $deleted = 0;

        do {
            $batch = $query->limit(1000)->delete();
            $deleted += $batch;
        } while ($batch > 0);

        $this->info("Removed {$deleted} access log entr(ies) older than {$cutoff->toDateString()}.");

        return self::SUCCESS;
    }
}
