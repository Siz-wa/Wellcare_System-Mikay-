<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Every browser currently signed in to an account.
 *
 * Reads the `sessions` table directly. That is only possible because this app
 * runs the `database` session driver (see the note in CLAUDE.md — cache, queue
 * and sessions are all `database`); on `file` or `cookie` there is nothing to
 * enumerate, which is why supported() exists rather than the page assuming.
 *
 * This is the feature that lets someone who signed in on a shared clinic
 * workstation end that session from their phone, and it is the reason a
 * stolen-laptop report has an answer other than "change your password and
 * hope".
 */
class BrowserSessionService
{
    /** Sessions idle longer than this are not shown — they are effectively dead. */
    private const STALE_AFTER_DAYS = 30;

    /** Is session enumeration possible at all under the configured driver? */
    public function supported(): bool
    {
        return config('session.driver') === 'database';
    }

    /**
     * Every live session for this account, current device first.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function forUser(User $user, Request $request): Collection
    {
        if (! $this->supported()) {
            return collect();
        }

        $currentId = $request->session()->getId();

        return collect(
            DB::connection(config('session.connection'))
                ->table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->where('last_activity', '>=', now()->subDays(self::STALE_AFTER_DAYS)->getTimestamp())
                ->orderByDesc('last_activity')
                ->get()
        )->map(function (object $session) use ($currentId): array {
            $agent = (string) ($session->user_agent ?? '');

            return [
                // The session id is a bearer credential — anyone holding it
                // holds the session. It is never sent to the browser; the row
                // is identified to the UI by a hash instead.
                'id' => hash('sha256', $session->id),
                'is_current_device' => $session->id === $currentId,
                'device' => $this->deviceFrom($agent),
                'browser' => $this->browserFrom($agent),
                'platform' => $this->platformFrom($agent),
                'ip_address' => $session->ip_address,
                'last_active' => Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
                'last_active_at' => Carbon::createFromTimestamp($session->last_activity)->toISOString(),
            ];
        })
            // Current device to the top, regardless of which browser was busiest.
            ->sortByDesc('is_current_device')
            ->values();
    }

    /**
     * End every session for this account except the one making the request.
     *
     * Two halves, and both are needed:
     *   - logoutOtherDevices() rotates the password hash Laravel stores in the
     *     session, which invalidates any *remembered* login elsewhere.
     *   - the DELETE removes the rows themselves, so the sessions page reflects
     *     the change immediately instead of listing browsers that will only
     *     discover they are logged out on their next request.
     */
    public function logoutOthers(User $user, Request $request, string $password): void
    {
        Auth::guard('web')->logoutOtherDevices($password);

        $request->session()->put([
            'password_hash_web' => $user->getAuthPassword(),
        ]);

        if (! $this->supported()) {
            return;
        }

        DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();
    }

    /** Does this plaintext password match the account's current one? */
    public function passwordMatches(User $user, string $password): bool
    {
        return Hash::check($password, $user->getAuthPassword());
    }

    /**
     * Coarse device class from the user agent.
     *
     * Deliberately crude, and deliberately not a dependency. The string exists
     * so a person can recognise their own device in a list of two or three —
     * "Phone · Chrome · Android" does that. Anything finer would be a parsing
     * library kept up to date forever for no additional recognition.
     */
    private function deviceFrom(string $agent): string
    {
        return match (true) {
            $agent === '' => 'Unknown device',
            (bool) preg_match('/iPad|Tablet/i', $agent) => 'Tablet',
            (bool) preg_match('/Mobile|iPhone|Android/i', $agent) => 'Phone',
            default => 'Desktop',
        };
    }

    private function browserFrom(string $agent): string
    {
        return match (true) {
            // Edge and Opera both carry "Chrome" in their agent string, so they
            // must be tested before it or every browser reads as Chrome.
            (bool) preg_match('/Edg/i', $agent) => 'Edge',
            (bool) preg_match('/OPR|Opera/i', $agent) => 'Opera',
            (bool) preg_match('/Firefox/i', $agent) => 'Firefox',
            (bool) preg_match('/Chrome|CriOS/i', $agent) => 'Chrome',
            (bool) preg_match('/Safari/i', $agent) => 'Safari',
            default => 'Unknown browser',
        };
    }

    private function platformFrom(string $agent): string
    {
        return match (true) {
            (bool) preg_match('/Windows/i', $agent) => 'Windows',
            (bool) preg_match('/iPhone|iPad|iPod/i', $agent) => 'iOS',
            (bool) preg_match('/Macintosh|Mac OS/i', $agent) => 'macOS',
            (bool) preg_match('/Android/i', $agent) => 'Android',
            (bool) preg_match('/Linux/i', $agent) => 'Linux',
            default => 'Unknown',
        };
    }
}
