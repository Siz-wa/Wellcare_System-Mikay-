<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\PaymentVerification;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The one way an appointment gets cancelled.
 *
 * Four code paths used to cancel appointments, and each did a different subset
 * of the job: the patient dashboard only flipped the status (while its dialog
 * promised "your doctor is notified"), doctor time-off bulk-updated whole days
 * without telling a single patient, and the admin out-of-office action
 * cancelled only `requested` rows. Every path now comes through here, so the
 * other party is always told and a fee that was already paid is always put in
 * front of the cashier.
 */
class AppointmentCancellationService
{
    /** Who initiated the cancellation, which decides who must be told. */
    public const BY_PATIENT = 'patient';

    public const BY_DOCTOR = 'doctor';

    public const BY_CLINIC = 'clinic';

    /** Statuses that can still be cancelled. */
    public const CANCELLABLE = ['pending_hmo_approval', 'requested', 'confirmed'];

    /**
     * The FAQ's late-cancellation line: inside this many hours of the visit, a
     * pre-paid fee may be forfeited. The cancellation is still allowed.
     */
    public const LATE_CANCELLATION_HOURS = 24;

    public function __construct(private BookingService $booking) {}

    /**
     * Cancel one appointment and tell whoever needs to know.
     *
     * @throws \LogicException when the appointment is past the point of cancelling
     */
    public function cancel(Appointment $appointment, string $reason, string $by): Appointment
    {
        if (! in_array($appointment->status, self::CANCELLABLE, true)) {
            throw new \LogicException('This appointment can no longer be cancelled.');
        }

        DB::transaction(function () use ($appointment, $reason) {
            $appointment->update([
                'status' => 'cancelled',
                'cancellation_reason' => $reason,
                'cancelled_at' => now(),
            ]);
        });

        if ($appointment->doctor_id) {
            $this->booking->bustDoctorSlotCache($appointment->doctor_id);
        }

        $refund = $this->flagPaidFee($appointment, $by);

        if ($by === self::BY_PATIENT) {
            $this->notifyDoctor($appointment, $reason);
        } else {
            $this->notifyPatient($appointment, $reason, $refund);
        }

        return $appointment->fresh();
    }

    /**
     * Cancel every open appointment a doctor has on a date (time off / out of
     * office), notifying each patient individually.
     *
     * @return Collection<int, Appointment> the appointments cancelled
     */
    public function cancelDay(int $doctorId, string $date, string $reason): Collection
    {
        return Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->whereIn('status', self::CANCELLABLE)
            ->get()
            ->map(fn (Appointment $appointment) => $this->cancel($appointment, $reason, self::BY_DOCTOR));
    }

    /** Whether a cancellation now falls inside the late-cancellation window. */
    public function isLate(Appointment $appointment): bool
    {
        $at = $appointment->appointment_at;

        return $at instanceof CarbonInterface
            && now()->diffInHours($at, false) < self::LATE_CANCELLATION_HOURS;
    }

    /**
     * Put a settled fee in front of the cashier. A pending or submitted fee is
     * left alone: the payment sweep and HR queue ignore released appointments.
     *
     * @return PaymentVerification|null the paid fee that now needs a decision
     */
    private function flagPaidFee(Appointment $appointment, string $by): ?PaymentVerification
    {
        $payment = PaymentVerification::where('appointment_id', $appointment->id)
            ->where('status', 'verified')
            ->where('amount_paid', '>', 0)
            ->first();

        if (! $payment) {
            return null;
        }

        $late = $by === self::BY_PATIENT && $this->isLate($appointment);
        $who = trim("{$appointment->first_name} {$appointment->last_name}") ?: 'A patient';
        $amount = number_format((float) $payment->amount_paid, 2);
        $body = "{$payment->payment_reference}: {$who}'s appointment was cancelled by the {$by} after ₱{$amount} was paid."
            .($late
                ? ' The patient cancelled within '.self::LATE_CANCELLATION_HOURS.' hours of the visit, so the fee may be forfeited under clinic policy.'
                : ' Arrange a refund or a credit toward a new booking.');

        foreach (User::role('hr')->get() as $officer) {
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $officer->id,
                'type' => 'refund_due',
                'subject' => 'Refund Decision Needed',
                'body' => $body,
                'read' => false,
            ]);
        }

        return $payment;
    }

    private function notifyDoctor(Appointment $appointment, string $reason): void
    {
        if (! $appointment->doctor_id) {
            return;
        }

        $who = trim("{$appointment->first_name} {$appointment->last_name}") ?: 'Your patient';

        AppointmentNotification::create([
            'appointment_id' => $appointment->id,
            'user_id' => $appointment->doctor_id,
            'type' => 'cancelled',
            'subject' => 'Appointment Cancelled by Patient',
            'body' => "{$who} cancelled their appointment on {$this->when($appointment)}. The slot is open again. Reason: {$reason}.",
            'read' => false,
        ]);
    }

    private function notifyPatient(Appointment $appointment, string $reason, ?PaymentVerification $refund): void
    {
        if (! $appointment->user_id) {
            return;
        }

        $body = "Your appointment on {$this->when($appointment)} has been cancelled. Reason: {$reason}. Please book a new appointment at your convenience.";

        if ($refund) {
            $body .= ' The clinic will contact you about the ₱'.number_format((float) $refund->amount_paid, 2)." you paid ({$refund->payment_reference}).";
        }

        AppointmentNotification::create([
            'appointment_id' => $appointment->id,
            'user_id' => $appointment->user_id,
            'type' => 'cancelled',
            'subject' => 'Your appointment has been cancelled',
            'body' => $body,
            'read' => false,
        ]);
    }

    private function when(Appointment $appointment): string
    {
        return $appointment->appointment_date->format('F j, Y').' at '.$appointment->appointment_time;
    }
}
