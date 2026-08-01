<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientDocument;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
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
    // ── Index — the people under this account ─────────────────────────────────

    public function index(): Response
    {
        $patients = Patient::where('guarantor_id', Auth::id())
            ->with(['allergies', 'diagnoses' => fn ($q) => $q->where('status', 'active')])
            ->withCount(['documents', 'appointments'])
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

        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->download($document->file_path, $document->file_name);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * The single ownership gate for this controller.
     *
     * Route-model binding resolves any {patient} in the URL, so without this a
     * signed-in patient could read anyone's record by changing the id.
     */
    private function authorizePatient(Patient $patient): void
    {
        abort_if($patient->guarantor_id !== Auth::id(), 403);
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
