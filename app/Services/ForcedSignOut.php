<?php

namespace App\Services;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * The app signing somebody out mid-request, and telling them why.
 *
 * Two middleware do this — EnforceIdleTimeout (GV-8) and EnsureUserIsActive —
 * and both used to end the session with
 * `redirect()->route('login')->withErrors(['email' => ...])`.
 *
 * That message never appeared. `auth/login/sections/login-inform-panel.tsx`
 * reads `errors` from the Inertia `<Form>` render-prop, which carries only that
 * form's own submission errors; a validation bag flashed by a redirect has
 * nowhere to land on a page nobody has submitted yet. The manual walkthrough of
 * 2026-09-11 caught it in T-13 — the administrator was signed out exactly on
 * schedule and returned to an ordinary login screen with no indication that
 * anything had happened. The deactivation case was worse: a suspended nurse
 * could not tell a suspension from a mistyped password.
 *
 * It is not a validation failure on the email field either. Nothing is wrong
 * with what the person typed, because they have not typed anything — so the
 * reason travels as its own session notice and renders as a notice.
 *
 * A final class rather than a trait because FortifyServiceProvider needs the
 * key to build the login view, and PHP does not allow a trait constant to be
 * read through the trait's own name.
 */
final class ForcedSignOut
{
    /**
     * Session key the login view reads to explain an unexpected sign-out.
     *
     * Deliberately separate from Fortify's `status`, which the login page
     * renders as a green success alert — "this account has been deactivated"
     * with a tick beside it would be worse than saying nothing.
     */
    public const NOTICE_KEY = 'auth.signed_out_notice';

    /**
     * Sign out, destroy the session so it cannot be replayed, and carry one
     * sentence to the login page.
     */
    public static function withNotice(Request $request, string $notice): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Flashed after invalidate(), so it lands on the session the user
        // actually arrives at the login page holding.
        $request->session()->flash(self::NOTICE_KEY, $notice);

        return redirect()->route('login');
    }
}
