<?php

namespace App\Console\Commands;

use App\Models\Patient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * The one supported way past the retention floor — SC-1(d) / RET-5.
 *
 * See config/retention.php for the period and App\Concerns\ProtectsRetainedRecords
 * for the guard this command is the exception to.
 *
 * ## Reports by default, destroys only under protest
 *
 * Running it bare prints what *would* go and changes nothing. Actually removing
 * anything needs **both** `RETENTION_PURGE_ENABLED=true` in the environment and
 * `--force` on the command line. Two independent locks, because this is the only
 * code in the application that permanently destroys a medical record and the
 * cost of running it by accident is not recoverable.
 *
 * That is also why it is not scheduled to run destructively. `routes/console.php`
 * schedules the *report* — a monthly note of what has become eligible, which a
 * human then decides about. A cron job that silently erases patient records on a
 * timer is precisely the "cleanup job touching patient tables" that finding
 * RET-4 was checking for.
 */
class PurgeExpiredRecords extends Command
{
    protected $signature = 'wellcare:records:purge
                            {--force : Actually delete. Also requires RETENTION_PURGE_ENABLED=true.}';

    protected $description = 'Report (or, with --force, permanently remove) patient records whose retention period has lapsed';

    public function handle(): int
    {
        $this->reportConfiguredPeriods();

        // withTrashed(): an archived patient is still retained. Archiving hides a
        // record, it does not start a shorter clock.
        $expired = Patient::withTrashed()
            ->get()
            ->filter(fn (Patient $patient) => $patient->retentionPeriodHasElapsed());

        if ($expired->isEmpty()) {
            $this->info('Nothing has passed its retention period. No action taken.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Clinic ID', 'Name', 'Retention expired', 'Archived'],
            $expired->map(fn (Patient $patient) => [
                $patient->id,
                $patient->clinic_id,
                $patient->full_name,
                $patient->retentionExpiresAt()?->toDateString() ?? '—',
                $patient->trashed() ? 'yes' : 'no',
            ])->all(),
        );

        if (! $this->option('force')) {
            $this->newLine();
            $this->comment($expired->count().' record(s) are eligible. Nothing was deleted.');
            $this->comment('Re-run with --force (and RETENTION_PURGE_ENABLED=true) to remove them.');

            return self::SUCCESS;
        }

        if (! config('retention.purge_enabled')) {
            $this->error('--force was given but RETENTION_PURGE_ENABLED is not true. Nothing was deleted.');
            $this->comment('Both locks must be off. This is deliberate — see config/retention.php.');

            return self::FAILURE;
        }

        $count = 0;

        foreach ($expired as $patient) {
            DB::transaction(function () use ($patient, &$count) {
                // Documents first: the rows cascade with the patient, but the
                // FILES do not, and an orphaned blob of imaging on disk is the
                // one thing a database purge cannot reach afterwards.
                foreach ($patient->documents()->withTrashed()->get() as $document) {
                    Storage::disk('local')->delete($document->file_path);
                }

                $patient->forceDeleteIgnoringRetention();
                $count++;
            });

            $this->line("Purged patient #{$patient->id} ({$patient->clinic_id}).");
        }

        $this->newLine();
        $this->info("Permanently removed {$count} record(s).");

        return self::SUCCESS;
    }

    /**
     * Print every configured period with the source it came from.
     *
     * The sources are printed, not just the numbers, because none of them has
     * been verified against a primary DOH document — and an operator about to
     * pass --force is the last person who can catch a wrong figure before it
     * destroys records. A number shown without its provenance invites trust it
     * has not yet earned.
     */
    private function reportConfiguredPeriods(): void
    {
        $sources = (array) config('retention.sources', []);

        $this->info('Configured retention periods, counted from the last encounter:');

        $this->table(
            ['Record class', 'Years', 'Basis — ALL UNVERIFIED'],
            collect((array) config('retention.periods', []))
                ->map(fn (int $years, string $key) => [
                    $key,
                    $years,
                    $sources[$key] ?? 'No source recorded.',
                ])
                ->values()
                ->all(),
        );

        $this->warn('These figures have NOT been confirmed against primary DOH sources.');
        $this->warn('Confirm them with the clinic DPO before enabling the purge.');
        $this->newLine();
    }
}
