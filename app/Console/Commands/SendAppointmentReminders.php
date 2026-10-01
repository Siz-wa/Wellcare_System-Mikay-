<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Task 2.1 — the reminders the `reminder` enum has been reserved for since April.
 *
 * The value existed in `appointment_notifications.type` from the table's first
 * migration, was carried through four subsequent enum migrations, and was
 * dispatched from nowhere. Meanwhile `no_show` was recorded as a terminal state
 * with nothing anywhere trying to prevent one.
 *
 * ## Two tiers, and honest expectations
 *
 * Sent at roughly 48 hours and again on the morning of the appointment. Two
 * rather than one because a randomised comparison found two reminders beat one
 * for patients at high risk of missing.
 *
 * The effect is real but modest, and the clinic should be told so: the pooled
 * result across ten randomised trials is an 11% relative improvement in
 * attendance (RR 1.11, 95% CI 1.05–1.19). This is not a fix for no-shows, it is
 * a reduction in them.
 *
 * ## Idempotency
 *
 * Each tier is stamped on the appointment once sent. It is deliberately NOT
 * derived from whether a notification row exists — the in-app preference aborts
 * that row for anyone who reads reminders by SMS, so a derived check would
 * re-send every five minutes. See the migration for the full reasoning.
 *
 * ## What is reminded
 *
 * `confirmed` only. A `requested` appointment has not been accepted by the
 * doctor yet and reminding someone about a booking that may still be declined
 * is worse than saying nothing; `checked_in` and later are already at the
 * clinic. Cancelled and no-show are excluded by the same status filter.
 */
class SendAppointmentReminders extends Command
{
    protected $signature = 'wellcare:reminders:send
                            {--dry-run : List who would be reminded and send nothing.}';

    protected $description = 'Send 48-hour and same-day appointment reminders';

    /**
     * How far ahead the first reminder goes out.
     *
     * The window is generous on the near side (the sweep runs every fifteen
     * minutes, so anything between 36 and 48 hours out is caught) because the
     * alternative — an exact boundary — silently drops any appointment whose
     * moment fell between two sweeps.
     */
    private const AHEAD_MAX_HOURS = 48;

    private const AHEAD_MIN_HOURS = 36;

    /**
     * The same-day reminder goes to anything still upcoming today.
     *
     * Lower-bounded so a reminder is not sent for an appointment that has
     * already started — that message reads as a system error to the patient.
     */
    private const SAME_DAY_MIN_MINUTES = 60;

    public function handle(): int
    {
        $ahead = $this->dueForAheadReminder();
        $sameDay = $this->dueForSameDayReminder();

        if ($ahead->isEmpty() && $sameDay->isEmpty()) {
            $this->info('No appointments due a reminder.');

            return self::SUCCESS;
        }

        $this->report('48-hour', $ahead);
        $this->report('Same-day', $sameDay);

        if ($this->option('dry-run')) {
            $this->comment('Dry run — nothing was sent.');

            return self::SUCCESS;
        }

        $sent = 0;
        $sent += $this->send($ahead, 'reminded_ahead_at', ahead: true);
        $sent += $this->send($sameDay, 'reminded_same_day_at', ahead: false);

        $this->info("Sent {$sent} reminder(s).");

        return self::SUCCESS;
    }

    /** @return Collection<int, Appointment> */
    private function dueForAheadReminder(): Collection
    {
        return $this->remindable()
            ->whereNull('reminded_ahead_at')
            ->whereBetween('appointment_at', [
                now()->addHours(self::AHEAD_MIN_HOURS),
                now()->addHours(self::AHEAD_MAX_HOURS),
            ])
            ->get();
    }

    /** @return Collection<int, Appointment> */
    private function dueForSameDayReminder(): Collection
    {
        return $this->remindable()
            ->whereNull('reminded_same_day_at')
            ->whereDate('appointment_date', today())
            ->where('appointment_at', '>=', now()->addMinutes(self::SAME_DAY_MIN_MINUTES))
            ->get();
    }

    /** @return Builder<Appointment> */
    private function remindable(): Builder
    {
        return Appointment::query()
            ->where('status', 'confirmed')
            // A guest booking has no account, but it does carry the contact
            // details the person gave in order to be contacted about it —
            // DeliverNotification reads those off the appointment.
            ->whereNotNull('appointment_at');
    }

    /**
     * @param  Collection<int, Appointment>  $appointments
     */
    private function send(Collection $appointments, string $stampColumn, bool $ahead): int
    {
        foreach ($appointments as $appointment) {
            // Stamped BEFORE the notification is created, not after. Creating
            // the notification queues outbound delivery, and a failure between
            // the two would otherwise leave the appointment unstamped and
            // re-remind the patient on the next sweep — the one failure mode a
            // reminder system must not have.
            $appointment->forceFill([$stampColumn => now()])->save();

            if ($appointment->user_id === null && blank($appointment->email)) {
                continue;
            }

            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->user_id,
                'type' => 'reminder',
                'subject' => $ahead
                    ? 'Reminder: your appointment is in two days'
                    : 'Reminder: your appointment is today',
                'body' => $this->body($appointment, $ahead),
                'read' => false,
            ]);

            $this->line("  • Reminded appointment #{$appointment->id}.");
        }

        return $appointments->count();
    }

    private function body(Appointment $appointment, bool $ahead): string
    {
        $when = $ahead
            ? $appointment->appointment_date->format('l j F')." at {$appointment->appointment_time}"
            : "today at {$appointment->appointment_time}";

        $name = trim($appointment->first_name.' '.$appointment->last_name);

        return "{$name}'s appointment at WellCare Dasmariñas is {$when}. "
            .'If you can no longer attend, please cancel or call the clinic so the slot can be offered to someone else.';
    }

    /**
     * @param  Collection<int, Appointment>  $appointments
     */
    private function report(string $label, Collection $appointments): void
    {
        if ($appointments->isEmpty()) {
            return;
        }

        $this->line("{$label}: {$appointments->count()} appointment(s).");
    }
}
