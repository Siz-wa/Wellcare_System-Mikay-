<?php

namespace App\Http\Controllers\Patient;

use App\Concerns\LogsRecordAccess;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientDocument;
use App\Models\RecordAccessLog;
use App\Services\PatientDocumentStorage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The patient's own view of their medical record — "View Medical Records" in
 * the context diagram (Fig. 4) and the patient DFD (Fig. 11).
 *
 * Read-only by design. Every write path (allergies, diagnoses, documents)
 * belongs to the clinical staff and lives in Doctor\PatientRecordController.
 *
 * SCOPING RULE, and the whole reason this controller exists separately:
 * a record is reachable only through `patients.guarantor_id === Auth::id()`.
 * The doctor controller carries a legacy `user_id` fallback for pre-migration
 * rows; that fallback deliberately widens a query to the guarantor account and
 * would bleed one patient's record into a sibling's page. It is not repeated here.
 */
class PatientRecordController extends Controller
{
    /**
     * SC-3. The account holder's own reads are recorded too — not to police
     * them, but because the "who accessed your records" list is only
     * trustworthy if it is a complete log that then filters, rather than a
     * partial log that cannot show what it never captured. RecordAccessLog's
     * byStaff() scope is what hides these rows from that list.
     */
    use LogsRecordAccess;

    public function __construct(private readonly PatientDocumentStorage $documents) {}

    // ── Index — the people under this account ─────────────────────────────────

    public function index(): Response
    {
        $patients = Patient::where('guarantor_id', Auth::id())
            ->with(['allergies', 'diagnoses' => fn ($q) => $q->where('status', 'active')])
            ->withCount(Patient::recordCounts())
            ->orderBy('first_name')
            ->get()
            ->map(fn (Patient $p) => $this->mapPatientCard($p));

        return Inertia::render('user/records/records', [
            'patients' => $patients,
        ]);
    }

    // ── Show — one patient's full record ──────────────────────────────────────

    public function show(Patient $patient): Response
    {
        $this->authorizePatient($patient);

        $patient->load([
            'allergies',
            'diagnoses',
            'documents' => fn ($q) => $q->orderByDesc('created_at'),
        ]);

        $this->logRecordAccess('viewed', $patient, $patient);

        return Inertia::render('user/records/record-detail', [
            'patient' => $this->mapPatientCard($patient),
            'profile' => [
                'firstName' => $patient->first_name,
                'lastName' => $patient->last_name,
                'birthdate' => $patient->birthdate?->format('d M Y'),
                'age' => $patient->age,
                'gender' => $patient->gender,
                'address' => $patient->address,
                'contactNumber' => $patient->contact_number,
                'civilStatus' => $patient->civil_status,
                'clinicId' => $patient->clinic_id,
                'email' => $patient->email,
                'hmoProvider' => $patient->hmo_provider,
            ],
            'allergies' => $patient->allergies->map(fn ($a) => [
                'id' => $a->id,
                'allergen' => $a->allergen,
                'severity' => $a->severity,
                'reaction' => $a->reaction,
                'notes' => $a->notes,
            ])->values(),
            'diagnoses' => $patient->diagnoses->map(fn ($d) => [
                'id' => $d->id,
                'icdCode' => $d->icd_code,
                'diagnosis' => $d->diagnosis,
                'type' => $d->type,
                'status' => $d->status,
                'diagnosedAt' => $d->diagnosed_at->format('d M Y'),
                'notes' => $d->notes,
            ])->values(),
            'documents' => $patient->documents->map(fn (PatientDocument $doc) => [
                'id' => $doc->id,
                'title' => $doc->title,
                'type' => $doc->type,
                'fileName' => $doc->file_name,
                'size' => $doc->formatted_size,
                'uploadedAt' => $doc->created_at->format('d M Y'),
                'downloadUrl' => route('user.records.documents.download', $doc->id),
            ])->values(),
            'visits' => $this->visitsFor($patient),
            'accessLog' => $this->staffAccessLog($patient),
        ]);
    }

    // ── Document download ─────────────────────────────────────────────────────

