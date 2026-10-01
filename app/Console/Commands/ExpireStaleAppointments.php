<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Services\AppointmentCancellationService;
use Illuminate\Console\Command;

/**
 * Close appointments whose visit date has passed without the visit happening.
 *
 * Nothing did this before, so a "requested" booking from three weeks ago still
 * sat in the doctor's confirmation queue and a patient who checked in and was
 * never seen stayed "checked in" forever, cluttering every queue and every
 * count built from them.
 *
 *  - requested / pending HMO approval, date passed → cancelled (nobody confirmed
 *    it in time), with the patient notified through the normal cancellation path.
 *  - confirmed, date passed → no_show (the patient never checked in).
 *  - checked in, date passed → cancelled with a reason saying so, because the
 *    patient did come and "no show" would be untrue.
 *
 * In-progress consultations are left alone: a doctor may still be finishing
 * the note, and closing it would lose clinical work. They are reported instead.
 */
class ExpireStaleAppointments extends Command
{
    protected $signature = 'wellcare:appointments:expire-stale
                            {--dry-run : Report what would change and change nothing}';

    protected $description = 'Close appointments whose date passed without the visit taking place';

    public function handle(AppointmentCancellationService $cancellations): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $before = today()->toDateString();

        $unconfirmed = Appointment::whereIn('status', ['requested', 'pending_hmo_approval'])
            ->whereDate('appointment_date', '<', $before)
            ->get();

        $noShows = Appointment::where('status', 'confirmed')
            ->whereDate('appointment_date', '<', $before)
            ->get();

        $neverSeen = Appointment::where('status', 'checked_in')
            ->whereDate('appointment_date', '<', $before)
            ->get();

        $openNotes = Appointment::where('status', 'in_progress')
            ->whereDate('appointment_date', '<', $before)
            ->count();

        $this->info(sprintf(
            '%s %d unconfirmed, %d no-shows, %d checked in but never seen. %d past consultations are still open and were left alone.',
            $dryRun ? 'Would close' : 'Closed',
            $unconfirmed->count(),
            $noShows->count(),
            $neverSeen->count(),
            $openNotes,
        ));

        if ($dryRun) {
            return self::SUCCESS;
        }

        foreach ($unconfirmed as $appointment) {
            $cancellations->cancel(
                $appointment,
                'Not confirmed before the visit date',
                AppointmentCancellationService::BY_CLINIC,
            );
        }

        foreach ($noShows as $appointment) {
            $appointment->update(['status' => 'no_show']);
        }

        foreach ($neverSeen as $appointment) {
            $appointment->update([
                'status' => 'cancelled',
                'cancellation_reason' => 'Checked in, but the consultation was never started',
                'cancelled_at' => now(),
            ]);
        }

        return self::SUCCESS;
    }
}
