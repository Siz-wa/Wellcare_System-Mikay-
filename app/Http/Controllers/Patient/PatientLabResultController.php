<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\LabTestResult;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "View Laboratory Results" — the patient half of the lab workflow
 * (Fig. 4 context diagram, Fig. 11 patient DFD).
 *
 * ONLY `status = 'reviewed'` rows are ever returned. A result sits at
 * `requested` while the nurse has yet to encode it and `recorded` while it
 * waits on the doctor; neither has been clinically interpreted, and releasing
 * raw values to a patient before a doctor has read them is the failure mode
 * Bruno et al. (2022) describe — cited in Chapter 2 of the paper.
 *
 * Scoped through `patients.guarantor_id`, never `lab_test_results.user_id`.
 * The `user_id` column is the guarantor account and is shared between siblings.
 */
class PatientLabResultController extends Controller
{
    public function index(): Response
    {
        $patientIds = Auth::user()
            ->guaranteedPatients()
            ->pluck('id');

        $results = LabTestResult::whereIn('patient_id', $patientIds)
            ->where('status', 'reviewed')
            ->with(['patient', 'parameters', 'reviewedBy.doctorProfile'])
            ->orderByDesc('reviewed_at')
            ->get()
            ->map(fn (LabTestResult $r) => $this->mapResult($r))
            ->values();

        return Inertia::render('user/lab-results/lab-results', [
            'results' => $results,
            'stats' => [
                'total' => $results->count(),
                'abnormal' => $results->whereIn('severity', ['abnormal', 'critical'])->count(),
                'patients' => $patientIds->count(),
            ],
        ]);
    }

    /**
     * Mirrors the parameter shape of Doctor\LabReviewController::mapResult() so
     * a value reads identically on both surfaces.
     *
     * @return array<string, mixed>
     */
    private function mapResult(LabTestResult $result): array
    {
        return [
            'id' => $result->id,
            'testName' => $result->test_name,
            'patientName' => $result->patient?->full_name ?? 'Unknown patient',
            'patientInitials' => $result->patient?->initials ?? '??',
            'severity' => $result->severity,
            'reviewedAt' => $result->reviewed_at?->format('d M Y'),
            'reviewedAgo' => $result->reviewed_at?->diffForHumans(),
            'reviewedBy' => $result->reviewedBy?->doctorProfile?->display_name,

            // The doctor's written reading — the part a patient can act on.
            // The nurse's raw `notes` are intentionally not exposed.
            'interpretation' => $result->interpretation,

            'parameters' => $result->parameters->map(fn ($p) => [
                'name' => $p->name,
                'result' => $p->result,
                'unit' => $p->unit ?? '',
                'refRange' => $p->ref_range ?? '',
                'status' => $p->status,
            ])->values(),
        ];
    }
}
