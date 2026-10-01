<?php

namespace App\Http\Controllers\Patient;

use App\Exceptions\InvalidPaymentTransitionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Patient\SubmitPaymentRequest;
use App\Models\PaymentVerification;
use App\Services\PaymentProofStorage;
use App\Services\PaymentVerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * "My payments" — the patient half of settling a video consultation.
 *
 * Scoped through `patients.guarantor_id`, never `payment_verifications.user_id`,
 * for the reason PatientLoaController sets out: `user_id` is the guarantor
 * account and is shared between siblings, so scoping on it would show one
 * family member another's billing. This is a LIST page, and the list pages scope
 * on the guarantor.
 *
 * (PatientConsultationController scopes the opposite way and explains why — a
 * room is a question about one appointment, not about whose records an account
 * may read. The two rules are not in conflict; they answer different questions.)
 */
class PatientPaymentController extends Controller
{
    public function __construct(
        private PaymentVerificationService $payments,
        private PaymentProofStorage $proofs,
    ) {}

    public function index(): Response
    {
        $patientIds = Auth::user()
            ->guaranteedPatients()
            ->pluck('id');

        $payments = PaymentVerification::whereIn('patient_id', $patientIds)
            ->with(['patient', 'appointment.doctor.doctorProfile'])
            ->orderByRaw("FIELD(status, 'rejected', 'pending', 'submitted', 'verified', 'waived')")
            ->orderBy('due_at')
            ->get()
            ->map(fn (PaymentVerification $payment) => $this->mapPayment($payment))
            ->values();

        return Inertia::render('user/payments/payments', [
            'payments' => $payments,
            'stats' => [
                'total' => $payments->count(),
                'owed' => $payments->whereIn('status', ['pending', 'rejected'])->count(),
                'checking' => $payments->where('status', 'submitted')->count(),
                'settled' => $payments->whereIn('status', ['verified', 'waived'])->count(),
            ],
            // The clinic's own accounts, straight from config. Blank channels
            // are dropped rather than rendered as an empty row to send money
            // to — see the note in config/payments.php.
            'channels' => $this->publishedChannels(),
        ]);
    }

    /**
     * The patient declares a remittance. Nothing here decides anything: the
     * record moves to `submitted` and waits for a human to check it against the
     * clinic's statement.
     */
    public function store(
        SubmitPaymentRequest $request,
        PaymentVerification $payment,
    ): RedirectResponse {
        $this->authorizeOwnership($payment);

        $validated = $request->validated();

        try {
            $this->payments->submit(
                $payment,
                $validated['method'],
                (float) $validated['amount_paid'],
                $validated['remittance_reference'],
                $request->file('proof'),
            );
        } catch (InvalidPaymentTransitionException $e) {
            return back()->withErrors(['method' => $e->getMessage()]);
        }

        return back()->with('success',
            "Payment details for {$payment->payment_reference} submitted. The clinic will confirm them shortly."
        );
    }

    /**
     * The patient's own copy of the receipt they uploaded.
     *
     * They may re-read what they sent — which is the point of keeping it — but
     * the file is served through the application rather than from a public
     * path, so the ownership check above runs on every read.
     */
    public function downloadProof(PaymentVerification $payment): StreamedResponse
    {
        $this->authorizeOwnership($payment);

        $stream = $this->proofs->download($payment);

        abort_if($stream === null, 404);

        return $stream;
    }

    /**
     * Does this account guarantee the patient the record belongs to?
     *
     * A 404 rather than a 403 on failure: telling an account that a payment
     * reference exists but belongs to someone else is itself a disclosure.
     */
    private function authorizeOwnership(PaymentVerification $payment): void
    {
        $guaranteed = Auth::user()
            ->guaranteedPatients()
            ->whereKey($payment->patient_id)
            ->exists();

        abort_unless($guaranteed, 404);
    }

    /**
     * Channels the clinic has actually filled in.
     *
     * `otc_cash` is always published — paying the cashier needs no account
     * number, and it is the answer to how cash reaches a consultation nobody
     * attends in person. The rest appear only once someone has configured an
     * account for them.
     *
     * @return array<int, array<string, mixed>>
     */
    private function publishedChannels(): array
    {
        $channels = [];

        foreach (config('payments.channels', []) as $key => $channel) {
            $isConfigured = $key === 'otc_cash' || filled($channel['account_number'] ?? null);

            if (! $isConfigured) {
                continue;
            }

            $channels[] = [
                'value' => $key,
                'label' => $channel['label'],
                'instructions' => $channel['instructions'],
                'accountName' => $channel['account_name'] ?? null,
                'accountNumber' => $channel['account_number'] ?? null,
            ];
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPayment(PaymentVerification $payment): array
    {
        $appointment = $payment->appointment;

        return [
            'id' => $payment->id,
            'reference' => $payment->payment_reference,
            'status' => $payment->status,
            'patientName' => $payment->patient?->full_name ?? 'Unknown patient',
            'patientInitials' => $payment->patient?->initials ?? '??',

            'amountDue' => (float) $payment->amount_due,
            'amountPaid' => $payment->amount_paid !== null ? (float) $payment->amount_paid : null,
            'method' => $payment->method,
            'methodLabel' => $payment->method_label,

            'dueAt' => $payment->due_at?->format('d M Y, g:i A'),
            'dueIn' => $payment->due_at?->diffForHumans(),
            'isOverdue' => $payment->is_overdue,
            'submittedAt' => $payment->submitted_at?->format('d M Y, g:i A'),
            'decidedAt' => ($payment->verified_at ?? $payment->rejected_at)?->format('d M Y, g:i A'),

            // The officer's note — on a rejection this is the only actionable
            // part of the decision.
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
            ] : null,
        ];
    }
}
