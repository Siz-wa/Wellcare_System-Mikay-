<?php

use App\Contracts\SmsDriver;
use App\Jobs\DeliverNotification;
use App\Mail\WellcareNotificationMail;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\SmsSender;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;

/**
 * Task 1.2 — notifications leave the application.
 *
 * Before this, `WellcareNotification::via()` returned `['database']`, the mail
 * driver was `log`, and exactly one of fifteen notification types had an
 * outbound email. Everything else was visible only to someone already signed in
 * and looking at the bell.
 *
 * The subtle case these tests exist for is the channel-independence one: the
 * in-app switch aborts the database row, and delivery must not be collateral
 * damage of that abort.
 */
function notifyingAppointment(?User $user = null): Appointment
{
    return Appointment::factory()->create([
        'user_id' => $user?->id,
        'email' => 'patient@example.test',
        'contact_number' => '09171234567',
    ]);
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

test('creating a notification queues outbound delivery', function () {
    Bus::fake();
    $user = userWithRole('user');

    AppointmentNotification::create([
        'appointment_id' => notifyingAppointment($user)->id,
        'user_id' => $user->id,
        'type' => 'confirmed',
        'subject' => 'Your appointment has been confirmed',
        'body' => 'See you on Tuesday.',
        'read' => false,
    ]);

    Bus::assertDispatched(DeliverNotification::class);
});

test('turning off the in-app channel does not also silence email and SMS', function () {
    // The bug this guards: `creating` returns false to abort the row when the
    // in-app switch is off. Delivery dispatched from `created` would never run,
    // so unticking the bell would silently stop the cancellation email too.
    Bus::fake();
    $user = userWithRole('user');

    NotificationPreference::forUser($user)->update([
        'preferences' => array_merge(NotificationPreference::defaults(), [
            NotificationPreference::key('inapp', 'appointments') => false,
        ]),
    ]);

    AppointmentNotification::create([
        'appointment_id' => notifyingAppointment($user)->id,
        'user_id' => $user->id,
        'type' => 'cancelled',
        'subject' => 'Your appointment was cancelled',
        'body' => 'Please rebook at your convenience.',
        'read' => false,
    ]);

    // The row is correctly suppressed …
    $this->assertDatabaseMissing('appointment_notifications', [
        'user_id' => $user->id,
        'type' => 'cancelled',
    ]);

    // … and the outbound channels are still asked to deliver.
    Bus::assertDispatched(DeliverNotification::class);
});

// ── The job honours preferences per channel ──────────────────────────────────

test('email is sent when the email channel is on', function () {
    Mail::fake();
    $user = userWithRole('user');

    (new DeliverNotification(
        userId: $user->id,
        type: 'confirmed',
        subject: 'Confirmed',
        body: 'See you Tuesday.',
        contactNumber: null,
        email: 'patient@example.test',
    ))->handle(app(SmsSender::class));

    Mail::assertSent(WellcareNotificationMail::class);
});

test('email is withheld when the account has turned that category off', function () {
    Mail::fake();
    $user = userWithRole('user');

    NotificationPreference::forUser($user)->update([
        'preferences' => array_merge(NotificationPreference::defaults(), [
            NotificationPreference::key('email', 'appointments') => false,
        ]),
    ]);

    (new DeliverNotification(
        userId: $user->id,
        type: 'confirmed',
        subject: 'Confirmed',
        body: 'See you Tuesday.',
        contactNumber: null,
        email: 'patient@example.test',
    ))->handle(app(SmsSender::class));

    Mail::assertNothingSent();
});

test('a critical lab result is delivered even when lab notifications are muted', function () {
    // UNMUTABLE_TYPES exists for exactly this. Muting a category must not be
    // able to suppress the one message whose non-delivery can cause harm.
    Mail::fake();
    $user = userWithRole('user');

    NotificationPreference::forUser($user)->update([
        'preferences' => array_merge(NotificationPreference::defaults(), [
            NotificationPreference::key('email', 'lab_results') => false,
        ]),
    ]);

    (new DeliverNotification(
        userId: $user->id,
        type: 'lab_critical',
        subject: 'Critical result',
        body: 'Please contact the clinic immediately.',
        contactNumber: null,
        email: 'patient@example.test',
    ))->handle(app(SmsSender::class));

    Mail::assertSent(WellcareNotificationMail::class);
});

test('a guest booking with no account still receives delivery', function () {
    // No user_id means no preferences row; someone who gave the clinic contact
    // details in order to book is reachable about that booking.
    Mail::fake();

    (new DeliverNotification(
        userId: null,
        type: 'confirmed',
        subject: 'Confirmed',
        body: 'See you Tuesday.',
        contactNumber: '09171234567',
        email: 'guest@example.test',
    ))->handle(app(SmsSender::class));

    Mail::assertSent(WellcareNotificationMail::class);
});

// ── SMS number normalisation ─────────────────────────────────────────────────

test('philippine numbers are normalised to E.164', function (string $written, bool $deliverable) {
    // A chart holds these in every format a person might type. Normalising
    // means the chart does not have to be clean for the message to arrive —
    // and an unusable value is skipped rather than guessed at, because sending
    // a clinical message to a wrong number is a disclosure.
    expect(app(SmsSender::class)->send($written, 'Test message'))->toBe($deliverable);
})->with([
    'local' => ['09171234567', true],
    'spaced' => ['0917 123 4567', true],
    'punctuated' => ['(0917) 123-4567', true],
    'international' => ['+639171234567', true],
    'country code only' => ['639171234567', true],
    'bare mobile' => ['9171234567', true],
    'too short' => ['0917123', false],
    'landline' => ['0464505116', false],
    'nonsense' => ['not a number', false],
]);

test('a missing number is skipped rather than sent', function () {
    expect(app(SmsSender::class)->send(null, 'Test message'))->toBeFalse();
});

test('an unknown SMS driver fails loudly instead of silently not sending', function () {
    // A production typo in SMS_DRIVER must not degrade to "delivers nothing
    // while appearing to work".
    config(['sms.driver' => 'nope']);
    app()->forgetInstance(SmsDriver::class);

    expect(fn () => app(SmsDriver::class))
        ->toThrow(InvalidArgumentException::class);
});
