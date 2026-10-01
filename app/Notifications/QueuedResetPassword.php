<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * The password-reset link, sent off the request.
 *
 * Same reasoning as [QueuedVerifyEmail]: "Email password reset link" held the
 * request open for the whole SMTP attempt. The wait is worse here than at
 * registration, because the person asking for a reset is already locked out and
 * has every reason to read a stall as another failure.
 *
 * Laravel deliberately answers this endpoint with the same confirmation whether
 * or not the address is on file, so the response must not vary with what the
 * mailer did — which is another reason the send belongs on the worker rather
 * than in the request.
 */
class QueuedResetPassword extends ResetPassword implements ShouldQueue
{
    use Queueable;
}
