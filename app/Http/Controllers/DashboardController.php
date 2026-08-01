<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Canonical `/dashboard`. There is no single dashboard in this app — each
     * role has its own — so this dispatches to the right one.
     *
     * Having one stable `dashboard` route name means the frontend and any
     * post-auth redirect can target it without knowing the user's role.
     */
    public function index(): RedirectResponse
    {
        return redirect()->route(self::routeForUser(Auth::user()));
    }

    /**
     * The landing route name for a user's role. Shared with
     * \App\Http\Responses\Auth\LoginResponse so login and /dashboard can never
     * disagree about where a given role belongs.
     */
    public static function routeForUser(?User $user): string
    {
        if ($user?->hasRole('doctor')) {
            return 'doctor.appointments';
        }

        // Admins get their own workspace, but stay in the `role:hr|admin`
        // group in routes/web.php — the landing page changed, their HR access
        // did not. Removing that would recreate the original bug this branch
        // fixed, where an admin fell through to user.dashboard (gated on
        // role:user) and got a 403.
        if ($user?->hasRole('admin')) {
            return 'admin.dashboard';
        }

        if ($user?->hasRole('hr')) {
            return 'hr.dashboard';
        }

        // Nurses live entirely in the lab queue — it is their only workspace.
        if ($user?->hasRole('nurse')) {
            return 'nurse.lab-queue';
        }

        return 'user.dashboard';
    }

    public function book(): Response
    {
        return Inertia::render('generals/book/index');
    }
}