    public function downloadDocument(PatientDocument $document): StreamedResponse
    {
        $document->loadMissing('patient');

        abort_if(
            $document->patient === null
            || $document->patient->guarantor_id !== Auth::id(),
            403
        );

        $this->logRecordAccess('downloaded', $document->patient_id, $document);

        return $this->documents->download($document) ?? abort(404);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * "Who has looked at this record" — the clinic side of it.
     *
     * SC-3's patient-facing half, and the part that turns an internal audit
     * table into a data-subject right. RA 10173 gives a person the right to be
     * informed about the processing of their data; the Health Privacy Code's
     * access-tracking expectation reaches for the same thing. A log only the
     * clinic can read satisfies the accountability half and none of the
     * transparency half.
     *
     * Scoped through `byStaff()` so the guarantor does not see their own visits
     * echoed back at them — they know they opened it, and those rows would bury
     * the ones that matter.
     *
     * Capped at 25. This is a reassurance panel, not a log viewer; someone who
     * needs the full history asks the clinic, which is also the point at which
     * a human should be involved.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function staffAccessLog(Patient $patient): Collection
    {
        return RecordAccessLog::query()
            ->byStaff()
            ->where('patient_id', $patient->id)
            ->latest('created_at')
            ->limit(25)
            ->get()
            ->map(fn (RecordAccessLog $entry) => [
                'id' => $entry->id,
                // The role, never the individual's name or email. What a patient
                // is owed is "a nurse opened your chart on 3 March", and naming
                // staff to patients creates a different problem than it solves.
                'role' => ucfirst((string) $entry->actor_role),
                'action' => $entry->action,
                'at' => $entry->created_at?->format('d M Y, g:i A'),
            ])
            ->values();
    }

    /**
     * The single ownership gate for this controller.
     *
     * Route-model binding resolves any {patient} in the URL, so without this a
     * signed-in patient could read anyone's record by changing the id.
     *
     * Delegates to PatientPolicy rather than re-stating the rule (SC-2). The
     * behaviour is unchanged — `accessAsGuarantor` is this same comparison —
     * but the definition now lives in one file alongside every other role's.
     *
     * `accessAsGuarantor`, not `view`: `view` also admits doctors and nurses,
     * and this controller's whole contract is that a record is reachable here
     * ONLY through `guarantor_id`. An account carrying both `user` and a staff
     * role would otherwise read any chart through the portal.
     */
    private function authorizePatient(Patient $patient): void
    {
        $this->authorize('accessAsGuarantor', $patient);
    }

    /**
     * Completed visits with the consultation summary the doctor finalised.
     *
     * Scoped strictly on patient_id — unlike the doctor surface, there is no
     * name+contact fallback for pre-migration rows.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function visitsFor(Patient $patient): Collection
    {
        return Appointment::where('patient_id', $patient->id)
            ->where('status', 'completed')
            ->with(['consultationSession.prescriptions', 'doctor.doctorProfile'])
            ->orderByDesc('appointment_date')
            ->get()
            ->map(function (Appointment $a) {
                $session = $a->consultationSession;

                return [
                    'id' => $a->id,
                    'date' => $a->appointment_date->format('d M Y'),
                    'time' => $a->appointment_time,
                    'service' => ucwords(str_replace('-', ' ', $a->service)),
                    'doctor' => $a->doctor?->doctorProfile?->display_name,
                    // Only the finalised half of the SOAP note is surfaced.
                    // Subjective/objective are the doctor's working notes.
                    'assessment' => $session?->assessment,
                    'plan' => $session?->plan,
                    'vitals' => $session ? [
                        'bloodPressure' => $session->blood_pressure,
                        'heartRate' => $session->heart_rate,
                        'temperature' => $session->temperature,
                        'oxygenSaturation' => $session->oxygen_saturation,
                        'weight' => $session->weight,
                        'height' => $session->height,
                        'source' => $session->vitals_source,
                        'sourceLabel' => $session->vitalsSourceLabel(),
                    ] : null,
                    'prescriptions' => $session
                        ? $session->prescriptions->map(fn ($p) => [
                            'name' => $p->name,
                            'instructions' => $p->instructions,
                        ])->values()
                        : collect(),
                ];
            });
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPatientCard(Patient $p): array
    {
        $hasAllergy = $p->relationLoaded('allergies') && $p->allergies->isNotEmpty();

        return [
            'id' => $p->id,
            'name' => $p->full_name,
            'initials' => $p->initials,
            'clinicId' => $p->clinic_id,
            'age' => $p->age,
            'gender' => $p->gender,
            'documentCount' => $p->documents_count ?? 0,
            'appointmentCount' => $p->appointments_count ?? 0,
            'hasAllergy' => $hasAllergy,
            'allergySummary' => $hasAllergy
                ? $p->allergies->pluck('allergen')->implode(', ')
                : null,
            'activeDiagnoses' => $p->relationLoaded('diagnoses')
                ? $p->diagnoses->where('status', 'active')->count()
                : 0,
        ];
    }
}
