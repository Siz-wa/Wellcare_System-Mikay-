<?php

namespace App\Http\Controllers\Nurse;

use App\Concerns\ReadsPatientRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Nurse\UpdatePatientDemographicsRequest;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Figure 10's "Access Patient Record" and "Update Patient Records" processes.
 *
 * ## Why this is a separate controller
 *
 * The obvious move was to hang `role:nurse|doctor` on the doctor's record
 * routes. That would also hand the nurse `storeDiagnosis`, `updateDiagnosis`
 * and `destroyDiagnosis`, because a shared route group cannot express a
 * partial grant. The capability split below is the entire point of the phase,
 * so it gets its own controller and the *read* half is shared through
 * `ReadsPatientRecords` instead — a record reads identically for both roles.
 *
 * ## The split
 *
 * | Capability                        | Nurse |
 * |-----------------------------------|-------|
 * | Read record, visits, vitals       |  yes  |
 * | Allergies — add / remove          |  yes  |
 * | Documents — upload / download     |  yes  |
 * | Demographics — update             |  yes  |
 * | Diagnoses — create/update/delete  |  no   |
 *
 * Diagnoses are read-only here. "Update Patient Records" in Fig. 10 is an
 * encoding task; authoring a diagnosis is clinical judgment, and the Scope
 * assigns that to the doctor. The nurse still *sees* diagnoses, because
 * knowing what a patient is being treated for is exactly what makes their
 * intake and lab work safe.
 *
 * Same reasoning as Phase 4 withholding `hmo_id` from admin surfaces: a
 * deliberate, logged narrowing beats an accidental over-grant.
 */
class PatientRecordController extends Controller
{
    use ReadsPatientRecords;

    // ── Read ──────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $patients = $this->patientRecordQuery($request)
            ->paginate(20)
            ->through(fn (Patient $p) => $this->mapPatientSummary($p));

        return Inertia::render('nurse/patient-records/patient-records', [
            'patients' => $patients,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'service' => $request->string('service')->toString(),
            ],
        ]);
    }

    public function show(Patient $patient): Response
    {
        $patient->load(['allergies', 'diagnoses', 'documents']);
        $this->applyLegacyRecordFallback($patient);

        return Inertia::render('nurse/patient-records/patient-record-detail', [
            'patient' => $this->mapPatientSummary($patient),
            'profile' => $this->mapPatientProfile($patient),
            'allergies' => $this->mapAllergies($patient),
            // Rendered read-only — there is no diagnosis write route for nurses.
            'diagnoses' => $this->mapDiagnoses($patient),
            'documents' => $this->mapDocuments($patient, 'nurse.patient-records.documents.download'),
            'visits' => $this->visitHistory($patient),
            'latestVitals' => $this->latestVitals($patient),
        ]);
    }

    // ── Demographics ──────────────────────────────────────────────────────────

    /**
     * Fig. 10's "encode patient data". Clinical fields are not reachable here —
     * the request object allows demographics only, and `hmo_id` is excluded for
     * the same reason it is excluded from the admin patient form.
     */
    public function update(UpdatePatientDemographicsRequest $request, Patient $patient): RedirectResponse
    {
        $patient->update($request->validated());

        return back()->with('success', "{$patient->first_name}'s details updated.");
    }

    // ── Allergies ─────────────────────────────────────────────────────────────

    public function storeAllergy(Request $request, Patient $patient): RedirectResponse
    {
        $validated = $request->validate([
            'allergen' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'in:mild,moderate,severe'],
            'reaction' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'allergen.required' => 'Please enter the allergen name (e.g. Penicillin, Shellfish).',
            'severity.required' => 'Please select a severity level.',
            'severity.in' => 'Severity must be mild, moderate, or severe.',
        ]);

        PatientAllergy::create([
            'patient_id' => $patient->id,
            'user_id' => $patient->guarantor_id,
            'recorded_by' => Auth::id(),
            'allergen' => $validated['allergen'],
            'severity' => $validated['severity'],
            'reaction' => $validated['reaction'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', "Allergy recorded for {$patient->first_name}.");
    }

    public function destroyAllergy(PatientAllergy $allergy): RedirectResponse
    {
        $allergy->delete();

        return back()->with('success', 'Allergy record removed.');
    }

    // ── Documents ─────────────────────────────────────────────────────────────

    public function uploadDocument(Request $request, Patient $patient): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:lab,imaging,referral,prescription,report,other'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,jpg,jpeg,png,gif,doc,docx'],
        ], [
            'title.required' => 'Please enter a title for this document.',
            'type.required' => 'Please select the document type.',
            'file.required' => 'Please select a file to upload.',
            'file.max' => 'File size must not exceed 20 MB.',
            'file.mimes' => 'Only PDF, image (JPG, PNG, GIF), or Word document files are allowed.',
        ]);

        $file = $request->file('file');
        $path = $file->store("patient-documents/{$patient->id}", 'local');

        PatientDocument::create([
            'patient_id' => $patient->id,
            'user_id' => $patient->guarantor_id,
            'appointment_id' => $validated['appointment_id'] ?? null,
            'uploaded_by' => Auth::id(),
            'title' => $validated['title'],
            'type' => $validated['type'],
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        return back()->with('success', 'Document uploaded.');
    }

    public function downloadDocument(PatientDocument $document): StreamedResponse
    {
        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->download($document->file_path, $document->file_name);
    }
}
