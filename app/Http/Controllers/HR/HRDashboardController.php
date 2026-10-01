<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\LoaRequest;
use Inertia\Inertia;
use Inertia\Response;

class HRDashboardController extends Controller
{
    public function index(): Response
    {
        /*
         * The queue HR can actually act on — read from `loa_requests`, the same
         * source HmoApprovalController uses.
         *
         * This used to count `appointments.status = pending_hmo_approval`
         * instead. The two disagreed: an HMO appointment written without its LOA
         * row (a seeder, or any future write that bypasses LoaService) appeared
         * in this count and in this list, but not in the approvals queue, where
         * the decision is actually made. HR saw six waiting and found three they
         * could open; the other three patients waited on a decision nobody could
         * reach. Counting what can be actioned is the property that keeps the
         * dashboard honest — the two numbers now cannot drift apart, because
         * there is only one number.
         */
        $pending = LoaRequest::awaitingApproval()
            ->with(['patient', 'appointment'])
            ->oldest('requested_at')
            ->get()
            ->map(fn (LoaRequest $loa) => [
                // The appointment id, because the dashboard's rows link through
                // to the visit; the queue keys its own rows by LOA id.
                'id' => $loa->appointment_id,
                'patient' => $loa->patient?->full_name ?? 'Unknown patient',
                'initials' => $loa->patient?->initials ?? '??',
                'service' => $loa->appointment
                    ? ucwords(str_replace('-', ' ', $loa->appointment->service))
                    : '—',
                'date' => $loa->appointment?->appointment_date?->format('d M Y') ?? '—',
                'time' => $loa->appointment?->appointment_time ?? '—',
                'hmo' => $loa->hmo_provider,
                'hmoId' => $loa->hmo_id,
                'loaNumber' => $loa->loa_number,
                'isToday' => (bool) $loa->appointment?->appointment_date?->isToday(),
                'isTomorrow' => (bool) $loa->appointment?->appointment_date?->isTomorrow(),
            ]);

        $stats = [
            'pendingHmo' => $pending->count(),
            // Same source and same expressions as HmoApprovalController's own
            // tiles, so the dashboard and the queue never report different
            // numbers for the same day's work. Derived from `appointments`
            // before, where "approved today" was inferred from an appointment
            // whose `updated_at` happened to fall today — true of any edit, not
            // just an approval.
            'approvedToday' => LoaRequest::whereDate('approved_at', today())->count(),
            'rejectedToday' => LoaRequest::whereDate('rejected_at', today())->count(),
            'totalAppointments' => Appointment::whereNotIn('status', ['cancelled', 'no_show'])
                ->whereDate('appointment_date', today())
                ->count(),
        ];

        return Inertia::render('hr/dashboard', [
            'pending' => $pending,
            'stats' => $stats,
        ]);
    }
}
