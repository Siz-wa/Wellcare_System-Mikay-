<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * The first mail a new staff member receives — QA gap G-11.
 *
 * Built on the password-reset token so the link goes through Fortify's own
 * reset screen: the administrator never types, sees or relays a password,
 * and the account holder is the only person who ever knows it.
 */
class StaffInvitationNotification extends ResetPassword implements ShouldQueue
{
    use Queueable;

    public function __construct(string $token, public readonly string $role)
    {
        parent::__construct($token);
    }

    public function toMail($notifiable): MailMessage
    {
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Your WellCare staff account is ready')
            ->greeting('Welcome to WellCare Clinics & Laboratory')
            ->line("An administrator created a {$this->role} account for you.")
            ->line('Choose your own password to activate it. Nobody else knows it, including the administrator.')
            ->action('Set my password', $this->resetUrl($notifiable))
            ->line("This link expires in {$minutes} minutes. If it has expired, open the sign-in page, choose \"Forgot password\" and enter this email address.")
            ->line('You will be asked to set up two-factor authentication after your first sign-in.');
    }
}
