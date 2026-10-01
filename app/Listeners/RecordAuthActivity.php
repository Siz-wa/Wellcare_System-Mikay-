<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;

/**
 * The authentication half of the audit trail.
 *
 * The `activity_log` table already records what changed on a model
 * (App\Concerns\RecordsActivity), which answers "who edited this patient". It
 * could not answer "was my account signed into from somewhere I don't
 * recognise" — the single question an account-security page exists to answer,
 * and the one whose absence makes a breach invisible until damage shows up in
 * the records.
 *
 * Written under log name `auth` so AdminActivityLogController's existing filter
 * picks it up with no change, and so settings/security can show a person their
 * own recent sign-ins.
 *
 * The same rule as RecordsActivity applies and is worth restating, because this
 * class handles a Failed event that carries the submitted credentials: the
 * password is NEVER recorded. Neither is the two-factor secret. The properties
 * written here are the IP address and the user agent, and nothing else.
 */
class RecordAuthActivity
{
    /** Register every auth listener. Called from AppServiceProvider::boot(). */
    public static function register(): void
    {
        Event::listen(Login::class, [self::class, 'handleLogin']);
        Event::listen(Logout::class, [self::class, 'handleLogout']);
        Event::listen(Failed::class, [self::class, 'handleFailed']);
        Event::listen(PasswordReset::class, [self::class, 'handlePasswordReset']);
    }

    public function handleLogin(Login $event): void
    {
        $user = $event->user;

        if (! $user instanceof User) {
            return;
        }

        self::record($user, 'signed-in', 'Signed in');
    }

    public function handleLogout(Logout $event): void
    {
        $user = $event->user;

        if (! $user instanceof User) {
            return;
        }

        self::record($user, 'signed-out', 'Signed out');
    }

    /**
     * A failed sign-in attempt.
     *
     * Recorded against the account when the address matches a real one, and
     * discarded otherwise. Logging attempts on addresses that do not exist
     * would fill the table with whatever a scanner is spraying, and — because
     * the admin activity log renders `properties` — would turn the audit trail
     * into a list of the addresses attackers are guessing.
     */
    public function handleFailed(Failed $event): void
    {
        $user = $event->user;

        if (! $user instanceof User) {
            return;
        }

        self::record($user, 'sign-in-failed', 'Failed sign-in attempt');
    }

    public function handlePasswordReset(PasswordReset $event): void
    {
        $user = $event->user;

        if (! $user instanceof User) {
            return;
        }

        self::record($user, 'password-reset', 'Password reset via email link');
    }

    /**
     * Write one auth event.
     *
     * `causedBy` and `performedOn` are both the account: an authentication
     * event is the account acting on itself, and setting the subject is what
     * lets settings/security query "my own auth history" by subject_id.
     */
    private static function record(User $user, string $event, string $description): void
    {
        $request = request();

        activity('auth')
            ->causedBy($user)
            ->performedOn($user)
            ->event($event)
            ->withProperties(self::contextFrom($request))
            ->log($description);
    }

    /**
     * @return array{ip: string|null, user_agent: string|null}
     */
    private static function contextFrom(?Request $request): array
    {
        return [
            'ip' => $request?->ip(),
            // Bounded: a user agent is attacker-controlled input being written
            // to a column the admin UI renders.
            'user_agent' => $request ? mb_substr((string) $request->userAgent(), 0, 255) : null,
        ];
    }
}
