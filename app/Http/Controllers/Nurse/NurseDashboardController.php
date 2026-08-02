<?php

namespace App\Http\Controllers\Nurse;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Models\LoaRequest;
use App\Models\Patient;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The nurse's landing page.
 *
 * Sourced from Figure 4's "Dashboard" flow and the Scope's staff-nurse
 * paragraph rather than Figure 10, which draws only five processes and no
 * dashboard among them — see §4 of WELLCARE-BUILD-PLAN.md. Before Phase 5 the
 * nurse landed directly on the lab queue, which is one of their jobs rather
 * than a view of the day.
 *
 * Reads only. Every number here is actionable somewhere else in the portal.
 */
class NurseDashboardController extends Controller
{
    private const UPCOMING_LIMIT = 8;

    public function index(): Response
    {
        $today = Appointment::whereDate('appointment_date', today());

        return Inertia::render('nurse/dashboard/dashboard', [
            'stats' => [
                // The nurse's own queue — reuses the same scope the lab queue
                // screen filters on, so the two can never disagree.
                'pendingLabs' => LabTestResult::awaitingResults()->count(),
                'recordedToday' => LabTestResult::whereDate('recorded_at', today())->count(),
                'criticalToday' => LabTestResult::whereDate('recorded_at', today())
                    ->where('severity', 'critical')
                    ->count(),
                'appointmentsToday' => (clone $today)
                    ->whereNotIn('status', ['cancelled', 'no_show'])
                    ->count(),
                'checkedInToday' => (clone $today)->where('status', 'checked_in')->count(),
                'completedToday' => (clone $today)->where('status', 'completed')->count(),
                // Read-only visibility per Fig. 10; HR owns the decision.
                'pendingLoa' => LoaRequest::where('status', 'submitted')->count(),
                'totalPatients' => Patient::count(),
            ],
            'upcoming' => (clone $today)
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->with(['patientRecord', 'doctor.profile'])
                ->orderBy('appointment_time')
                ->limit(self::UPCOMING_LIMIT)
                ->get()
                ->map(fn (Appointment $a) => [
                    'id' => $a->id,
                    'patient' => $a->patientRecord?->full_name
                        ?? trim($a->first_name.' '.$a->last_name),
                    'initials' => $a->patientRecord?->initials
                        ?? strtoupper(substr($a->first_name, 0, 1).substr($a->last_name, 0, 1)),
                    'service' => ucwords(str_replace('-', ' ', $a->service)),
                    'time' => $a->appointment_time,
                    'status' => $a->status,
                    'doctor' => $a->doctor?->name,
                ])
                ->values(),
        ]);
    }
}
