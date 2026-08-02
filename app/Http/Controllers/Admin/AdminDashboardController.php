<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Models\Appointment;
use App\Models\LoaRequest;
use App\Models\Patient;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * Figure 4's admin "Dashboard" flow.
 *
 * An account-and-system overview rather than a clinical one: who exists, which
 * accounts are suspended, what is archived, and what changed recently. The
 * clinical numbers live on the HR dashboard, which admins can still reach.
 *
 * Deliberately no charts or trend analysis — that is Objective 1.5, and
 * building half of it here would mean building it twice (see Phase 6).
 */
class AdminDashboardController extends Controller
{
    private const RECENT_ACTIVITY_LIMIT = 8;

    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'totalUsers' => User::count(),
                'activeUsers' => User::active()->count(),
                'inactiveUsers' => User::inactive()->count(),
                'patients' => Patient::count(),
                'archivedAppointments' => Appointment::onlyTrashed()->count(),
                'archivedPatients' => Patient::onlyTrashed()->count(),
                'appointmentsToday' => Appointment::whereDate('appointment_date', today())
                    ->whereNotIn('status', ['cancelled', 'no_show'])
                    ->count(),
                'pendingLoa' => LoaRequest::where('status', 'submitted')->count(),
            ],
            // One grouped query rather than five counts — the role list is
            // small but this is the dashboard's hottest read.
            'roleBreakdown' => collect(StoreUserRequest::ROLES)
                ->map(fn (string $role) => [
                    'role' => $role,
                    'total' => User::role($role)->count(),
                    'active' => User::role($role)->active()->count(),
                ])
                ->values(),
            'recentActivity' => Activity::with('causer.profile')
                // Same tiebreak as AdminActivityLogController — see the note
                // there. Without it, same-second entries order arbitrarily.
                ->latest()
                ->orderByDesc('id')
                ->limit(self::RECENT_ACTIVITY_LIMIT)
                ->get()
                ->map(fn (Activity $a) => [
                    'id' => $a->id,
                    'description' => $a->description,
                    'event' => $a->event,
                    'logName' => $a->log_name,
                    'causer' => $a->causer?->name ?: ($a->causer?->email ?? 'System'),
                    'ago' => $a->created_at?->diffForHumans(),
                ])
                ->values(),
        ]);
    }
}
