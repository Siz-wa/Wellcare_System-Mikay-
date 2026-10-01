<?php

namespace App\Http\Controllers\Settings;

use App\Concerns\LogsRecordAccess;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Consent;
use App\Models\ConsultationPrescription;
use App\Models\LabTestResult;
use App\Models\Patient;
use App\Models\PaymentVerification;
use App\Models\User;
use App\Services\ConsentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * "Privacy & data" — what the clinic holds about this account, and the two
 * things the account holder may do about it: take a copy, or close the account.
 *
 * This is the Philippine Data Privacy Act (RA 10173) right to access and the
 * right to data portability, made into a button. A capstone system that stores
 * medical records without either is missing a legal requirement, not a nice
 * feature.
 */
class PrivacyController extends Controller
{
    /**
     * QW-8 / AU-3. This is the single most valuable request in the
     * application to anyone who has stolen a session — it packages an entire
     * medical record into one response — and it previously left no trace at
     * all. The throttle on the route limits how often it can be pulled; this
     * records that it was.
     */
    use LogsRecordAccess;

    public function __construct(private readonly ConsentService $consents) {}

    public function show(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return Inertia::render('settings/privacy/index', [
            // A count summary rather than the data itself: the page's job is to
            // tell someone what exists and offer the file, not to render a
            // medical record in a settings pane.
            'summary' => [
                'patients' => Patient::where('guarantor_id', $user->id)->count(),
                'appointments' => Appointment::where('user_id', $user->id)->count(),
                'documents' => $user->patientDocuments()->count(),
                'allergies' => $user->patientAllergies()->count(),
                'diagnoses' => $user->patientDiagnoses()->count(),
            ],
            'memberSince' => $user->created_at?->toISOString(),
            'canDeleteAccount' => $user->canCloseOwnAccount(),

            // SC-4 / C-3. "Can a patient later see what they consented to" was
            // Missing outright, because nothing was captured to show. This is
            // the answer to it: every purpose, the wording, when they agreed,
            // and which version they agreed to.
            'consents' => $this->consents->statusFor($user),
        ]);
    }

    /**
     * Agree (again) to a purpose, from the Privacy page. Recorded at the
     * current wording, like any other grant.
     */
    public function grantConsent(Request $request, string $type): RedirectResponse
    {
        abort_unless(in_array($type, Consent::types(), true), 404);

        $this->consents->grant($type, $request->user());

        return back()->with('success', 'Thank you. Your agreement has been recorded.');
    }

    /**
     * Withdraw consent to one purpose.
     *
     * Purposes marked `withdrawable: false` in config/consent.php come back as
     * an explanation rather than an error — see the note there on why data
     * processing is one of them, and why that conflict needs a person rather
     * than a button.
     */
    public function withdrawConsent(Request $request, string $type): RedirectResponse
    {
        abort_unless(in_array($type, Consent::types(), true), 404);

        if (! $this->consents->isWithdrawable($type)) {
            return back()->withErrors([
                'consent' => 'This consent cannot be withdrawn here, because the clinic is separately required to keep your medical record. Please contact the clinic so someone can help you.',
            ]);
        }

        $this->consents->withdraw($type, $request->user());

        return back()->with('success', 'Your preference has been updated.');
    }

