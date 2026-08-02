<?php

namespace App\Concerns;

use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * The read half of a patient's clinical record, shared by the doctor and nurse
 * record screens.
 *
 * Extracted during Phase 5 so the two roles cannot drift apart on *what* a
 * record is. They differ on what they may write — see the capability split in
 * the nurse controller — but a record must read identically for both, and the
 * legacy fallback below is subtle enough that a second hand-rolled copy would
 * eventually disagree with this one.
 *
 * The write methods deliberately stay on the individual controllers: that is
 * exactly where the two roles diverge, and a shared trait carrying them would
 * hand the nurse the doctor's diagnosis methods by inheritance.
 */
trait ReadsPatientRecords
{
    /**
     * Patients, filtered by the record screens' shared search/service filters.
     */
    protected function patientRecordQuery(Request $request): Builder
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

        return $query;
    }

    /**
     * The appointments that definitively belong to THIS patient.
     *
     * Pre-migration rows carry `patient_id = NULL` and only a name + contact
     * number, so they are matched on those. Without this, two patients sharing
     * one guarantor account would see each other's history — the exact bleed
     * the Patient/User split exists to prevent.
     */
    protected function ownAppointmentIds(Patient $patient): Collection
    {
        return $this->ownAppointmentsQuery($patient)->pluck('id');
    }

    protected function ownAppointmentsQuery(Patient $patient): Builder
    {
        return Appointment::where(function ($q) use ($patient) {
            $q->where('patient_id', $patient->id)
                ->orWhere(function ($q2) use ($patient) {
                    $q2->whereNull('patient_id')
                        ->whereRaw('LOWER(first_name) = ?', [strtolower($patient->first_name)])
                        ->whereRaw('LOWER(last_name) = ?', [strtolower($patient->last_name)])
                        ->where('contact_number', $patient->contact_number);
                });
        });
    }

    /**
     * Back-fill allergies, diagnoses and documents for records created before
     * `patient_id` existed on those tables. Only ever fills a relation that
     * came back empty, so a migrated record is untouched.
     */
    protected function applyLegacyRecordFallback(Patient $patient): void
    {
        if (! $patient->guarantor_id) {
            return;
        }

        $ownAppointmentIds = $this->ownAppointmentIds($patient);

        $scoped = fn (Builder $q) => $q
            ->where('user_id', $patient->guarantor_id)
            ->whereNull('patient_id')
            ->where(function ($inner) use ($ownAppointmentIds) {
                $inner->whereIn('appointment_id', $ownAppointmentIds)
                    ->orWhereNull('appointment_id');
            });

        if ($patient->allergies->isEmpty()) {
            $patient->setRelation('allergies', $scoped(PatientAllergy::query())->get());
        }

        if ($patient->diagnoses->isEmpty()) {
            $patient->setRelation(
                'diagnoses',
                $scoped(PatientDiagnosis::query())->orderByDesc('diagnosed_at')->get()
            );
        }

        if ($patient->documents->isEmpty()) {
            $patient->setRelation(
                'documents',
                $scoped(PatientDocument::query())->orderByDesc('created_at')->get()
            );
        }
    }

    /**
     * Completed visits with their SOAP assessment, vitals and prescriptions.
     *
     * @return Collection<int, array<string, mixed>>
     */
    protected function visitHistory(Patient $patient): Collection
    {
        return $this->ownAppointmentsQuery($patient)
            ->where('status', 'completed')
            ->with('consultationSession.prescriptions')
            ->orderByDesc('appointment_date')
            ->get()
            ->map(function (Appointment $a) {
                $session = $a->consultationSession;

                return [
                    'id' => $a->id,
                    'date' => $a->appointment_date->format('d M Y'),
                    'service' => ucwords(str_replace('-', ' ', $a->service)),
                    'soap' => $session ? [
                        'assessment' => $session->assessment ?? '',
                        'plan' => $session->plan ?? '',
                    ] : null,
                    'vitals' => $session ? $this->mapVitals($session) : null,
                    'prescriptions' => $session
                        ? $session->prescriptions->map(fn ($p) => [
                            'name' => $p->name,
                            'instructions' => $p->instructions,
                        ])->toArray()
                        : [],
                ];
            });
    }

    /**
     * The most recent visit that actually recorded vitals.
     *
     * @return array<string, string>|null
     */
    protected function latestVitals(Patient $patient): ?array
    {
        $session = $this->ownAppointmentsQuery($patient)
            ->where('status', 'completed')
            ->whereHas('consultationSession', fn ($q) => $q->whereNotNull('blood_pressure')->orWhereNotNull('heart_rate')
            )
            ->with('consultationSession')
            ->orderByDesc('appointment_date')
            ->first()
            ?->consultationSession;

        return $session ? $this->mapVitals($session) : null;
    }

    /**
     * @return array<string, string>
     */
    protected function mapVitals(ConsultationSession $session): array
    {
        return [
            'bloodPressure' => $session->blood_pressure ?? '',
            'heartRate' => $session->heart_rate ?? '',
            'temperature' => $session->temperature ?? '',
            'oxygenSaturation' => $session->oxygen_saturation ?? '',
            'weight' => $session->weight ?? '',
            'height' => $session->height ?? '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapPatientProfile(Patient $patient): array
    {
        return [
            'firstName' => $patient->first_name,
            'lastName' => $patient->last_name,
            'birthdate' => $patient->birthdate?->format('d M Y'),
            'gender' => $patient->gender,
            'address' => $patient->address,
            'contactNumber' => $patient->contact_number,
            'civilStatus' => $patient->civil_status,
            'clientNumber' => $patient->clinic_id,
            'email' => $patient->email,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapPatientSummary(Patient $p): array
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
            'id' => $p->id,
            'patientId' => $p->clinic_id ?? ('REC-'.str_pad((string) $p->id, 3, '0', STR_PAD_LEFT)),
            'name' => $p->full_name,
            'initials' => $p->initials,
            'email' => $p->email,
            'lastUpdate' => $lastAppt
                ? $lastAppt->appointment_date->format('d M Y')
                : $p->created_at->format('d M Y'),
            'docCount' => $p->documents_count ?? 0,
            'appointmentCount' => $p->appointments_count ?? 0,
            'hasAllergy' => $hasAllergy,
            'activeDiagnoses' => $activeDiag,
            'status' => 'verified',
            'allergySummary' => $hasAllergy
                ? $p->allergies->pluck('allergen')->implode(', ')
                : null,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function mapAllergies(Patient $patient): array
    {
        return $patient->allergies->map(fn ($a) => [
            'id' => $a->id,
            'allergen' => $a->allergen,
            'severity' => $a->severity,
            'reaction' => $a->reaction,
            'notes' => $a->notes,
        ])->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function mapDiagnoses(Patient $patient): array
    {
        return $patient->diagnoses->map(fn ($d) => [
            'id' => $d->id,
            'icdCode' => $d->icd_code,
            'diagnosis' => $d->diagnosis,
            'type' => $d->type,
            'status' => $d->status,
            'diagnosedAt' => $d->diagnosed_at->format('d M Y'),
            'notes' => $d->notes,
        ])->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function mapDocuments(Patient $patient, string $downloadRouteName): array
    {
        return $patient->documents->map(fn ($doc) => [
            'id' => $doc->id,
            'title' => $doc->title,
            'type' => $doc->type,
            'fileName' => $doc->file_name,
            'size' => $doc->formatted_size,
            'uploadedAt' => $doc->created_at->format('d M Y'),
            'downloadUrl' => route($downloadRouteName, $doc->id),
        ])->values()->all();
    }
}
