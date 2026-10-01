<?php

namespace App\Console\Commands;

use App\Jobs\DeliverNotification;
use App\Models\AppointmentNotification;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Task 1.3 — re-raise a critical lab result nobody has acknowledged.
 *
 * ## The gap this closes
 *
 * A critical value alerts the requesting doctor the moment the nurse records
 * it. If that doctor is off shift, on leave, or simply not looking, nothing
 * further happened: the notification sat unread and the system reported the
 * same state as one acted on immediately.
 *
 * The Joint Commission's Quick Safety 52 describes closed-loop communication as
 * a result that is sent, received, acknowledged and acted upon. The first was
 * built; this adds the rest.
 *
 * ## Escalation widens rather than repeats
 *
 * Re-notifying the same doctor who has already not responded is not
 * escalation. Each pass also raises the alert to the on-duty clinical staff —
 * nurses and administrators — because the point is to reach *somebody* who can
 * act, not to keep knocking on one door.
 *
 * Bounded at MAX_ESCALATIONS. An alert that repeats forever teaches people to
 * mute the channel it arrives on, and `lab_critical` is the one notification
 * type that cannot be muted. After the bound it remains outstanding on the
 * dashboard rather than continuing to interrupt.
 */
class EscalateCriticalResults extends Command
{
    protected $signature = 'wellcare:results:escalate
                            {--dry-run : List what would be escalated and change nothing.}';

    protected $description = 'Re-raise critical lab results that no clinician has acknowledged';

    public function handle(): int
    {
        $pending = AppointmentNotification::query()
            ->awaitingAcknowledgement()
            ->orderBy('created_at')
            ->get();

        if ($pending->isEmpty()) {
            $this->info('No unacknowledged critical results. Nothing to escalate.');

            return self::SUCCESS;
        }

        $this->warn($pending->count().' critical result(s) awaiting acknowledgement:');

        $this->table(
            ['ID', 'Raised', 'Waiting', 'Escalations', 'Subject'],
            $pending->map(fn (AppointmentNotification $n) => [
                $n->id,
                $n->created_at?->toDateTimeString(),
                $n->created_at?->diffForHumans(null, true),
                $n->escalation_count.' of '.AppointmentNotification::MAX_ESCALATIONS,
                $n->subject,
            ])->all(),
        );

        if ($this->option('dry-run')) {
            $this->comment('Dry run — nothing was sent.');

            return self::SUCCESS;
        }

        $recipients = $this->escalationRecipients();

        if ($recipients->isEmpty()) {
            // Not a silent no-op: if there is nobody to escalate to, that is
            // itself the finding, and the command must say so rather than
            // report success having done nothing.
            $this->error('No nurse or admin accounts to escalate to. Nothing was sent.');

            return self::FAILURE;
        }

        foreach ($pending as $notification) {
            $this->escalate($notification, $recipients);
        }

        $this->info('Escalated '.$pending->count().' result(s) to '.$recipients->count().' staff account(s).');

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, User>  $recipients
     */
    private function escalate(AppointmentNotification $notification, $recipients): void
    {
        DB::transaction(function () use ($notification, $recipients) {
            $waited = $notification->created_at?->diffForHumans(null, true) ?? 'some time';

            foreach ($recipients as $recipient) {
                // Delivered directly rather than through
                // AppointmentNotification::create(), because a second row per
                // recipient per pass would bury the original in the bell — and
                // the original is the one that has to be acknowledged.
                DeliverNotification::dispatch(
                    userId: $recipient->id,
                    type: 'lab_critical',
                    subject: 'UNACKNOWLEDGED critical lab result',
                    body: "A critical result has been waiting {$waited} with no clinician acknowledgement: {$notification->subject}",
                    contactNumber: null,
                    email: $recipient->email,
                );
            }

            $notification->forceFill([
                'escalation_count' => $notification->escalation_count + 1,
                'escalated_at' => now(),
            ])->save();
        });

        $this->line("  • Escalated notification #{$notification->id}.");
    }

    /**
     * Who a stalled critical result goes to.
     *
     * Nurses and admins: the accounts that are reliably on site during clinic
     * hours and can physically find a clinician. Deliberately not "every
     * doctor" — broadcasting a patient's critical result to the whole medical
     * staff is a disclosure, and the message names the test.
     *
     * @return Collection<int, User>
     */
    private function escalationRecipients()
    {
        return User::role(['nurse', 'admin'])
            ->where('is_active', true)
            ->get();
    }
}
