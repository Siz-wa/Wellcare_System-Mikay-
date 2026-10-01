<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * The Tier 0 workspace — GV-6 and §5.1 of WELLCARE-GOVERNANCE-PLAN.md.
 *
 * Deliberately the smallest dashboard in the application. The owner exists so
 * that the administrator tier below it can be constrained: it appoints and
 * revokes administrators, it is the way back in when the last one is locked
 * out, and it owns system configuration. That is the whole job, and a screen
 * that offered more would be re-creating the "one role that does everything"
 * this tier was introduced to break up.
 *
 * ## What is deliberately absent
 *
 * No patient list, no archive, no credentialing, no clinical anything. The
 * owner holds none of those permissions (see RoleAndPermissionSeeder::MATRIX),
 * so the corresponding routes 403 for them — this controller simply does not
 * pretend otherwise. The reasoning: the tier that can appoint administrators is
 * the tier with the most to gain from a compromise, and keeping it away from
 * the record means an owner compromise costs the control plane and not the
 * charts.
 *
 * The actual appointing happens on `/admin/users`, which the owner reaches
 * because they hold `users.view` — and where they are the only account whose
 * tier lets `User::mayGrantRole('admin')` return true.
 */
class OwnerDashboardController extends Controller
{
    private const RECENT_ACTIVITY_LIMIT = 12;

    /**
     * Log names worth an owner's attention.
     *
     * `auth` carries sign-ins and failed attempts; `User` carries account
     * creation, email changes and activation state. Together they are the
     * control-plane story — who got in, and who changed who could.
     *
     * @var array<int, string>
     */
    private const GOVERNANCE_LOGS = ['auth', 'default'];

    public function index(): Response
    {
        $privileged = User::query()
            ->role(['owner', 'admin', 'dpo'])
            ->with(['profile', 'roles'])
            ->orderBy('email')
            ->get();

        return Inertia::render('owner/dashboard', [
            'privilegedAccounts' => $privileged
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name !== '' ? $user->name : $user->email,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->name ?? 'none',
                    'isActive' => (bool) $user->is_active,
                    // The governance question about a privileged account is not
                    // "did they set up 2FA", it is "is this account protected".
                    // Surfaced per row so an unenrolled administrator is visible
                    // rather than discoverable.
                    'twoFactor' => $user->two_factor_confirmed_at !== null,
                    'lastSeen' => $user->updated_at?->diffForHumans(),
                ])
                ->values(),
            'stats' => [
                'admins' => $privileged->filter(fn (User $u) => $u->hasRole('admin'))->count(),
                'activeAdmins' => $privileged
                    ->filter(fn (User $u) => $u->hasRole('admin') && $u->is_active)
                    ->count(),
                'dpos' => $privileged->filter(fn (User $u) => $u->hasRole('dpo'))->count(),
                // The number that should be zero. A privileged account without
                // a second factor is the weakest link in the control plane, and
                // EnsureTwoFactorEnrolled only nudges — it does not retroact.
                'withoutTwoFactor' => $privileged
                    ->filter(fn (User $u) => $u->two_factor_confirmed_at === null)
                    ->count(),
            ],
            'recentActivity' => Activity::query()
                ->whereIn('log_name', self::GOVERNANCE_LOGS)
                ->with('causer.profile')
                // Same tiebreak as AdminActivityLogController — several entries
                // routinely land in the same second, and ordering on the
                // timestamp alone leaves their order up to the database.
                ->latest()
                ->orderByDesc('id')
                ->limit(self::RECENT_ACTIVITY_LIMIT)
                ->get()
                ->map(fn (Activity $a) => [
                    'id' => $a->id,
                    'description' => $a->description,
                    'event' => $a->event,
                    'causer' => $a->causer?->name ?: ($a->causer?->email ?? 'System'),
                    'ago' => $a->created_at?->diffForHumans(),
                ])
                ->values(),
        ]);
    }
}
