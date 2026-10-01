<?php

namespace App\Http\Controllers\HR;

use App\Exceptions\InvalidPaymentTransitionException;
use App\Http\Controllers\Controller;
use App\Models\PaymentVerification;
use App\Services\PaymentProofStorage;
use App\Services\PaymentVerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The clinic half of settling a video consultation — the queue where a person
 * checks a patient's claim against the clinic's own records.
 *
 * ## Why HR, and why this sits beside the LOA queue
 *
 * It is the same job. An LOA decision asks "will the insurer pay for this
 * visit?"; this asks "did this patient pay for this visit?" Both are financial
 * findings about a booking, both release or hold an appointment, and both are
 * decided by reading a document the clinic holds rather than anything in this
 * application. HR already owns the first, so it owns the second, and an officer
 * working one queue recognises the other on sight.
 *
 * Administrators get the same visibility-without-authority shape the LOA queue
 * uses (GV-3): they may read the backlog, they may not clear it. Whoever
 * provisions accounts should not also be the one confirming that money arrived.
 *
 * ## What the officer is actually doing
 *
 * Opening the clinic's GCash Business app, or its bank statement, or the
 * cashier's OR book, and looking for the reference the patient typed. The
 * application cannot do this and does not pretend to — it has no connection to
 * any of those. What it does is make sure the question gets asked before a
 * consultation opens, and keep the answer.
 */
class PaymentVerificationController extends Controller
{
    public function __construct(
        private PaymentVerificationService $payments,
        private PaymentProofStorage $proofs,
    ) {}

    public function index(): Response
    {
        $pending = PaymentVerification::awaitingVerification()
            ->forLiveAppointments()
            ->with(['patient', 'appointment.doctor.doctorProfile'])
            ->oldest('submitted_at')
            ->get()
            ->map(fn (PaymentVerification $payment) => $this->mapPayment($payment));

        /*
         * Shown alongside the queue rather than hidden behind a filter, because
         * these are the rows that cost the clinic money. An overdue unpaid
         * booking is a slot about to be released by the sweeper, and an officer
         * who can see it coming can phone the patient first.
         */
        $outstanding = PaymentVerification::unsettled()
            ->forLiveAppointments()
            ->with(['patient', 'appointment.doctor.doctorProfile'])
            ->orderBy('due_at')
            ->get()
            ->map(fn (PaymentVerification $payment) => $this->mapPayment($payment));

        /*
         * What was decided, and by whom. Verified payments used to vanish from
         * this page the moment they were confirmed, leaving no way to answer
         * "did we confirm Juan's GCash?" without a database query.
         */
        $history = PaymentVerification::query()
            ->whereIn('status', ['verified', 'waived', 'rejected'])
            ->with(['patient', 'verifiedBy'])
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (PaymentVerification $p) => [
                'id' => $p->id,
                'reference' => $p->payment_reference,
                'patient' => $p->patient?->full_name ?? 'Unknown patient',
                'status' => $p->status,
                'amountPaid' => $p->amount_paid !== null ? (float) $p->amount_paid : null,
                'amountDue' => (float) $p->amount_due,
                'methodLabel' => $p->method_label,
                'decidedAt' => ($p->verified_at ?? $p->rejected_at ?? $p->updated_at)?->format('d M Y, g:i A'),
                'decidedBy' => $p->verifiedBy?->name,
                'remarks' => $p->remarks,
            ]);

