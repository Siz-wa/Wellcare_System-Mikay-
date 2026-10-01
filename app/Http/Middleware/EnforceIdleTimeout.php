<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\ForcedSignOut;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * GV-8 — a shorter idle window for accounts that can reach other people's data.
 *
 * `SESSION_LIFETIME` is one number for all five roles. Laravel's lifetime is
 * already idle-based, so 120 minutes was a real two-hour idle timeout — it was
 * just the same two hours for a shared clinic workstation and for a patient's
 * phone. This narrows it per role from `config/security.php`, where the reasoning
 * for each figure lives.
 *
 * ONC §170.315(d)(5), "automatic access time-out".
 *
 * ## Why this is application-level rather than a session-driver setting
 *
 * Laravel resolves `session.lifetime` once, when the session handler is built,
 * before anything knows who is signed in. There is no per-user hook. Tracking
 * the last request time in the session payload and comparing it here is the
 * only place the role is known and the decision can still be made.
 *
 * ## The stamp is the session, not the database
 *
 * `users.updated_at` would look like an obvious place for "last seen" and is
 * the wrong one twice over: it would write to the users table on every single
 * request, and it is per-ACCOUNT where this is per-SESSION. Somebody signed in
 * on a phone and a workstation should have the workstation expire while the
 * phone stays alive.
 *
 * ## Ordering
 *
 * Runs BEFORE EnsureUserIsActive in bootstrap/app.php, and the order is worth
 * keeping: an expired session should end as an expiry with its own message
 * rather than falling through to a deactivation notice that is not true.
 */
class EnforceIdleTimeout
{
    /**
     * Session key holding the Unix timestamp of the last non-exempt request.
     */
    public const LAST_ACTIVITY_KEY = 'security.last_activity_at';

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return $next($request);
        }

        $limitMinutes = $this->idleLimitFor($user);
        $lastActivity = $request->session()->get(self::LAST_ACTIVITY_KEY);

        // First request of a session — stamp it and let it through. There is no
        // idle period to measure yet, and treating a missing stamp as "expired"
        // would log everybody out at sign-in.
        if (! is_int($lastActivity)) {
            $request->session()->put(self::LAST_ACTIVITY_KEY, now()->getTimestamp());

            return $next($request);
        }

        if (now()->getTimestamp() - $lastActivity > $limitMinutes * 60) {
            return $this->expire($request, $limitMinutes);
        }

        $request->session()->put(self::LAST_ACTIVITY_KEY, now()->getTimestamp());

        return $next($request);
    }

    /**
     * The idle allowance for this account, in minutes.
     *
     * `min` across the account's roles, not `max`: an account holding two roles
     * is as exposed as its most exposed role, and taking the longer window
     * would make holding a second role a way to relax the first one's timeout.
     * (StaffAccountService syncs to exactly one role, so this is defence
     * against a future multi-role change rather than a live case.)
     */
    private function idleLimitFor(User $user): int
    {
        /** @var array<string, int> $map */
        $map = config('security.idle_timeout_minutes', []);
        $default = (int) config('security.idle_timeout_default', 120);

        $limits = $user->getRoleNames()
            ->map(fn (string $role): int => $map[$role] ?? $default)
            ->filter(fn (int $minutes): bool => $minutes > 0);

        return $limits->isEmpty() ? $default : (int) $limits->min();
    }

    /**
     * End the session the same way EnsureUserIsActive does — full logout,
     * invalidate, regenerate the CSRF token — so an expired session cannot be
     * replayed and the next request starts clean.
     *
     * The reason travels as a session notice rather than a validation error;
     * see ForcedSignOut for why the error bag never reached the screen.
     */
    private function expire(Request $request, int $limitMinutes): Response
    {
        $minutes = $limitMinutes === 1 ? '1 minute' : "{$limitMinutes} minutes";

        return ForcedSignOut::withNotice(
            $request,
            "You were signed out after {$minutes} of inactivity. Please sign in again."
        );
    }
}
