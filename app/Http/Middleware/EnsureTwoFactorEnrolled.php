<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * X-01 — two-factor authentication, required of staff rather than offered.
 *
 * Fortify's twoFactorAuthentication() feature was already enabled and the
 * challenge view already registered, so any account COULD turn 2FA on. Nothing
 * required it. A doctor, nurse, HR officer or administrator account each holds
 * read access to a large share of the clinic's patient records — including,
 * since the September work, decrypted diagnoses and SOAP notes — and every one
 * of them was protected by a password alone.
 *
 * Given how much of the rest of the security posture is in place (encryption at
 * rest, a read-access audit log, role-scoped record access, session
 * invalidation on deactivation), password-only staff access was the weakest
 * remaining link, and the cheapest to close.
 *
 * ## Why this nudges rather than blocks
 *
 * A hard 403 would lock out every existing staff account the moment this
 * deploys, including the administrator who would have to fix it. Instead an
 * un-enrolled staff member is redirected to their own security settings and
 * told why. They keep working the moment they enrol, and nobody is stranded.
 *
 * ## Patients are deliberately not covered
 *
 * 2FA stays opt-in for `user` accounts. A patient's account reaches their own
 * chart and no one else's, and a login wall on a clinic's patient portal is a
 * real access-to-care problem for exactly the people least able to work around
 * it. The asymmetry is the point: the obligation follows the breadth of access.
 */
class EnsureTwoFactorEnrolled
{
    /**
     * Roles whose access is broad enough to warrant a second factor.
     *
     * Anyone who can open a chart that is not their own — plus, since the
     * governance pass, anyone who can reach the *control plane* even though
     * they hold no clinical access at all.
     *
     * `owner` appoints administrators; `dpo` reads the record-access log, which
     * is a map of who consulted whom and is a disclosure in its own right.
     * Neither can open a chart, and both are here anyway: the obligation
     * follows the blast radius of the account, not only its reach into records.
     *
     * @var array<int, string>
     */
    public const PROTECTED_ROLES = ['doctor', 'nurse', 'hr', 'admin', 'owner', 'dpo'];

    /**
     * Where the person was actually trying to go when they were bounced.
     *
     * Kept in the session rather than in `intended()`: Fortify's
     * `password.confirm` middleware sits in front of `security.edit` and
     * overwrites the intended URL with `/settings/security` on the very next
     * hop, so anything stored there is gone before enrolment even starts.
     *
     * Read twice — once by SecurityController, to tell the person what they
     * are being held back from, and once by TwoFactorConfirmedResponse, to put
     * them back there the moment they finish.
     */
    public const BLOCKED_URL_KEY = 'two_factor.blocked_url';

    /** A human label for that destination, e.g. "Appointments". */
    public const BLOCKED_LABEL_KEY = 'two_factor.blocked_label';

    /**
     * Routes that must stay reachable without 2FA, or the redirect loops.
     *
     * This is the whole safety of the middleware. `security.edit` is the page
     * being redirected TO; the `two-factor.*` and `password.confirm*` routes are
     * what that page calls to actually enrol — Fortify is configured with
     * `confirmPassword: true`, so enabling 2FA requires re-entering the password
     * first, and gating that route would make enrolment impossible. `logout`
     * stays open so a locked-out user can always get out.
     *
     * Matched by route NAME rather than URI: names survive a path change, and a
     * loop introduced by renaming a path is a lockout of every staff account.
     *
     * @var array<int, string>
     */
    private const EXEMPT_ROUTES = [
        'security.edit',
        // A new staff account must replace its issued password before it may
        // enrol (EnsurePasswordIsChanged blocks two-factor.* until it has).
        // Gating the password update here as well made that order impossible:
        // each middleware 403'd the step the other one required first.
        'user-password.update',
        'logout',
        'password.confirm',
        'password.confirm.store',
        'password.confirmation',

        // Email verification, exempted defensively rather than because a live
        // path reaches it. `security.edit` sits behind `verified`, so an
        // unverified staff account would otherwise bounce:
        //   any page → (here) security.edit → (verified) verification.notice
        //            → (here) security.edit → …
        // StaffAccountService calls markEmailAsVerified() on creation, so no
        // account takes that path today. It is exempted anyway because the
        // failure is a total lockout with no route out of it, and the cost of
        // preventing it is three strings.
        'verification.notice',
        'verification.verify',
        'verification.send',
    ];

    /**
     * Name prefixes exempted wholesale — every Fortify 2FA endpoint.
     *
     * A prefix rather than a list because Fortify owns these names and adds to
     * them between versions; an enumerated list would silently break enrolment
     * on an upgrade.
     *
     * @var array<int, string>
     */
    private const EXEMPT_PREFIXES = ['two-factor.'];

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyRole(self::PROTECTED_ROLES)) {
            return $next($request);
        }

        // Fortify writes this only once the enrolment is CONFIRMED — a user who
        // generated a secret and never verified a code is not enrolled, and
        // reading `two_factor_secret` instead would let them past on a
        // half-finished setup.
        if ($user->two_factor_confirmed_at !== null) {
            return $next($request);
        }

        if ($this->isExempt($request)) {
            return $next($request);
        }

        // Non-GET requests get a 403 rather than a redirect: an un-enrolled
        // staff account should not be able to WRITE while it is being asked to
        // enrol, and redirecting a POST would silently discard its payload and
        // look to the user like the save succeeded.
        if (! $request->isMethodSafe()) {
            abort(403, 'Two-factor authentication is required for staff accounts.');
        }

        $this->rememberDestination($request);

        return redirect()->route('security.edit')->with(
            'error',
            'Two-factor authentication is required for staff accounts. Please set it up to continue.'
        );
    }

    /**
     * Record the page the person was denied, so the enrolment screen can name
     * it and so they land there instead of on Settings once they are done.
     *
     * The flash message this middleware sets is not enough on its own: the very
     * next hop is `security.edit`, which redirects again to password
     * confirmation, and a flash only survives one request. Session state does.
     */
    private function rememberDestination(Request $request): void
    {
        $request->session()->put(self::BLOCKED_URL_KEY, $request->fullUrl());
        $request->session()->put(self::BLOCKED_LABEL_KEY, $this->labelFor($request));
    }

    /**
     * A readable name for the blocked page, derived from its route name.
     *
     * Derived rather than looked up in a table so that a new route gets a
     * sensible label for free: `doctor.appointments` reads as "Appointments".
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

    private function isExempt(Request $request): bool
    {
        $name = $request->route()?->getName();

        if ($name === null) {
            return false;
        }

        if (in_array($name, self::EXEMPT_ROUTES, true)) {
            return true;
        }

        foreach (self::EXEMPT_PREFIXES as $prefix) {
            if (str_starts_with($name, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
