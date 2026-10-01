<?php

namespace App\Jobs;

use App\Mail\WellcareNotificationMail;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\SmsSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Task 1.2 — carry a notification out of the application.
 *
 * ## Why a payload rather than a model
 *
 * This job is dispatched from `AppointmentNotification::creating`, not
 * `created`, and that is deliberate.
 *
 * The `creating` hook returns false — aborting the insert — when the account
 * has turned the in-app channel off for that category. If outbound delivery
 * hung off `created`, switching off the bell would silently switch off email
 * and SMS too, even though the settings screen presents them as independent
 * channels. A person who unticks "in-app appointments" has not asked to stop
 * being told their appointment was cancelled.
 *
 * Dispatching from `creating` means the row may never exist, so the job carries
 * the values it needs instead of an id. That is the right shape for a queued
 * job anyway: nothing here has to survive a race with a row it does not own.
 *
 * ## Failure is contained
 *
 * A notification is a side effect of a clinical action. An unreachable SMS
 * gateway must never roll back the consultation that produced it, so every
 * channel is attempted independently and a failure is logged rather than
 * thrown.
 */
class DeliverNotification implements ShouldQueue
{
    use Queueable;

    /**
     * Two attempts, not the default one.
     *
     * A transient gateway failure is the common case and worth one retry; a
     * long retry chain is not, because a reminder delivered forty minutes late
     * has already missed the appointment it was reminding about.
     */
    public int $tries = 2;

    public function __construct(
        private readonly ?int $userId,
        private readonly string $type,
        private readonly string $subject,
        private readonly string $body,
        private readonly ?string $contactNumber = null,
        private readonly ?string $email = null,
    ) {}

    public function handle(SmsSender $sms): void
    {
        $user = $this->userId !== null ? User::find($this->userId) : null;

        // A guest booking has no account and therefore no preferences. The
        // contact details came off the appointment itself, and someone who gave
        // the clinic a number in order to be contacted about a booking is
        // reachable about that booking.
        $email = $this->email ?? $user?->email;
        $number = $this->contactNumber;

        if (NotificationPreference::allows($this->userId, 'email', $this->type) && filled($email)) {
            $this->sendEmail($email);
        }

        if (NotificationPreference::allows($this->userId, 'sms', $this->type) && filled($number)) {
            $sms->send($number, $this->smsBody());
        }
    }

    private function sendEmail(string $address): void
    {
        try {
            Mail::to($address)->send(new WellcareNotificationMail(
                title: $this->subject,
                body: $this->body,
                notificationType: $this->type,
            ));
        } catch (\Throwable $e) {
            Log::error('Notification email failed', [
                'type' => $this->type,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * The SMS text.
     *
     * Prefixed with the clinic name because an SMS arrives with no branding,
     * no subject line and no context — an unattributed "Your results are
     * ready" from an unknown number reads as spam, and the one message class
     * that must not be ignored is the clinical one.
     */
    private function smsBody(): string
    {
        return "WellCare Clinics: {$this->subject}. {$this->body}";
    }
}
