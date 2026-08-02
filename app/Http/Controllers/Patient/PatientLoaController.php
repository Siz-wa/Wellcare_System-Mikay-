<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\LoaRequest;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Check LOA status" — the patient half of the LOA workflow (Objective 1.6,
 * Fig. 4 "LOA Entered\Modified", Fig. 11's `LOA Status` process reading
 * `tbl_LOA` and returning "LOA Status Result" to the patient).
 *
 * Scoped through `patients.guarantor_id`, never `loa_requests.user_id`. The
 * `user_id` column is the guarantor account and is shared between siblings, so
 * scoping on it would show one family member another's coverage.
 *
 * Unlike lab results there is no review gate here: an LOA's status is
 * administrative, not clinical, and the patient is the party waiting on it.
 */
class PatientLoaController extends Controller
{
    public function index(): Response
    {
        $patientIds = Auth::user()
            ->guaranteedPatients()
            ->pluck('id');

        $requests = LoaRequest::whereIn('patient_id', $patientIds)
            ->with(['patient', 'appointment.doctor.doctorProfile'])
            ->orderByDesc('requested_at')
            ->get()
            ->map(fn (LoaRequest $loa) => $this->mapRequest($loa))
            ->values();

        return Inertia::render('user/loa-status/loa-status', [
            'requests' => $requests,
            'stats' => [
                'total' => $requests->count(),
                'pending' => $requests->where('status', 'submitted')->count(),
                'approved' => $requests->where('status', 'approved')->count(),
                'rejected' => $requests->where('status', 'rejected')->count(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapRequest(LoaRequest $loa): array
    {
        $appointment = $loa->appointment;

        return [
            'id' => $loa->id,
            'loaNumber' => $loa->loa_number,
            'status' => $loa->display_status,
            'patientName' => $loa->patient?->full_name ?? 'Unknown patient',
            'patientInitials' => $loa->patient?->initials ?? '??',
            'hmoProvider' => $loa->hmo_provider,
            'hmoId' => $loa->hmo_id,

            'requestedAt' => $loa->requested_at?->format('d M Y'),
            'requestedAgo' => $loa->requested_at?->diffForHumans(),
            'decidedAt' => ($loa->approved_at ?? $loa->rejected_at)?->format('d M Y'),
            'validUntil' => $loa->valid_until?->format('d M Y'),
            'isExpired' => $loa->is_expired,

            // The HR officer's note — the reason a rejection happened, which is
            // the only actionable part of a decision for the patient.
            'remarks' => $loa->remarks,

            'appointment' => $appointment ? [
                'date' => $appointment->appointment_date?->format('d M Y'),
                'time' => $appointment->appointment_time,
                'service' => ucwords(str_replace('-', ' ', $appointment->service)),
                'doctor' => $appointment->doctor?->doctorProfile?->display_name,
                'status' => $appointment->status,
            ] : null,
        ];
    }
}