    /**
     * Download everything this account holds, as JSON.
     *
     * Streamed rather than built in memory, and rate-limited on the route: this
     * reads an unbounded number of appointment rows, and it is the one endpoint
     * in the app that packages a person's entire record into a single response.
     *
     * Scoping is the whole security surface here. Patients are read through
     * `guarantor_id`, never `user_id` — the distinction CLAUDE.md flags as the
     * source of most bugs in this codebase, and the one that would leak another
     * family's record into this file if it were got wrong.
     */
    public function export(Request $request): StreamedResponse
    {
        /** @var User $user */
        $user = $request->user();

        $payload = [
            'exported_at' => now()->toISOString(),
            // Consent history belongs in a portability export: it is the record
            // of what the person agreed to and when, and it is about them.
            'consents' => $user->consents()->orderBy('granted_at')->get()->map(fn (Consent $consent) => [
                'purpose' => $consent->type,
                'document_version' => $consent->document_version,
                'granted_at' => $consent->granted_at?->toISOString(),
                'withdrawn_at' => $consent->withdrawn_at?->toISOString(),
            ])->all(),
            'account' => [
                'email' => $user->email,
                'email_verified' => $user->email_verified_at !== null,
                'roles' => $user->getRoleNames()->toArray(),
                'two_factor_enabled' => $user->hasEnabledTwoFactorAuthentication(),
                'registered_at' => $user->created_at?->toISOString(),
            ],
            'profile' => $user->profile?->only([
                'first_name', 'last_name', 'address', 'company', 'contact_number',
                'gender', 'birthdate', 'civil_status', 'client_number', 'classification',
            ]),
            'patients' => Patient::where('guarantor_id', $user->id)
                ->get()
                ->map(fn (Patient $patient) => $patient->only([
                    'clinic_id', 'first_name', 'last_name', 'email', 'contact_number',
                    'age', 'gender', 'birthdate', 'address', 'civil_status', 'company',
                    'relationship_to_guarantor', 'default_coverage', 'hmo_provider',
                ]))
                ->all(),
            'appointments' => Appointment::where('user_id', $user->id)
                ->orderBy('appointment_date')
                ->get()
                ->map(fn (Appointment $appointment) => $appointment->only([
                    'appointment_date', 'appointment_time', 'service', 'branch',
                    'consultation_type', 'coverage', 'hmo', 'status', 'cancellation_reason',
                ]))
                ->all(),
            'allergies' => $user->patientAllergies()->get()->map->only(['allergen', 'reaction', 'severity', 'notes'])->all(),
            'diagnoses' => $user->patientDiagnoses()->get()->map->only(['icd_code', 'diagnosis', 'type', 'status', 'diagnosed_at', 'notes'])->all(),
            // Filenames and dates only — never `file_path`. The files themselves
            // are downloaded one at a time through the records page, which is
            // where the per-document authorization check lives; a storage path
            // in an exported file is a path someone will eventually try.
            'documents' => $user->patientDocuments()->get()->map->only(['title', 'type', 'file_name', 'file_size', 'created_at'])->all(),
            // G-10: payments, lab results and prescriptions were missing, so
            // the export was not the complete copy RA 10173 s.18 promises.
            // Payment proofs are listed by name only, for the same reason
            // documents omit file_path.
            'payments' => PaymentVerification::where('user_id', $user->id)
                ->orderBy('created_at')
                ->get()
                ->map(fn (PaymentVerification $payment) => $payment->only([
                    'payment_reference', 'status', 'method', 'amount_due', 'amount_paid',
                    'remittance_reference', 'proof_name', 'remarks', 'due_at',
                    'submitted_at', 'verified_at', 'rejected_at',
                ]))
                ->all(),
            'lab_results' => LabTestResult::with('parameters')
                ->where('user_id', $user->id)
                ->orderBy('requested_at')
                ->get()
                ->map(fn (LabTestResult $lab) => [
                    ...$lab->only(['test_name', 'status', 'severity', 'notes', 'interpretation', 'requested_at', 'recorded_at', 'reviewed_at']),
                    'parameters' => $lab->parameters->map->only(['name', 'result', 'unit', 'ref_range', 'status'])->all(),
                ])
                ->all(),
            'prescriptions' => ConsultationPrescription::whereHas(
                'session.appointment',
                fn ($query) => $query->where('user_id', $user->id),
            )
                ->get()
                ->map->only(['name', 'instructions', 'created_at'])
                ->all(),
        ];

        $this->logRecordAccess('exported');

        $filename = 'wellcare-data-'.now()->format('Y-m-d').'.json';

        return response()->streamDownload(
            fn () => print (json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
            $filename,
            ['Content-Type' => 'application/json'],
        );
    }
}
