<?php

namespace App\Http\Responses\Auth;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * The same answer to every "forgot password" request.
 *
 * Fortify's defaults answer "We can't find a user with that email address" for
 * an unknown address and "We have emailed your password reset link" for a
 * known one. For a clinic that is a disclosure in itself: anyone could learn
 * whether a given person is a patient here. Both outcomes, and the throttle
 * message that only a real account can trigger, now read identically.
 */
class PasswordResetLinkRequestedResponse implements FailedPasswordResetLinkRequestResponse, SuccessfulPasswordResetLinkRequestResponse
{
    public const MESSAGE = 'If an account exists for that email address, we have sent it a password reset link. Check your inbox and spam folder.';

    /** Fortify passes the broker status; it is deliberately not shown. */
    public function __construct(protected string $status = '') {}

    public function toResponse($request): Response
    {
        return $request->wantsJson()
            ? new JsonResponse(['message' => self::MESSAGE], 200)
            : back()->with('status', self::MESSAGE);
    }
}
