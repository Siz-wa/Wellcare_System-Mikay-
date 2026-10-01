<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureTwoFactorEnrolled;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use App\Models\User;
use App\Services\BrowserSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;
use Spatie\Activitylog\Models\Activity;

class SecurityController extends Controller implements HasMiddleware
{
    /** How many auth events the page shows. Enough to spot a stranger, not a log viewer. */
    private const ACTIVITY_LIMIT = 10;

    public function __construct(private readonly BrowserSessionService $sessions) {}

    /**
     * Get the middleware that should be assigned to the controller.
     */
    public static function middleware(): array
    {
        return Features::canManageTwoFactorAuthentication()
            && Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword')
                ? [new Middleware('password.confirm', only: ['edit'])]
                : [];
    }

    /**
     * Show the user's security settings page.
     */
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $props = [
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'sessions' => $this->sessions->forUser($user, $request),
            'sessionsSupported' => $this->sessions->supported(),
            'recentActivity' => $this->recentAuthActivity($user),
            'passwordUpdatedAt' => $user->updated_at?->toISOString(),
        ];

        if (Features::canManageTwoFactorAuthentication()) {
            $props['twoFactorSetupExpired'] = $request->expireStalePendingSetup();
            $props['twoFactorEnabled'] = $user->hasEnabledTwoFactorAuthentication();
            $props['requiresConfirmation'] = Features::optionEnabled(Features::twoFactorAuthentication(), 'confirm');

            // Read from the database rather than trusted to React state. The
            // panel used to decide "Enable" vs "Continue setup" from whether it
            // had a QR code in memory, which survives an Inertia visit and so
            // could offer to resume a setup the server had already discarded.
            $props['twoFactorPending'] = $request->hasPendingTwoFactorSetup();
        }

        $props += $this->twoFactorRequirement($user, $request);
        $props += $this->passwordChangeRequirement($user, $request);

        return Inertia::render('settings/security/index', $props);
    }

    /**
     * GV-9 — why this page opened by itself for a freshly provisioned account.
     *
     * Same shape and same reasoning as twoFactorRequirement() below: the flash
     * EnsurePasswordIsChanged sets cannot survive the password-confirmation hop
     * in front of `security.edit`, so the state is read from the account
     * instead. Without this the redirect is silent — which is exactly what the
     * manual walkthrough of 2026-09-11 found in T-08.
     *
     * @return array<string, mixed>
     */
    private function passwordChangeRequirement(User $user, Request $request): array
    {
        $required = (bool) $user->must_change_password;

        return [
            'mustChangePassword' => $required,
            'mustChangePasswordReturnLabel' => $required
                ? $request->session()->get(EnsurePasswordIsChanged::BLOCKED_LABEL_KEY)
                : null,
        ];
    }

    /**
     * Why this page opened by itself, when it did.
     *
     * A staff member who has not enrolled is redirected here by
     * EnsureTwoFactorEnrolled from wherever they were actually trying to go —
     * and, because `security.edit` sits behind password confirmation, they meet
     * a password prompt on the way. Without this, all of that happens with no
     * explanation at all: every link in the sidebar appears to lead to Settings.
     *
     * Derived from the account's own state rather than carried in a flash
     * message, because the redirect chain is two hops long and a flash only
     * survives one.
     *
     * @return array<string, mixed>
     */
    private function twoFactorRequirement(User $user, TwoFactorAuthenticationRequest $request): array
    {
        $required = $user->hasAnyRole(EnsureTwoFactorEnrolled::PROTECTED_ROLES)
            && $user->two_factor_confirmed_at === null;

        return [
            'twoFactorRequired' => $required,
            'twoFactorReturnLabel' => $required
                ? $request->session()->get(EnsureTwoFactorEnrolled::BLOCKED_LABEL_KEY)
                : null,
        ];
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
            // GV-9. Clearing the flag here is what lets a provisioned account
            // out of EnsurePasswordIsChanged. This is the ONLY route that
            // clears it, and PasswordUpdateRequest requires the current
            // password — so the person setting the new one has demonstrably
            // been handed the old one, rather than having walked into an
            // abandoned session.
            'must_change_password' => false,
        ]);

        return back()->with('success', 'Your password has been updated.');
    }

    /**
     * This account's own recent sign-in history.
     *
     * Scoped by `subject_id`, which RecordAuthActivity sets to the account the
     * event happened to. Filtering on causer alone would be wrong the moment
     * anything else writes to the `auth` log on someone's behalf.
     *
     * @return array<int, array<string, mixed>>
     */
    private function recentAuthActivity(User $user): array
    {
        return Activity::query()
            ->where('log_name', 'auth')
            ->where('subject_type', User::class)
            ->where('subject_id', $user->id)
            ->latest()
            ->orderByDesc('id')
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'event' => $activity->event,
                'description' => $activity->description,
                'ip' => $activity->properties['ip'] ?? null,
                'user_agent' => $activity->properties['user_agent'] ?? null,
                'at' => $activity->created_at?->toISOString(),
                'ago' => $activity->created_at?->diffForHumans(),
            ])
            ->all();
    }
}
