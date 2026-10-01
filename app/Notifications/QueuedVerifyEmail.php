<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Laravel's verification mail, sent off the request.
 *
 * Fortify dispatches the verification notification inside the registration
 * request. With a synchronous mailer that means the account is not created
 * until the mail host has answered — and when the configured host is slow or
 * unreachable, the person sits on "Creating account…" for as long as the SMTP
 * timeout takes. Measured at roughly 25 seconds against `smtp.gmail.com` before
 * the failover chain gave up and wrote to the log instead. The account was
 * always created correctly; it just took long enough that a real person would
 * conclude it had failed and press the button again.
 *
 * Queueing it decouples the two: registration returns as soon as the row is
 * written, and the mail goes out on the worker. A mail host that is down can no
 * longer hold up a signup, whatever `MAIL_MAILER` is pointed at.
 *
 * Subclassed rather than rewritten so the mail itself — subject, signed URL,
 * expiry, and any `VerifyEmail::toMailUsing()` customisation — stays Laravel's.
 */
class QueuedVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use Queueable;
}