        return Inertia::render('hr/payment-verifications/payment-verifications', [
            'payments' => $pending->values(),
            'outstanding' => $outstanding->values(),
            'history' => $history->values(),
            'stats' => [
                'pending' => $pending->count(),
                'outstanding' => $outstanding->count(),
                // Past the deadline whether or not the patient has declared a
                // payment: a submitted-but-unchecked one is just as late.
                'overdue' => $outstanding->where('isOverdue', true)->count()
                    + $pending->where('isOverdue', true)->count(),
                'verifiedToday' => PaymentVerification::whereDate('verified_at', today())
                    ->where('status', 'verified')
                    ->count(),
                'collectedToday' => (float) PaymentVerification::whereDate('verified_at', today())
                    ->where('status', 'verified')
                    ->sum('amount_paid'),
            ],
            // GV-3 — see the LOA queue. Without this the page would render
            // decision buttons that 403 for an administrator, which reads as a
            // bug rather than as a boundary.
            'canDecide' => (bool) Auth::user()?->hasRole('hr'),
        ]);
    }

    public function verify(Request $request, PaymentVerification $paymentVerification): RedirectResponse
    {
        $validated = $request->validate([
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->payments->verify(
                $paymentVerification,
                Auth::user(),
                $validated['remarks'] ?? null,
            );
        } catch (InvalidPaymentTransitionException $e) {
            return back()->withErrors(['remarks' => $e->getMessage()]);
        }

        $name = $paymentVerification->patient?->full_name ?? 'the patient';

        return back()->with('success',
            "Payment {$paymentVerification->payment_reference} for {$name} confirmed. Their video room will open at the scheduled time."
        );
    }

    public function reject(Request $request, PaymentVerification $paymentVerification): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ], [
            'reason.required' => 'Please say what could not be matched, so the patient can correct it.',
        ]);

        try {
            $this->payments->reject($paymentVerification, Auth::user(), $validated['reason']);
        } catch (InvalidPaymentTransitionException $e) {
            return back()->withErrors(['reason' => $e->getMessage()]);
        }

        return back()->with('success',
            "Payment {$paymentVerification->payment_reference} rejected. The patient has been asked to check their receipt and submit again."
        );
    }

    /**
     * The cashier took cash at the counter.
     *
     * The path that makes "cash for a video consultation" possible at all: the
     * patient, or anyone acting for them, pays at the Dasmariñas branch before
     * the call and the cashier records the OR number here. It confirms in one
     * step — see PaymentVerificationService::recordCounterPayment() for why
     * splitting claim from verification makes no sense when the same person
     * did both.
     */
    public function recordCounterPayment(Request $request, PaymentVerification $paymentVerification): RedirectResponse
    {
        $validated = $request->validate([
            'amount_paid' => ['required', 'numeric', 'min:1', 'max:999999.99'],
            // The clinic's own OR number, not a GCash reference. Same permissive
            // shape as the patient-facing field: an OR is typically hyphenated
            // and a format rule tuned to one receipt book would reject the next.
            'official_receipt' => ['required', 'string', 'min:2', 'max:60', 'regex:/^[A-Za-z0-9 \-]+$/'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ], [
            'amount_paid.required' => 'Enter the amount collected.',
            'official_receipt.required' => 'Enter the Official Receipt number issued to the patient.',
            'official_receipt.regex' => 'An OR number may only contain letters, numbers, spaces and hyphens.',
        ]);

        try {
            $this->payments->recordCounterPayment(
                $paymentVerification,
                Auth::user(),
                (float) $validated['amount_paid'],
                $validated['official_receipt'],
                $validated['remarks'] ?? null,
            );
        } catch (InvalidPaymentTransitionException $e) {
            return back()->withErrors(['official_receipt' => $e->getMessage()]);
        }

        $name = $paymentVerification->patient?->full_name ?? 'the patient';

        return back()->with('success',
            "Counter payment recorded for {$name} ({$paymentVerification->payment_reference}). Their video room will open at the scheduled time."
        );
    }

    /**
     * Settle the record without collecting.
     *
     * Requires a reason for the same purpose the remarks on a rejection serve:
     * "why was this consultation free?" is the first question an audit asks,
     * and an unexplained waiver is indistinguishable from a favour.
     */
    public function waive(Request $request, PaymentVerification $paymentVerification): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ], [
            'reason.required' => 'Please record why this fee is being waived.',
        ]);

        try {
            $this->payments->waive($paymentVerification, Auth::user(), $validated['reason']);
        } catch (InvalidPaymentTransitionException $e) {
            return back()->withErrors(['reason' => $e->getMessage()]);
        }

        return back()->with('success',
            "Fee for {$paymentVerification->payment_reference} waived. The consultation may go ahead."
        );
    }

    /**
     * The receipt the patient uploaded — the thing the officer is checking.
     */
    public function downloadProof(PaymentVerification $paymentVerification): StreamedResponse
    {
        $stream = $this->proofs->download($paymentVerification);

        abort_if($stream === null, 404);

        return $stream;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPayment(PaymentVerification $payment): array
    {
        $appointment = $payment->appointment;
        $patient = $payment->patient;

        return [
            'id' => $payment->id,
            'reference' => $payment->payment_reference,
            'status' => $payment->status,

            'patient' => $patient?->full_name ?? 'Unknown patient',
            'initials' => $patient?->initials ?? '??',
            'contactNumber' => $patient?->contact_number ?? $appointment?->contact_number,
            'email' => $patient?->email ?? $appointment?->email,

            'amountDue' => (float) $payment->amount_due,
            'amountPaid' => $payment->amount_paid !== null ? (float) $payment->amount_paid : null,
            // Pre-computed so the officer is not subtracting two columns by
            // eye. Null when the figures agree, which is the common case.
            'shortfall' => $payment->shortfall,
            'method' => $payment->method,
            'methodLabel' => $payment->method_label,

            // The number the officer types into the clinic's own GCash app or
            // bank statement search. This is the one field the whole screen
            // exists to present.
            'remittanceReference' => $payment->remittance_reference,

            'submittedAt' => $payment->submitted_at?->format('d M Y, g:i A'),
            'submittedAgo' => $payment->submitted_at?->diffForHumans(short: true),
            'dueAt' => $payment->due_at?->format('d M Y, g:i A'),
            'dueIn' => $payment->due_at?->diffForHumans(short: true),
            'isOverdue' => $payment->is_overdue,
            'remarks' => $payment->remarks,

            'hasProof' => $payment->proof_path !== null,
            'proofName' => $payment->proof_name,

            'appointment' => $appointment ? [
                'id' => $appointment->id,
                'date' => $appointment->appointment_date?->format('d M Y'),
                'time' => $appointment->appointment_time,
                'service' => ucwords(str_replace('-', ' ', $appointment->service)),
                'doctor' => $appointment->doctor?->doctorProfile?->display_name,
                'status' => $appointment->status,
                'isToday' => (bool) $appointment->appointment_date?->isToday(),
            ] : null,
        ];
    }
}
