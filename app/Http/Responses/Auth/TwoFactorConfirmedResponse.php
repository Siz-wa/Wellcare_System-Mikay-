<?php

namespace App\Http\Responses\Auth;

use App\Http\Middleware\EnsureTwoFactorEnrolled;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\TwoFactorConfirmedResponse as TwoFactorConfirmedResponseContract;
use Symfony\Component\HttpFoundation\Response;

/**
 * Where a staff member lands the moment two-factor enrolment succeeds.
 *
 * Fortify's stock response is `back()`, which leaves them on the settings page
 * they never asked to be on. For a doctor who clicked "Appointments" and was
 * bounced here by EnsureTwoFactorEnrolled, that is the last step of a journey
 * that never returns them to what they were doing — they have to remember what
 * they had clicked and click it again.
 *
 * The destination was recorded by the middleware at the moment it denied them.
 */
class TwoFactorConfirmedResponse implements TwoFactorConfirmedResponseContract
{
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 200);
        }

        $destination = $this->claimBlockedDestination($request);

        $message = 'Two-factor authentication is on. You will be asked for a code from your authenticator app the next time you sign in.';

        return $destination === null
            ? back()->with('success', $message)
            : redirect()->to($destination)->with('success', $message);
    }

    /**
     * Take the remembered destination and clear it, so a later enrolment on the
     * same session (after a disable/re-enable) does not teleport the person to
     * a page they last wanted days ago.
     */
    private function claimBlockedDestination(Request $request): ?string
    {
        $url = $request->session()->pull(EnsureTwoFactorEnrolled::BLOCKED_URL_KEY);
        $request->session()->forget(EnsureTwoFactorEnrolled::BLOCKED_LABEL_KEY);

        return is_string($url) && $url !== '' ? $url : null;
    }
}
