<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Wipes the database and reseeds the clean demonstration dataset.
 *
 * The seeded record is the clinic as the stakeholders described it — the
 * roster, the service catalogue, patients with histories — and nothing typed
 * into the system while testing it. Appointment dates are relative to today,
 * so a reset the morning of a defense produces a schedule that is current
 * rather than one frozen on the day the data was captured.
 *
 * `wellcare.ps1 setup` runs this with --if-empty, so re-running setup on a
 * laptop that already holds a demo in progress never destroys it.
 */
class ResetDemoData extends Command
{
    protected $signature = 'wellcare:demo:reset
                            {--force : Do not ask for confirmation}
                            {--if-empty : Only seed when the database has no accounts yet}';

    protected $description = 'Wipe the database and reseed the clean demo dataset';

    /**
     * One account per role worth opening during a demonstration.
     *
     * @var array<int, array{0: string, 1: string, 2: string}>
     */
    private const LOGINS = [
        ['Patient', 'juan.dela.cruz@gmail.com', 'video consult ready today'],
        ['Patient', 'maria.santos@gmail.com', 'payment awaiting HR'],
        ['Patient', 'pedro.reyes@gmail.com', 'payment still owed'],
        ['Doctor', 'dr.reyes@wellcare.com', "Juan's video doctor"],
        ['Doctor', 'dr.santos@wellcare.com', ''],
        ['HR', 'hr.garcia@wellcare.com', 'LOA + payment queues'],
        ['Nurse', 'nurse.delacruz@wellcare.com', 'lab queue'],
        ['Admin', 'admin@wellcare.com', ''],
        ['Owner', 'owner@wellcare.com', ''],
        ['DPO', 'dpo@wellcare.com', 'audit trails'],
    ];

    public function handle(): int
    {
        if ($this->laravel->environment('production')) {
            $this->error('Refusing to wipe a production database.');

            return self::FAILURE;
        }

        if ($this->option('if-empty') && $this->hasAccounts()) {
            $this->info('The database already has accounts — left as it is.');
            $this->line('  Start over with: php artisan wellcare:demo:reset');

            return self::SUCCESS;
        }

        if (! $this->option('force')
            && ! $this->confirm('This deletes EVERYTHING in '.DB::connection()->getDatabaseName().' and reseeds the demo. Continue?')) {
            $this->line('Nothing changed.');

            return self::SUCCESS;
        }

        $status = $this->call('migrate:fresh', ['--seed' => true, '--force' => true]);

        if ($status !== self::SUCCESS) {
            return $status;
        }

        $this->call('optimize:clear');

        $this->newLine();
        $this->info('Demo data is ready. Every password: password123');
        $this->table(['Role', 'Email', 'Shows'], self::LOGINS);

        return self::SUCCESS;
    }

    private function hasAccounts(): bool
    {
        return Schema::hasTable('users') && DB::table('users')->exists();
    }
}
