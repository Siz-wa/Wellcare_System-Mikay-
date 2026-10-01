<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * One email for every notification type.
 *
 * AppointmentConfirmedMail exists and covers exactly one type — the only
 * outbound mail the application had before task 1.2. Rather than write fourteen
 * more of those, this renders whatever subject and body the notification
 * already carries: the text is composed once, at the point the clinical event
 * happens, so the bell, the email and the SMS all say the same thing.
 *
 * A per-type Mailable earns its place when the layout differs. None of these
 * differ.
 *
 * NOTE the property names. `Mailable` already declares a public `$subject`, and
 * redeclaring it as readonly here is a fatal error rather than an override —
 * hence `$title`, with the envelope mapping it onto the real subject line.
 */
class WellcareNotificationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly string $notificationType,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->title);
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.notification',
            with: [
                'title' => $this->title,
                'bodyText' => $this->body,
                'type' => $this->notificationType,
            ],
        );
    }
}
