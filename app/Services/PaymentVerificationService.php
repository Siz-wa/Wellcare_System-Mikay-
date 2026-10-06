<?php

namespace App\Services;

use App\Exceptions\InvalidPaymentTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\PaymentVerification;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Every settlement transition for a video consultation lives here, not in
 * controllers — the same split LoaService, BookingService and LabResultService
 * use.
 *
 *   raise()    → status 'pending',   the fee is owed and the patient is told
 *   submit()   → status 'submitted', the patient declares a remittance
 *   verify()   → status 'verified',  staff confirms it against clinic records
 *   reject()   → status 'rejected',  nothing matching found; patient may retry
 *   waive()    → status 'waived',    the clinic chooses not to collect
 *
 * ## What this class is not
 *
 * It is not a payment gateway and it never becomes one. No method here contacts
 * GCash, Maya, a bank or a processor, and none of them ever should — the clinic
 * already has accounts that receive money and a cashier who takes it. What was
 * missing was any record that a video consultation was owed for, and any point
 * at which someone checked. Both of those are bookkeeping, and bookkeeping is
 * what this does.
 *
 * ## Why verification is a human step
 *
 * `submit()` records a CLAIM: a reference number the patient typed off a
 * receipt. `verify()` records a FINDING: a staff member matched that claim
 * against the clinic's own GCash or bank statement. Collapsing the two — trusting
 * the claim — would make the reference field a password anyone could guess, and
 * a consultation would be free to anyone who typed thirteen digits. The gate
 * therefore reads `verified`, never `submitted`.
 */
class PaymentVerificationService
{
    public function __construct(private PaymentProofStorage $proofs) {}

    /**
     * Raise the fee for a virtual self-pay booking.
     *
     * Called from BookingService inside the booking transaction, so an
     * appointment that owes money and the record of that debt are created
     * together or not at all — the same guarantee LoaService::submit() gives an
     * HMO booking.
     *
     * Returns null, rather than throwing, for every booking that owes nothing:
     * an in-person visit (the cashier handles it, as it always has) or one
     * covered by an HMO, PhilHealth or a corporate account (the coverage pays,
     * and LoaService already governs that path). Callers can therefore call
     * this unconditionally.
     */
    public function raise(Appointment $appointment): ?PaymentVerification
    {
        if (! $this->isPayable($appointment)) {
            return null;
        }

        $payment = PaymentVerification::create([
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'user_id' => $appointment->user_id,
            'status' => 'pending',
            'amount_due' => $this->feeFor($appointment),
            'due_at' => $this->deadlineFor($appointment),
        ]);

        $this->notifyPatient($payment, 'payment_due');

        return $payment;
    }

    /**
     * The patient declares what they sent, and how.
     *
     * Re-submission after a rejection is deliberately allowed: a rejected
     * payment is usually a mistyped reference, and making the patient re-book
     * over a typo would cost them the slot. The superseded proof is deleted
     * rather than orphaned on disk.
     *
     * @throws InvalidPaymentTransitionException
     */
    public function submit(
        PaymentVerification $payment,
        string $method,
        float $amountPaid,
        string $remittanceReference,
        ?UploadedFile $proof = null,
    ): PaymentVerification {
        $this->guardSubmittable($payment);

        return DB::transaction(function () use ($payment, $method, $amountPaid, $remittanceReference, $proof) {
            $attributes = [
                'status' => 'submitted',
                'method' => $method,
                'amount_paid' => $amountPaid,
                'remittance_reference' => $remittanceReference,
                'submitted_at' => now(),
                // Clear the previous decision. Without this a re-submission
                // after a rejection would carry the old rejection timestamp and
                // the old officer's remarks, and the queue would render a row
                // that reads as both pending and already refused.
                'rejected_at' => null,
                'remarks' => null,
            ];

            if ($proof !== null) {
                $this->proofs->delete($payment);

                $attributes['proof_path'] = $this->proofs->store($proof, $payment->appointment_id);
                $attributes['proof_name'] = $proof->getClientOriginalName();
                $attributes['proof_mime'] = $proof->getMimeType();
            }

            $payment->update($attributes);

            $this->notifyStaff($payment);

            return $payment->fresh();
        });
    }

    /**
     * Staff matched the remittance against the clinic's own records.
     *
     * This is the transition that opens the video room — see
     * ConsultationSessionService::openVirtualRoom(), gate G5.
     *
     * @throws InvalidPaymentTransitionException
     */
    public function verify(
        PaymentVerification $payment,
        User $verifier,
        ?string $remarks = null,
    ): PaymentVerification {
        $this->guardDecidable($payment);

        return DB::transaction(function () use ($payment, $verifier, $remarks) {
            $payment->update([
                'status' => 'verified',
                'verified_by' => $verifier->id,
                'verified_at' => now(),
                'rejected_at' => null,
                'remarks' => $remarks,
            ]);

            $this->notifyPatient($payment->fresh(), 'payment_verified');

            return $payment->fresh();
        });
    }

