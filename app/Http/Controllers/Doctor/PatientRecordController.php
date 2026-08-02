<?php

namespace App\Http\Controllers\Doctor;

use App\Concerns\ReadsPatientRecords;
use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PatientRecordController extends Controller
{
    /**
     * The read half is shared with Nurse\PatientRecordController. The write
     * methods below are not — diagnosis authoring is the doctor's alone.
     */
    use ReadsPatientRecords;

    // ── Index ─────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $patients = $this->patientRecordQuery($request)
            ->paginate(20)
            ->through(fn (Patient $p) => $this->mapPatientSummary($p));

        return Inertia::render('doctor/patient-records/patient-records', [
            'patients' => $patients,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'service' => $request->string('service')->toString(),
            ],
        ]);
    }

    // ── Show ──────────────────────────────────────────────────────────────────

    public function show(Patient $patient): Response
    {
        // Always try patient_id first (correct path for all new records); the
        // concern fills the relation from the legacy user_id shape only if it
        // comes back empty.
        $patient->load(['allergies', 'diagnoses', 'documents']);
        $this->applyLegacyRecordFallback($patient);

        return Inertia::render('doctor/patient-records/patient-record-detail', [
            'patient' => $this->mapPatientSummary($patient),
            'profile' => $this->mapPatientProfile($patient),
            'allergies' => $this->mapAllergies($patient),
            'diagnoses' => $this->mapDiagnoses($patient),
            'documents' => $this->mapDocuments($patient, 'doctor.patient-records.documents.download'),
            'visits' => $this->visitHistory($patient),
            'latestVitals' => $this->latestVitals($patient),
        ]);
    }

    // ── Allergies ─────────────────────────────────────────────────────────────

    public function storeAllergy(Request $request, Patient $patient): RedirectResponse
    {
        $request->validate([
            'allergen' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'in:mild,moderate,severe'],
            'reaction' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'allergen.required' => 'Please enter the allergen name (e.g. Penicillin, Shellfish).',
            'allergen.max' => 'Allergen name must be under 255 characters.',
            'severity.required' => 'Please select a severity level.',
            'severity.in' => 'Severity must be mild, moderate, or severe.',
            'reaction.max' => 'Reaction description must be under 255 characters.',
            'notes.max' => 'Notes must be under 1000 characters.',
        ]);

        PatientAllergy::create([
            'patient_id' => $patient->id,
            'user_id' => $patient->guarantor_id,
            'recorded_by' => Auth::id(),
            'allergen' => $request->string('allergen')->toString(),
            'severity' => $request->string('severity')->toString(),
            'reaction' => $request->string('reaction')->toString() ?: null,
            'notes' => $request->string('notes')->toString() ?: null,
        ]);

        return back()->with('success', "Allergy recorded for {$patient->first_name}.");
    }

    public function destroyAllergy(PatientAllergy $allergy): RedirectResponse
    {
        $allergy->delete();

        return back()->with('success', 'Allergy record removed.');
    }

    // ── Diagnoses ─────────────────────────────────────────────────────────────

    public function storeDiagnosis(Request $request, Patient $patient): RedirectResponse
    {
        $request->validate([
            'diagnosis' => ['required', 'string', 'max:255'],
            'icd_code' => ['nullable', 'string', 'max:20', 'regex:/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/i'],
            'type' => ['required', 'in:primary,secondary,chronic'],
            'status' => ['required', 'in:active,resolved,chronic'],
            'diagnosed_at' => ['required', 'date', 'before_or_equal:today'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'diagnosis.required' => 'Please enter the diagnosis name.',
            'diagnosis.max' => 'Diagnosis name must be under 255 characters.',
            'icd_code.regex' => 'ICD code format is invalid. Example: J06.9 or A01.',
            'icd_code.max' => 'ICD code must be under 20 characters.',
            'type.required' => 'Please select the diagnosis type.',
            'type.in' => 'Type must be primary, secondary, or chronic.',
            'status.required' => 'Please select the diagnosis status.',
            'status.in' => 'Status must be active, resolved, or chronic.',
            'diagnosed_at.required' => 'Please enter the date of diagnosis.',
            'diagnosed_at.date' => 'The diagnosis date is not a valid date.',
            'diagnosed_at.before_or_equal' => 'The diagnosis date cannot be in the future.',
            'notes.max' => 'Notes must be under 2000 characters.',
        ]);

        PatientDiagnosis::create([
            'patient_id' => $patient->id,
            'user_id' => $patient->guarantor_id,
            'appointment_id' => $request->input('appointment_id'),
            'recorded_by' => Auth::id(),
            'icd_code' => $request->string('icd_code')->toString() ?: null,
            'diagnosis' => $request->string('diagnosis')->toString(),
            'type' => $request->string('type')->toString(),
            'status' => $request->string('status')->toString(),
            'diagnosed_at' => $request->date('diagnosed_at'),
            'notes' => $request->string('notes')->toString() ?: null,
        ]);

        return back()->with('success', 'Diagnosis recorded.');
    }

    public function updateDiagnosis(Request $request, PatientDiagnosis $diagnosis): RedirectResponse
    {
        $request->validate(['status' => ['required', 'in:active,resolved,chronic']]);
        $diagnosis->update(['status' => $request->string('status')->toString()]);

        return back()->with('success', 'Diagnosis updated.');
    }

    public function destroyDiagnosis(PatientDiagnosis $diagnosis): RedirectResponse
    {
        $diagnosis->delete();

        return back()->with('success', 'Diagnosis removed.');
    }

    // ── Documents ─────────────────────────────────────────────────────────────

    public function uploadDocument(Request $request, Patient $patient): RedirectResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:lab,imaging,referral,prescription,report,other'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'file' => ['required', 'file', 'max:20480',
                'mimes:pdf,jpg,jpeg,png,gif,doc,docx'],
        ], [
            'title.required' => 'Please enter a title for this document.',
            'title.max' => 'Document title must be under 255 characters.',
            'type.required' => 'Please select the document type.',
            'type.in' => 'Invalid document type selected.',
            'file.required' => 'Please select a file to upload.',
            'file.file' => 'The uploaded file is invalid.',
            'file.max' => 'File size must not exceed 20 MB.',
            'file.mimes' => 'Only PDF, image (JPG, PNG, GIF), or Word document files are allowed.',
        ]);

        $file = $request->file('file');
        $path = $file->store("patient-documents/{$patient->id}", 'local');

        PatientDocument::create([
            'patient_id' => $patient->id,
            'user_id' => $patient->guarantor_id,
            'appointment_id' => $request->input('appointment_id'),
            'uploaded_by' => Auth::id(),
            'title' => $request->string('title')->toString(),
            'type' => $request->string('type')->toString(),
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

    public function destroyDocument(PatientDocument $document): RedirectResponse
    {
        Storage::disk('local')->delete($document->file_path);
        $document->delete();

        return back()->with('success', 'Document removed.');
    }
}
