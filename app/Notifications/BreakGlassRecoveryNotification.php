<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * GV-10 — tell the oversight roles that somebody took admin access from the
 * console.
 *
 * ## Why this is not AccountChangedNotification
 *
 * It used to be. `wellcare:admin:recover` sent the owner and the DPO an
 * AccountChangedNotification with event `role`, packing the whole incident into
 * the `detail` slot — so the alert arrived titled "your access level changed"
 * and opened "An administrator changed **your** account role to *emergency
 * recovery: nurse@… was granted admin by …*".
 *
 * Neither recipient's access had changed. The manual walkthrough of 2026-09-11
 * logged it as OB-03: every fact was present and the framing told the two roles
 * responsible for oversight something false about their own accounts, in the
 * one message whose entire purpose is to raise an alarm.
 *
 * AccountChangedNotification is documented as "tell people when their OWN
 * access changes" and its copy is written from that stance throughout. This is
 * a different message to a different audience about a third party, so it is a
 * different class rather than a sixth branch of that one's match.
 *
 * ## What it contains
 *
 * Everything an oversight reader needs to decide whether to act: who was
 * granted access, who claims to have done it, the reason they typed, and where
 * to go to see the recorded event. No credential, and no link that performs
 * anything — the same rule AccountChangedNotification follows, for the same
 * reason.
 */
class BreakGlassRecoveryNotification extends Notification
{
    use Queueable;

    /**
     * @param  string  $subjectEmail  the account that was granted admin
     * @param  string  $operator  the name the person at the console typed
     * @param  string  $reason  their stated reason, recorded verbatim
     * @param  bool  $forced  whether --force overrode the "an active
     *                        administrator already exists" refusal
     */
    public function __construct(
        public readonly string $subjectEmail,
        public readonly string $operator,
        public readonly string $reason,
        public readonly bool $forced = false,
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
        $message = (new MailMessage)
            ->subject('WellCare security alert: emergency administrator access was granted')
            ->greeting('Hello,')
            ->line(
                'Somebody with server access used the break-glass recovery command to grant '
                ."administrator rights to **{$this->subjectEmail}**. This happened at the "
                .'console, outside the application, and is the documented recovery path for a '
                .'clinic that is locked out.'
            )
            ->line("**Performed by:** {$this->operator}")
            ->line("**Stated reason:** \"{$this->reason}\"");

        if ($this->forced) {
            $message->line(
                '**This run used `--force`**, which overrode the check that refuses recovery '
                .'while an active administrator still exists. That makes it worth a closer '
                .'look than an ordinary recovery.'
            );
        }

        return $message
            ->line(
                'This grants account access only. It does not, and cannot, grant access to any '
                .'patient record.'
            )
            ->line(
                'The full entry — including the operating-system account used — is on the Data '
                .'Protection Officer dashboard under Break-glass administrative recovery.'
            )
            ->line(
                '**If this was not expected, treat it as an incident.** Do not reply to this '
                .'email — call the clinic directly on the number you already have.'
            )
            ->salutation('— WellCare Clinics & Laboratory, Dasmariñas');
    }
}