    /**
     * Staff found nothing matching, or the wrong amount.
     *
     * Unlike LoaService::reject() this does NOT cancel the appointment. A
     * declined LOA means the insurer will not cover the visit and there is
     * nothing to wait for; a reference number that does not match is usually a
     * typo, and the patient still has until `due_at` to correct it. The sweeper
     * cancels if that deadline passes — one place decides that, not two.
     *
     * @throws InvalidPaymentTransitionException
     */
    public function reject(
        PaymentVerification $payment,
        User $verifier,
        string $remarks,
    ): PaymentVerification {
        $this->guardDecidable($payment);

        return DB::transaction(function () use ($payment, $verifier, $remarks) {
            $payment->update([
                'status' => 'rejected',
                'verified_by' => $verifier->id,
                'rejected_at' => now(),
                'verified_at' => null,
                'remarks' => $remarks,
            ]);

            $this->notifyPatient($payment->fresh(), 'payment_rejected');

            return $payment->fresh();
        });
    }

    /**
     * Cash handed to the cashier at the branch, recorded by the cashier.
     *
     * ## Why this is one step and not submit() then verify()
     *
     * Everywhere else the two are deliberately separate: a patient makes a
     * CLAIM and a staff member independently FINDS it in the clinic's records.
     * Over the counter there is nothing to find. The person recording this
     * took the notes, counted them, and issued the Official Receipt — the
     * collection and the verification are the same act, by the same person, at
     * the same moment. Splitting them would leave a row that says "a cashier
     * says a cashier was paid, pending confirmation by a cashier".
     *
     * This is also the answer to the question the module exists for. A video
     * consultation cannot be paid in cash *at the consultation* — but it can be
     * paid in cash at the clinic beforehand, by the patient or by anyone acting
     * for them, which is what St. Luke's Extension Clinic does and what a
     * patient without GCash or a bank account needs. Without this method that
     * path would require the patient to log in and type their own OR number,
     * which is exactly the person least likely to be able to.
     *
     * @throws InvalidPaymentTransitionException
     */
    public function recordCounterPayment(
        PaymentVerification $payment,
        User $cashier,
        float $amountPaid,
        string $officialReceiptNumber,
        ?string $remarks = null,
    ): PaymentVerification {
        $this->guardCollectable($payment);

        return DB::transaction(function () use ($payment, $cashier, $amountPaid, $officialReceiptNumber, $remarks) {
            $payment->update([
                'status' => 'verified',
                'method' => 'otc_cash',
                'amount_paid' => $amountPaid,
                'remittance_reference' => $officialReceiptNumber,
                'submitted_at' => $payment->submitted_at ?? now(),
                'verified_by' => $cashier->id,
                'verified_at' => now(),
                'rejected_at' => null,
                'remarks' => $remarks,
            ]);

            $this->notifyPatient($payment->fresh(), 'payment_verified');

            return $payment->fresh();
        });
    }

    /**
     * The clinic chooses not to collect — goodwill, a staff dependant, or a
     * re-consult on a visit already paid for.
     *
     * Settles the record without any remittance, and takes a reason, because
     * "why was this consultation free?" is the first question an audit asks.
     *
     * Allowed from any unsettled state including `submitted`: a patient who
     * remitted and is then waived gets their money back at the counter, and the
     * clinical gate should not hold them while that is sorted out.
     *
     * @throws InvalidPaymentTransitionException
     */
    public function waive(
        PaymentVerification $payment,
        User $verifier,
        string $remarks,
    ): PaymentVerification {
        if ($payment->status === 'waived') {
            throw new InvalidPaymentTransitionException('This consultation fee has already been waived.');
        }

        if ($payment->status === 'verified') {
            throw new InvalidPaymentTransitionException('This consultation has already been paid, so there is nothing to waive.');
        }

        return DB::transaction(function () use ($payment, $verifier, $remarks) {
            $payment->update([
                'status' => 'waived',
                'verified_by' => $verifier->id,
                'verified_at' => now(),
                'rejected_at' => null,
                'remarks' => $remarks,
            ]);

            $this->notifyPatient($payment->fresh(), 'payment_verified');

            return $payment->fresh();
        });
    }

    // ── Pricing ───────────────────────────────────────────────────────────────

    /**
     * Does this booking owe the clinic anything up front?
     *
     * A video consultation not covered by an approved HMO LOA. In practice that
     * is a self-payer: booking refuses PhilHealth and corporate over video (see
     * BookAppointmentRequest::VIRTUAL_COVERAGES). Everything else is already
     * handled — an in-person visit by the cashier and front desk standing
     * between the patient and the doctor, an HMO visit by the LOA workflow.
     */
    public function isPayable(Appointment $appointment): bool
    {
        return $appointment->requiresPaymentBeforeConsultation();
    }

    /**
     * What the clinic charges for this service over video.
     *
     * Reads the price an administrator set at /admin/services, falling back to
     * `payments.default_fee` when the catalogue has no virtual price for it.
     * The fee is snapshotted onto the record by raise(); this is only consulted
     * at that moment.
     */
    public function feeFor(Appointment $appointment): float
    {
        $fee = Service::where('slug', $appointment->service)->value('virtual_fee');

        return $fee !== null
            ? (float) $fee
            : (float) config('payments.default_fee');
    }

