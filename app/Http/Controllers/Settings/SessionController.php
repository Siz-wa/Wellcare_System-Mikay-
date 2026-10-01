<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\LogoutOtherSessionsRequest;
use App\Models\User;
use App\Services\BrowserSessionService;
use Illuminate\Http\RedirectResponse;

/**
 * "Log out everywhere else" on settings/security.
 *
 * Separate from SecurityController because that controller carries a
 * `password.confirm` middleware on edit() when Fortify is configured for it,
 * and this action does its own password check on the submitted value. Two
 * different password gates on one controller is how one of them ends up
 * accidentally covering the other.
 */
class SessionController extends Controller
{
    public function __construct(private readonly BrowserSessionService $sessions) {}

    public function destroy(LogoutOtherSessionsRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->sessions->logoutOthers($user, $request, $request->validated('password'));

        activity('auth')
            ->causedBy($user)
            ->performedOn($user)
            ->event('sessions-revoked')
            ->withProperties(['ip' => $request->ip()])
            ->log('Signed out of all other browser sessions');

        return back()->with('success', 'You have been signed out of every other browser.');
    }
}
