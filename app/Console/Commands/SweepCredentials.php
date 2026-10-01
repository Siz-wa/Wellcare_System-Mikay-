<?php

namespace App\Console\Commands;

use App\Models\StaffCredential;
use App\Services\CredentialingService;
use Illuminate\Console\Command;

/**
 * Withdraw clearance from anyone whose PRC or PTR has lapsed.
 *
 * This command is what makes the expiry dates mean something. A PRC
 * registration is valid for three years and expires on the holder's birthday; a
 * PTR is annual. Practising on a lapsed licence is illegal, so the system stops
 * offering that person to patients rather than showing a warning somebody has
 * to notice and act on.
 *
 * Scheduled daily in routes/console.php. Safe to run by hand and safe to run
 * twice — sweepExpired() only matches credentials still marked verified, so a
 * second run in the same day finds nothing.
 */
class SweepCredentials extends Command
{
    protected $signature = 'credentials:sweep';

    protected $description = 'Expire lapsed PRC/PTR credentials and unpublish the staff holding them';

    public function handle(CredentialingService $credentialing): int
    {
        $withdrawn = $credentialing->sweepExpired();

        if ($withdrawn === []) {
            $this->info('No lapsed credentials. Nothing to withdraw.');
        } else {
            $this->warn('Withdrew clearance from '.count($withdrawn).' staff member(s):');

            foreach ($withdrawn as $name) {
                $this->line("  • {$name}");
            }
        }

        // The renewal watchlist. Reported even when nothing was withdrawn,
        // because the useful moment to act is before the licence lapses.
        $expiring = StaffCredential::expiringWithin()->with('user')->get();

        if ($expiring->isNotEmpty()) {
            $this->newLine();
            $this->comment(
                $expiring->count().' credential(s) lapse within '
                .StaffCredential::EXPIRY_WARNING_DAYS.' days:'
            );

            foreach ($expiring as $credential) {
                $days = $credential->daysUntilExpiry();
                $this->line("  • {$credential->user?->name} — {$days} day(s) remaining");
            }
        }

        return self::SUCCESS;
    }
}
