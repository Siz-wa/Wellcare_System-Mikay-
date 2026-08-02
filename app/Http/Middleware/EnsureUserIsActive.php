<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Half of Figure 4's "Deactivate/Reactivate Acc" flow.
 *
 * Fortify's authenticateUsing() callback refuses a *new* login from a
 * deactivated account. This handles the other half: an account deactivated
 * while its owner is already signed in. Without it, deactivation only takes
 * effect the next time that person happens to log out — which for a
 * compromised or dismissed account is exactly the window that matters.
 *
 * Runs on every authenticated web request, so it is deliberately a single
 * boolean read off the already-loaded user model, not a query.
 */
class EnsureUserIsActive
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'email' => 'This account has been deactivated. Please contact the clinic administrator.',
            ]);
        }

        return $next($request);
    }
}
