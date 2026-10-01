<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\PaymentVerification;
use App\Services\BookingService;
use Illuminate\Console\Command;
use LogicException;

/**
 * Release the slot when a video consultation goes unpaid past its deadline.
 *
 * ## Why a deadline exists at all
 *
 * A held slot nobody pays for costs the clinic twice: another patient could not
 * book it, and the doctor sits through it. In the clinic that resolves itself —
 * the patient either turns up at the cashier or does not turn up at all, and
 * the front desk sees which by looking at the waiting room. A video consultation
 * has no waiting room to look at, so the deadline is the only signal there is.
 *
 * Three hours is the default (`payments.settlement_deadline_hours`), which is
 * what DigiHealth gives a patient before auto-cancelling an unpaid teleconsult
 * request.
 *
 * ## What this deliberately does NOT touch
 *
 * - **`submitted` rows.** The patient has done their part and is waiting on the
 *   clinic; cancelling them for the clinic's own backlog would be punishing the
 *   patient for staff response time. They stay in the queue past the deadline
 *   and an officer decides them.
 * - **Anything already in progress.** cancelAppointment() refuses a checked-in
 *   or later visit, and this catches that refusal rather than forcing past it:
 *   a patient standing in a live consultation has plainly been let in by
 *   someone, and a cron job is not the thing to overrule that.
 *
 * ## Why it cancels through BookingService
 *
 * The same reason CloseStaleConsultationRooms ends calls through the service
 * rather than with a bulk UPDATE: cancelAppointment() busts the slot cache, so
 * the freed slot is bookable within the minute instead of after the 60-second
 * TTL of a cache nobody invalidated. A bulk UPDATE would free the slot in the
 * database and leave it invisible to the booking form.
 */
class SweepUnsettledPayments extends Command
{
    protected $signature = 'wellcare:payments:sweep
                            {--dry-run : Report what would be cancelled and change nothing}';

    protected $description = 'Cancel video consultations whose settlement deadline passed unpaid, and free the slot';

    public function handle(BookingService $bookings): int
    {
        $dryRun = (bool) $this->option('dry-run')
            || ! config('payments.auto_cancel_unsettled');

        $overdue = PaymentVerification::unsettled()
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->whereHas('appointment', fn ($query) => $query
                ->whereNotIn('status', Appointment::RELEASED_STATUSES)
                ->where('status', '!=', 'completed')
            )
            ->with('appointment')
            ->get();

        if ($overdue->isEmpty()) {
            $this->info('No unsettled video consultations are past their deadline.');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn(sprintf(
                '%d unsettled consultation(s) are past their deadline. Nothing was changed (%s).',
                $overdue->count(),
                $this->option('dry-run') ? '--dry-run' : 'payments.auto_cancel_unsettled is false',
            ));

            foreach ($overdue as $payment) {
                $this->line(sprintf(
                    '  %s — ₱%s due %s (appointment #%d, %s)',
                    $payment->payment_reference,
                    number_format((float) $payment->amount_due, 2),
                    $payment->due_at->toDateTimeString(),
                    $payment->appointment_id,
                    $payment->appointment?->status ?? 'missing',
                ));
            }

            return self::SUCCESS;
        }

        $cancelled = 0;
        $skipped = 0;

        foreach ($overdue as $payment) {
            $appointment = $payment->appointment;

            if ($appointment === null) {
                $skipped++;

                continue;
            }

            try {
                $bookings->cancelAppointment(
                    $appointment,
                    'Cancelled automatically — the consultation fee was not settled before the deadline.',
                );
            } catch (LogicException $e) {
                // Already checked in or further along. Someone let this patient
                // through deliberately; leave the visit alone and say so rather
                // than failing the whole sweep over one row.
                $this->line("  skipped {$payment->payment_reference}: {$e->getMessage()}");
                $skipped++;

                continue;
            }

            $this->notifyPatient($payment);
            $cancelled++;
        }

        $this->info(sprintf(
            'Cancelled %d unsettled consultation(s); skipped %d.',
            $cancelled,
            $skipped,
        ));

        return self::SUCCESS;
    }

    /**
     * Tell the patient why the slot went away.
     *
     * Writes to appointment_notifications directly, as the services do — the
     * bell reads that table, not the stock `notifications` one (see CLAUDE.md).
     * Reuses the `cancelled` type rather than inventing a payment-specific one:
     * from the patient's side this IS a cancellation, and the body carries the
     * reason.
     */
    private function notifyPatient(PaymentVerification $payment): void
    {
        if (! $payment->user_id) {
            return;
        }

        $amount = number_format((float) $payment->amount_due, 2);

        AppointmentNotification::create([
            'appointment_id' => $payment->appointment_id,
            'user_id' => $payment->user_id,
            'type' => 'cancelled',
            'subject' => 'Video Consultation Cancelled — Unpaid',
            'body' => "Your video consultation was cancelled because the ₱{$amount} fee ({$payment->payment_reference}) was not settled before the deadline. You can book again at any time.",
            'read' => false,
        ]);
    }
}
