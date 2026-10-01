<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;

/**
 * A person who has just typed their password has just confirmed it.
 *
 * Staff are sent to their Security page to enrol 2FA straight after signing
 * in, and that page sits behind Fortify's `password.confirm`. Without this the
 * first thing a new doctor saw after typing their password was a screen asking
 * them to type it again.
 *
 * Only for an interactive sign-in (the login form, or the 2FA challenge that
 * completes it). A session restored from a remember-me cookie involved no
 * password at all and must still be asked.
 */
class MarkPasswordConfirmedOnSignIn
{
    public function handle(Login $event): void
    {
        $request = request();

        if (! $request->isMethod('POST')
            || ! ($request->routeIs('login.store') || $request->routeIs('two-factor.login.store'))) {
            return;
        }

        $request->session()->put('auth.password_confirmed_at', time());
    }
}