    /**
     * The moment the money must be in: the configured number of hours before
     * the visit starts.
     *
     * Clamped to "not in the past". The booking rules allow a visit two hours
     * out (BookingService's minimum lead time) while the settlement window
     * defaults to three, so a legitimately booked same-day appointment would
     * otherwise be created already overdue and swept before the patient
     * finished reading the instructions. Such a booking gets until its own
     * start time instead.
     */
    public function deadlineFor(Appointment $appointment): CarbonInterface
    {
        $start = $appointment->startsAt();

        $deadline = $start->copy()->subHours(
            max(0, (int) config('payments.settlement_deadline_hours'))
        );

        return $deadline->isPast() ? $start : $deadline;
    }

    // ── Guards ────────────────────────────────────────────────────────────────

    /**
     * @throws InvalidPaymentTransitionException
     */
    private function guardSubmittable(PaymentVerification $payment): void
    {
        if ($payment->isOwed()) {
            return;
        }

        throw new InvalidPaymentTransitionException(match ($payment->status) {
            'submitted' => 'Your payment is already being checked by the clinic.',
            'verified' => 'This consultation has already been paid.',
            default => 'This consultation fee has been waived, so there is nothing to pay.',
        });
    }

    /**
     * Anything not already settled may be collected over the counter —
     * including a `submitted` row, because a patient who declared a GCash
     * transfer and then walked in with cash instead is a real sequence, and
     * the cash in the drawer is the better evidence.
     *
     * @throws InvalidPaymentTransitionException
     */
    private function guardCollectable(PaymentVerification $payment): void
    {
        if (! $payment->isSettled()) {
            return;
        }

        throw new InvalidPaymentTransitionException(
            $payment->status === 'waived'
                ? 'This consultation fee was waived, so there is nothing to collect.'
                : 'This consultation has already been paid.'
        );
    }

    /**
     * @throws InvalidPaymentTransitionException
     */
    private function guardDecidable(PaymentVerification $payment): void
    {
        if ($payment->status === 'submitted') {
            return;
        }

        throw new InvalidPaymentTransitionException(match ($payment->status) {
            'verified' => 'This payment has already been verified.',
            'rejected' => 'This payment has already been rejected. The patient must submit new details before it can be decided again.',
            'waived' => 'This consultation fee was waived, so there is no payment to decide.',
            default => 'The patient has not submitted any payment details yet.',
        });
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    //
    // The bell UI reads appointment_notifications (see CLAUDE.md), so these
    // write there directly rather than going through NotificationService. The
    // payment_* types are declared in the 2026_09_16 enum extension and mapped
    // in HandleInertiaRequests.

    private function notifyPatient(PaymentVerification $payment, string $type): void
    {
        if (! $payment->user_id) {
            return;
        }

        $amount = number_format((float) $payment->amount_due, 2);

        [$subject, $body] = match ($type) {
            'payment_due' => [
                'Payment Needed to Confirm Your Video Consultation',
                "Your video consultation needs ₱{$amount} settled by {$payment->due_at?->format('d M Y, g:i A')}. Reference {$payment->payment_reference}. Pay at the clinic cashier or send it through the clinic's GCash, Maya or bank account, then submit the details from the Payments page.",
            ],
            'payment_verified' => [
                $payment->status === 'waived' ? 'Consultation Fee Waived' : 'Payment Confirmed',
                $payment->status === 'waived'
                    ? "The fee for your video consultation ({$payment->payment_reference}) has been waived by the clinic. Your video room will open at your scheduled time."
                    : "We have confirmed your payment of ₱{$amount} ({$payment->payment_reference}). Your video room will open at your scheduled time.",
            ],
            default => [
                'Payment Could Not Be Confirmed',
                "We could not match the payment details you submitted for {$payment->payment_reference}. Reason: {$payment->remarks} — please check your receipt and submit again before your appointment.",
            ],
        };

        AppointmentNotification::create([
            'appointment_id' => $payment->appointment_id,
            'user_id' => $payment->user_id,
            'type' => $type,
            'subject' => $subject,
            'body' => $body,
            'read' => false,
        ]);
    }

    private function notifyStaff(PaymentVerification $payment): void
    {
        $appointment = $payment->appointment;
        $patientName = $appointment
            ? trim("{$appointment->first_name} {$appointment->last_name}")
            : 'A patient';

        $amount = number_format((float) $payment->amount_paid, 2);
        $channel = $payment->method_label ?? 'an unnamed channel';

        foreach (User::role('hr')->get() as $officer) {
            AppointmentNotification::create([
                'appointment_id' => $payment->appointment_id,
                'user_id' => $officer->id,
                'type' => 'payment_submitted',
                'subject' => 'Payment Awaiting Verification',
                'body' => "{$payment->payment_reference} — {$patientName} says they sent ₱{$amount} via {$channel}. Check it against the clinic's records.",
                'read' => false,
            ]);
        }
    }
}
