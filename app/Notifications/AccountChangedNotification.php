<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * GV-7 — tell people when their own access changes.
 *
 * Until now, nothing notified a user when an administrator changed their role,
 * suspended their account, altered their email address or started a password
 * reset on it. A person whose access had been changed found out by failing to
 * sign in. NIST SP 800-53 AC-2 asks for notification of account changes;
 * HIPAA §164.308(a)(3) termination procedures assume the event is visible.
 *
 * ## Why this one sends mail as well as writing a bell notification
 *
 * Every other notification in this app is `via(['database'])` — the bell reads
 * `appointment_notifications`, and in-app is the right channel for "your
 * appointment was confirmed". It is the wrong channel for three of these four
 * events, because the whole point is that the person may no longer be able to
 * sign in and see the bell. A suspension notice that is only visible once you
 * log in is not a notice.
 *
 * So this deliberately does NOT extend WellcareNotification, which hard-codes
 * the database channel.
 *
 * ## What it never contains
 *
 * No password, no reset token, no link that performs the change, and no detail
 * of what the new email address is. If one of these arrives unexpectedly, the
 * correct action is to phone the clinic — the message says so, and gives the
 * reader nothing an attacker could use if the mailbox is the thing that has
 * been compromised.
 */
class AccountChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  'role'|'suspended'|'reactivated'|'email'|'password_reset'  $event
     * @param  string|null  $detail  short, non-sensitive context (e.g. the new
     *                               role name). Never a credential.
     */
    public function __construct(
        public readonly string $event,
        public readonly ?string $detail = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$subject, $line] = $this->copy();

        return (new MailMessage)
            ->subject("WellCare account notice: {$subject}")
            ->greeting('Hello,')
            ->line($line)
            ->line(
                'If you were expecting this, no action is needed.'
            )
            ->line(
                '**If you were not expecting this, contact the clinic immediately.** '
                .'Do not reply to this email — call the clinic directly on the number '
                .'you already have.'
            )
            ->salutation('— WellCare Clinics & Laboratory, Dasmariñas');
    }

    /**
     * Subject fragment and body line for each event.
     *
     * Kept in one match rather than four notification classes: they differ by a
     * sentence, and four near-identical classes is four places to forget the
     * "never include a credential" rule.
     *
     * @return array{0: string, 1: string}
     */
    private function copy(): array
    {
        return match ($this->event) {
            'role' => [
                'your access level changed',
                'An administrator changed your account role'
                    .($this->detail !== null ? " to **{$this->detail}**." : '.')
                    .' What you can see and do in the system has changed with it.',
            ],
            'suspended' => [
                'your account was suspended',
                'An administrator has suspended your account. You will not be able '
                    .'to sign in until it is reactivated. No records have been deleted.',
            ],
            'reactivated' => [
                'your account was reactivated',
                'An administrator has reactivated your account. You can sign in again.',
            ],
            'email' => [
                'your sign-in address changed',
                'The email address used to sign in to your WellCare account was '
                    .'changed by an administrator. This message was sent to your '
                    .'previous address so that you would see it.',
            ],
            'password_reset' => [
                'a password reset was requested',
                'An administrator started a password reset for your account. A '
                    .'separate email contains the reset link. Nobody at the clinic '
                    .'can see or set your password — only you can complete this.',
            ],
            default => [
                'your account was changed',
                'An administrator made a change to your WellCare account.',
            ],
        };
    }
}
