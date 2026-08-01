<?php

namespace App\Http\Controllers\Nurse;

use App\Http\Controllers\Controller;
use App\Models\LoaRequest;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The nurse's LOA monitor — Figure 10's `tb5 LOA Monitoring` process, which
 * reads the LOA database and returns "LOA Status Info" to the staff nurse.
 *
 * Read-only by design. Figure 10 draws the nurse entering HMO details and
 * *checking* approval status; the decision itself belongs to HR (Figure 8), so
 * this surface deliberately exposes no approve or reject action.
 */
class LoaMonitoringController extends Controller
{
    public function index(): Response
    {
        $pending = LoaRequest::awaitingApproval()
            ->with(['patient', 'appointment'])
            ->oldest('requested_at')
            ->get()
            ->map(fn (LoaRequest $loa) => $this->mapRequest($loa));

        $recent = LoaRequest::whereIn('status', ['approved', 'rejected', 'expired'])
            ->with(['patient', 'appointment'])
            ->latest('updated_at')
            ->limit(15)
            ->get()
            ->map(fn (LoaRequest $loa) => $this->mapRequest($loa));

        return Inertia::render('nurse/loa-monitoring/loa-monitoring', [
            'pending' => $pending->values(),
            'recent' => $recent->values(),
            'stats' => [
                'pending' => $pending->count(),
                'approvedToday' => LoaRequest::whereDate('approved_at', today())->count(),
                'rejectedToday' => LoaRequest::whereDate('rejected_at', today())->count(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapRequest(LoaRequest $loa): array
    {
        $patient = $loa->patient;
        $appointment = $loa->appointment;

        return [
            'id' => (string) $loa->id,
            'loaNumber' => $loa->loa_number,
            'name' => $patient?->full_name ?? 'Unknown patient',
            'initials' => $patient?->initials ?? '??',
            'patientId' => $patient?->clinic_id ?? "P-{$loa->patient_id}",
            'hmoProvider' => $loa->hmo_provider ?? '—',
            'hmoId' => $loa->hmo_id ?? '—',
            'status' => $loa->display_status,
            'service' => $appointment
                ? ucwords(str_replace('-', ' ', $appointment->service))
                : '—',
            'appointmentDate' => $appointment?->appointment_date?->format('d M Y') ?? '—',
            'requestedAt' => $loa->requested_at?->format('d M Y, g:i A'),
            'timeAgo' => $loa->requested_at?->diffForHumans(short: true) ?? '—',
            'validUntil' => $loa->valid_until?->format('d M Y'),
            'remarks' => $loa->remarks,
        ];
    }
}
