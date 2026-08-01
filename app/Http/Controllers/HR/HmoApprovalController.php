<?php

namespace App\Http\Controllers\HR;

use App\Exceptions\InvalidLoaTransitionException;
use App\Http\Controllers\Controller;
use App\Models\LoaRequest;
use App\Services\LoaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The HR half of the LOA workflow — Figure 6 process 4 (APPROVE LOA) and the
 * `manage LOA` process of Figure 8.
 *
 * The queue used to read `appointments.status = 'pending_hmo_approval'`
 * directly. It now reads `loa_requests`, so a decision records a reference
 * number, an approver, a timestamp, a validity window and remarks instead of
 * just flipping an enum. LoaService keeps the appointment status in step.
 */
class HmoApprovalController extends Controller
{
    public function __construct(private LoaService $loaRequests) {}

    public function index(): Response
    {
        $pending = LoaRequest::awaitingApproval()
            ->with(['patient', 'appointment.doctor'])
            ->oldest('requested_at')
            ->get()
            ->map(fn (LoaRequest $loa) => $this->mapLoa($loa));

        $stats = [
            'pending' => $pending->count(),
            'approvedToday' => LoaRequest::whereDate('approved_at', today())->count(),
            'rejectedToday' => LoaRequest::whereDate('rejected_at', today())->count(),
        ];

        return Inertia::render('hr/hmo-approvals/hmo-approvals', [
            'appointments' => $pending->values(),
            'stats' => $stats,
        ]);
    }

    public function approve(Request $request, LoaRequest $loaRequest): RedirectResponse
    {
        $validated = $request->validate([
            'remarks' => ['nullable', 'string', 'max:500'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:today'],
        ], [
            'valid_until.after_or_equal' => 'An LOA cannot be approved with a validity date in the past.',
        ]);

        try {
            $this->loaRequests->approve(
                $loaRequest,
                Auth::user(),
                $validated['remarks'] ?? null,
                isset($validated['valid_until'])
                    ? Carbon::parse($validated['valid_until'])
                    : null,
            );
        } catch (InvalidLoaTransitionException $e) {
            return back()->withErrors(['remarks' => $e->getMessage()]);
        }

        $name = $loaRequest->patient?->full_name ?? 'the patient';

        return back()->with('success',
            "LOA {$loaRequest->loa_number} for {$name} approved and forwarded to the doctor."
        );
    }

    public function reject(Request $request, LoaRequest $loaRequest): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ], [
            'reason.required' => 'Please provide a reason for rejecting this LOA.',
        ]);

        try {
            $this->loaRequests->reject($loaRequest, Auth::user(), $validated['reason']);
        } catch (InvalidLoaTransitionException $e) {
            return back()->withErrors(['reason' => $e->getMessage()]);
        }

        return back()->with('success',
            "LOA {$loaRequest->loa_number} rejected. The patient has been notified."
        );
    }

    /**
     * Keeps the field names the existing hmo-approvals UI already renders, and
     * adds the four the LOA record makes possible.
     *
     * @return array<string, mixed>
     */
    private function mapLoa(LoaRequest $loa): array
    {
        $appointment = $loa->appointment;
        $patient = $loa->patient;

        return [
            'id' => $loa->id,
            'patient' => $patient?->full_name ?? 'Unknown patient',
            'initials' => $patient?->initials ?? '??',
            'email' => $patient?->email ?? $appointment?->email,
            'contactNumber' => $patient?->contact_number ?? $appointment?->contact_number,
            'age' => $patient?->age ?? $appointment?->age,
            'gender' => $patient?->gender ?? $appointment?->gender,
            'service' => $appointment
                ? ucwords(str_replace('-', ' ', $appointment->service))
                : '—',
            'date' => $appointment?->appointment_date?->format('d M Y') ?? '—',
            'rawDate' => $appointment?->appointment_date?->toDateString(),
            'time' => $appointment?->appointment_time ?? '—',
            'hmo' => $loa->hmo_provider,
            'hmoId' => $loa->hmo_id,
            'coverage' => $appointment?->coverage ?? 'hmo',
            'patientStatus' => $appointment?->patient_status,
            'isToday' => (bool) $appointment?->appointment_date?->isToday(),
            'isTomorrow' => (bool) $appointment?->appointment_date?->isTomorrow(),

            // ── New with the LOA record ──────────────────────────────────────
            'loaNumber' => $loa->loa_number,
            'status' => $loa->display_status,
            'requestedAt' => $loa->requested_at?->format('d M Y, g:i A'),
            'requestedAgo' => $loa->requested_at?->diffForHumans(short: true) ?? '—',
            'validUntil' => $loa->valid_until?->format('d M Y'),
            'remarks' => $loa->remarks,
        ];
    }
}
