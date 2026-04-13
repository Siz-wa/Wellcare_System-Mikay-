<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
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

class PatientRecordController extends Controller
{
    // ── Index ─────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $query = Patient::with(['allergies', 'diagnoses' => fn ($q) => $q->where('status', 'active')])
            ->withCount(['appointments', 'documents'])
            ->orderByDesc('created_at');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('clinic_id', 'like', "%{$search}%");
            });
        }

        if ($service = $request->string('service')->toString()) {
            $query->whereHas('appointments', fn ($q) => $q->where('service', $service));
        }

        $patients = $query->paginate(20)->through(fn (Patient $p) => $this->mapPatient($p));

        return Inertia::render('doctor/patient-records/patient-records', [
            'patients' => $patients,
            'filters'  => [
                'search'  => $request->string('search')->toString(),
                'service' => $request->string('service')->toString(),
            ],
        ]);
    }

    // ── Show ──────────────────────────────────────────────────────────────────

    public function show(Patient $patient): Response
    {
        // Always try patient_id first (correct path for all new records)
        $patient->load(['allergies', 'diagnoses', 'documents']);

        // ── Fallback for pre-migration records ────────────────────────────────
        // Old records were created with user_id only (patient_id = NULL).
        // We scope by the appointment IDs that belong specifically to THIS
        // patient (matched by name + contact), so records don't bleed across
        // patients who share the same guarantor account.
        if ($patient->guarantor_id) {
            // The set of appointment IDs definitively belonging to this patient
            $ownAppointmentIds = Appointment::where(function ($q) use ($patient) {
                    $q->where('patient_id', $patient->id)
                      ->orWhere(function ($q2) use ($patient) {
                          $q2->whereNull('patient_id')
                             ->whereRaw('LOWER(first_name) = ?', [strtolower($patient->first_name)])
                             ->whereRaw('LOWER(last_name) = ?',  [strtolower($patient->last_name)])
                             ->where('contact_number', $patient->contact_number);
                      });
                })
                ->pluck('id');

            // Allergies fallback — now has appointment_id after migration
            if ($patient->allergies->isEmpty()) {
                $patient->setRelation('allergies',
                    PatientAllergy::where('user_id', $patient->guarantor_id)
                        ->whereNull('patient_id')
                        ->where(function ($q) use ($ownAppointmentIds) {
                            $q->whereIn('appointment_id', $ownAppointmentIds)
                              ->orWhereNull('appointment_id');
                        })
                        ->get()
                );
            }

            // Diagnoses fallback
            if ($patient->diagnoses->isEmpty()) {
                $patient->setRelation('diagnoses',
                    PatientDiagnosis::where('user_id', $patient->guarantor_id)
                        ->whereNull('patient_id')
                        ->where(function ($q) use ($ownAppointmentIds) {
                            $q->whereIn('appointment_id', $ownAppointmentIds)
                              ->orWhereNull('appointment_id');
                        })
                        ->orderByDesc('diagnosed_at')
                        ->get()
                );
            }

            // Documents fallback
            if ($patient->documents->isEmpty()) {
                $patient->setRelation('documents',
                    PatientDocument::where('user_id', $patient->guarantor_id)
                        ->whereNull('patient_id')
                        ->where(function ($q) use ($ownAppointmentIds) {
                            $q->whereIn('appointment_id', $ownAppointmentIds)
                              ->orWhereNull('appointment_id');
                        })
                        ->orderByDesc('created_at')
                        ->get()
                );
            }
        }

        // ── Visit history ─────────────────────────────────────────────────────
        $visits = Appointment::where(function ($q) use ($patient) {
                $q->where('patient_id', $patient->id)
                  ->orWhere(function ($q2) use ($patient) {
                      $q2->whereNull('patient_id')
                         ->whereRaw('LOWER(first_name) = ?', [strtolower($patient->first_name)])
                         ->whereRaw('LOWER(last_name) = ?',  [strtolower($patient->last_name)])
                         ->where('contact_number', $patient->contact_number);
                  });
            })
            ->where('status', 'completed')
            ->with('consultationSession.prescriptions')
            ->orderByDesc('appointment_date')
            ->get()
            ->map(function (Appointment $a) {
                $session = $a->consultationSession;
                return [
                    'id'      => $a->id,
                    'date'    => $a->appointment_date->format('d M Y'),
                    'service' => ucwords(str_replace('-', ' ', $a->service)),
                    'soap'    => $session ? [
                        'assessment' => $session->assessment ?? '',
                        'plan'       => $session->plan       ?? '',
                    ] : null,
                    'vitals'  => $session ? [
                        'bloodPressure'    => $session->blood_pressure    ?? '',
                        'heartRate'        => $session->heart_rate        ?? '',
                        'temperature'      => $session->temperature       ?? '',
                        'oxygenSaturation' => $session->oxygen_saturation ?? '',
                        'weight'           => $session->weight            ?? '',
                        'height'           => $session->height            ?? '',
                    ] : null,
                    'prescriptions' => $session
                        ? $session->prescriptions->map(fn ($p) => [
                            'name'         => $p->name,
                            'instructions' => $p->instructions,
                        ])->toArray()
                        : [],
                ];
            });

        // ── Latest vitals ─────────────────────────────────────────────────────
        $latestVitals = Appointment::where(function ($q) use ($patient) {
                $q->where('patient_id', $patient->id)
                  ->orWhere(function ($q2) use ($patient) {
                      $q2->whereNull('patient_id')
                         ->whereRaw('LOWER(first_name) = ?', [strtolower($patient->first_name)])
                         ->whereRaw('LOWER(last_name) = ?',  [strtolower($patient->last_name)])
                         ->where('contact_number', $patient->contact_number);
                  });
            })
            ->where('status', 'completed')
            ->whereHas('consultationSession', fn ($q) =>
                $q->whereNotNull('blood_pressure')->orWhereNotNull('heart_rate')
            )
            ->with('consultationSession')
            ->orderByDesc('appointment_date')
            ->first()
            ?->consultationSession;

        return Inertia::render('doctor/patient-records/patient-record-detail', [
            'patient'    => $this->mapPatient($patient),
            'profile'    => [
                'firstName'     => $patient->first_name,
                'lastName'      => $patient->last_name,
                'birthdate'     => $patient->birthdate?->format('d M Y'),
                'gender'        => $patient->gender,
                'address'       => $patient->address,
                'contactNumber' => $patient->contact_number,
                'civilStatus'   => $patient->civil_status,
                'clientNumber'  => $patient->clinic_id,
                'email'         => $patient->email,
            ],
            'allergies'  => $patient->allergies->map(fn ($a) => [
                'id'       => $a->id,
                'allergen' => $a->allergen,
                'severity' => $a->severity,
                'reaction' => $a->reaction,
                'notes'    => $a->notes,
            ]),
            'diagnoses'  => $patient->diagnoses->map(fn ($d) => [
                'id'          => $d->id,
                'icdCode'     => $d->icd_code,
                'diagnosis'   => $d->diagnosis,
                'type'        => $d->type,
                'status'      => $d->status,
                'diagnosedAt' => $d->diagnosed_at->format('d M Y'),
                'notes'       => $d->notes,
            ]),
            'documents'  => $patient->documents->map(fn ($doc) => [
                'id'          => $doc->id,
                'title'       => $doc->title,
                'type'        => $doc->type,
                'fileName'    => $doc->file_name,
                'size'        => $doc->formatted_size,
                'uploadedAt'  => $doc->created_at->format('d M Y'),
                'downloadUrl' => route('doctor.patient-records.documents.download', $doc->id),
            ]),
            'visits'       => $visits,
            'latestVitals' => $latestVitals ? [
                'bloodPressure'    => $latestVitals->blood_pressure    ?? '',
                'heartRate'        => $latestVitals->heart_rate        ?? '',
                'temperature'      => $latestVitals->temperature       ?? '',
                'oxygenSaturation' => $latestVitals->oxygen_saturation ?? '',
                'weight'           => $latestVitals->weight            ?? '',
                'height'           => $latestVitals->height            ?? '',
            ] : null,
        ]);
    }

    // ── Allergies ─────────────────────────────────────────────────────────────

    public function storeAllergy(Request $request, Patient $patient): RedirectResponse
    {
        $request->validate([
            'allergen' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'in:mild,moderate,severe'],
            'reaction' => ['nullable', 'string', 'max:255'],
            'notes'    => ['nullable', 'string', 'max:1000'],
        ]);

        PatientAllergy::create([
            'patient_id'  => $patient->id,
            'user_id'     => $patient->guarantor_id,
            'recorded_by' => Auth::id(),
            'allergen'    => $request->string('allergen')->toString(),
            'severity'    => $request->string('severity')->toString(),
            'reaction'    => $request->string('reaction')->toString() ?: null,
            'notes'       => $request->string('notes')->toString()    ?: null,
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
            'diagnosis'      => ['required', 'string', 'max:255'],
            'icd_code'       => ['nullable', 'string', 'max:20'],
            'type'           => ['required', 'in:primary,secondary,chronic'],
            'status'         => ['required', 'in:active,resolved,chronic'],
            'diagnosed_at'   => ['required', 'date'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'notes'          => ['nullable', 'string', 'max:2000'],
        ]);

        PatientDiagnosis::create([
            'patient_id'     => $patient->id,
            'user_id'        => $patient->guarantor_id,
            'appointment_id' => $request->input('appointment_id'),
            'recorded_by'    => Auth::id(),
            'icd_code'       => $request->string('icd_code')->toString()  ?: null,
            'diagnosis'      => $request->string('diagnosis')->toString(),
            'type'           => $request->string('type')->toString(),
            'status'         => $request->string('status')->toString(),
            'diagnosed_at'   => $request->date('diagnosed_at'),
            'notes'          => $request->string('notes')->toString()     ?: null,
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
            'title'          => ['required', 'string', 'max:255'],
            'type'           => ['required', 'in:lab,imaging,referral,prescription,report,other'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'file'           => ['required', 'file', 'max:20480',
                                 'mimes:pdf,jpg,jpeg,png,gif,doc,docx'],
        ]);

        $file = $request->file('file');
        $path = $file->store("patient-documents/{$patient->id}", 'local');

        PatientDocument::create([
            'patient_id'     => $patient->id,
            'user_id'        => $patient->guarantor_id,
            'appointment_id' => $request->input('appointment_id'),
            'uploaded_by'    => Auth::id(),
            'title'          => $request->string('title')->toString(),
            'type'           => $request->string('type')->toString(),
            'file_path'      => $path,
            'file_name'      => $file->getClientOriginalName(),
            'mime_type'      => $file->getMimeType(),
            'file_size'      => $file->getSize(),
        ]);

        return back()->with('success', 'Document uploaded.');
    }

    public function downloadDocument(PatientDocument $document): \Symfony\Component\HttpFoundation\StreamedResponse
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

    // ── Private helpers ───────────────────────────────────────────────────────

    private function mapPatient(Patient $p): array
    {
        $hasAllergy = $p->relationLoaded('allergies') && $p->allergies->isNotEmpty();
        $activeDiag = $p->relationLoaded('diagnoses')
            ? $p->diagnoses->where('status', 'active')->count()
            : 0;

        $lastAppt = $p->appointments()
            ->where('status', 'completed')
            ->orderByDesc('appointment_date')
            ->first();

        return [
            'id'               => $p->id,
            'patientId'        => $p->clinic_id ?? ('REC-' . str_pad($p->id, 3, '0', STR_PAD_LEFT)),
            'name'             => $p->full_name,
            'initials'         => $p->initials,
            'email'            => $p->email,
            'lastUpdate'       => $lastAppt
                ? $lastAppt->appointment_date->format('d M Y')
                : $p->created_at->format('d M Y'),
            'docCount'         => $p->documents_count   ?? 0,
            'appointmentCount' => $p->appointments_count ?? 0,
            'hasAllergy'       => $hasAllergy,
            'activeDiagnoses'  => $activeDiag,
            'status'           => 'verified',
            'allergySummary'   => $hasAllergy
                ? $p->allergies->pluck('allergen')->implode(', ')
                : null,
        ];
    }
}