<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * GV-9 — hold an account at the password screen until the credential is its
 * owner's alone.
 *
 * Applies to any account flagged `must_change_password`: staff accounts whose
 * first password was typed by the administrator who provisioned them, and the
 * seeded demo accounts that ship with a known one.
 *
 * ## Why this blocks harder than EnsureTwoFactorEnrolled
 *
 * The 2FA middleware nudges — it redirects GETs and refuses writes — because a
 * hard block would have stranded every existing staff account the day it
 * deployed, including the administrator who would have to fix it. That
 * reasoning does not transfer. This flag is only ever set at the moment an
 * account is created, so there is no population of established users to strand;
 * the only accounts it touches are ones that have never been signed into. And
 * the risk it addresses is sharper: a second person currently knows this
 * password, so every request made before the change is a request that person
 * could also have made.
 *
 * It still redirects rather than 403s on safe methods, for the same reason the
 * 2FA one does: a person who cannot see where to go cannot comply.
 *
 * ## Ordering
 *
 * Registered BEFORE EnsureTwoFactorEnrolled in bootstrap/app.php. Both redirect
 * to `security.edit`, and the order is the order of the risk: a password a
 * colleague knows is a live exposure, where a missing second factor is a weaker
 * defence against an attacker who does not have the first one yet. Change the
 * password, then enrol.
 */
class EnsurePasswordIsChanged
{
    /**
     * A human label for the page this gate turned someone away from, e.g.
     * "Dashboard", so the notice on `security.edit` can name it.
     *
     * The flash set below cannot carry it. `security.edit` sits behind password
     * confirmation, so the redirect chain is two hops long and a flash survives
     * one — which is why the manual walkthrough of 2026-09-11 (T-08) found a
     * provisioned administrator being bounced to Settings with the explanation
     * composed, sent, and never rendered. Session state survives both hops.
     */
    public const BLOCKED_LABEL_KEY = 'must_change_password.blocked_label';

    /**
     * Routes that must stay reachable, or the redirect loops.
     *
     * Deliberately narrower than the 2FA middleware's list. `security.edit` is
     * the destination; `user-password.update` is the endpoint that clears the
     * flag; `password.confirm*` is in front of `security.edit`; `logout` is the
     * way out for someone who cannot proceed.
     *
     * Two-factor routes are NOT exempt here. An account in this state should
     * change its password before enrolling anything — and because this
     * middleware runs first, a user in both states is sent to the same page
     * regardless, so exempting them would only let a half-finished account
     * enrol a second factor onto a credential somebody else still knows.
     *
     * Matched by route NAME, not URI: names survive a path change, and a loop
     * introduced by renaming a path is a lockout.
     *
     * @var array<int, string>
     */
    private const EXEMPT_ROUTES = [
        'security.edit',
        'user-password.update',
        'logout',
        'password.confirm',
        'password.confirm.store',
        'password.confirmation',

        // Exempted defensively rather than because a live path reaches them —
        // `security.edit` sits behind `verified`, and an unverified account in
        // this state would otherwise bounce between the two forever. The cost
        // of preventing a total lockout is three strings.
        'verification.notice',
        'verification.verify',
        'verification.send',
    ];

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->must_change_password) {
            return $next($request);
        }

        if ($this->isExempt($request)) {
            return $next($request);
        }

        // A write from an account whose password a second person knows is
        // exactly what this exists to prevent, and redirecting a POST would
        // discard its payload while looking to the user like it saved.
        if (! $request->isMethodSafe()) {
            abort(403, 'Set your own password before making changes.');
        }

        $request->session()->put(self::BLOCKED_LABEL_KEY, $this->labelFor($request));

        return redirect()->route('security.edit')->with(
            'error',
            'This account is still using the password it was created with. '
            .'Please set a password only you know before continuing.'
        );
    }

    private function isExempt(Request $request): bool
    {
        $name = $request->route()?->getName();

        return $name !== null && in_array($name, self::EXEMPT_ROUTES, true);
    }

    /**
     * A readable name for the blocked page, derived from its route name, so
     * `admin.dashboard` reads as "Dashboard".
     *
     * Derived rather than table-driven for the same reason
     * EnsureTwoFactorEnrolled does it this way: a new route gets a sensible
     * label without anybody remembering to register one.
     */
    private function labelFor(Request $request): ?string
    {
        $name = $request->route()?->getName();

        if ($name === null) {
            return null;
        }

        $segments = explode('.', $name);
        $last = end($segments);

        return $last === false || $last === '' ? null : Str::headline($last);
    }
}
