<?php

use App\Models\User;
use App\Notifications\AccountChangedNotification;
use App\Notifications\QueuedResetPassword;
use App\Notifications\QueuedVerifyEmail;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

/**
 * Nobody waits on a mail host to finish signing up.
 *
 * Fortify sends the verification mail inside the registration request, so with
 * a synchronous mailer the account is not created until the mail host answers.
 * Measured at roughly 25 seconds in the September end-to-end run, against a
 * `failover` chain whose first leg was an unreachable SMTP host: the button sat
 * on "Creating account…" long enough that a real person would conclude it had
 * failed and press it again.
 *
 * The password-reset link had the same shape, and worse consequences — the
 * person asking for one is already locked out.
 */
it('queues the email verification notification', function () {
    expect(is_subclass_of(QueuedVerifyEmail::class, ShouldQueue::class))->toBeTrue();
});

it('queues the account-change notice an admin action sends', function () {
    // Suspending, reactivating or re-roling a user mails them. That mail was
    // sent inside the admin's request, so a slow mail host stalled the action.
    expect(is_subclass_of(AccountChangedNotification::class, ShouldQueue::class))->toBeTrue();
});

it('queues the password reset notification', function () {
    expect(is_subclass_of(QueuedResetPassword::class, ShouldQueue::class))->toBeTrue();
});

it('sends the queued verification notification on registration', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();
    $user->sendEmailVerificationNotification();

    Notification::assertSentTo($user, QueuedVerifyEmail::class);

    // Laravel's own class must not be what goes out — it is the un-queued one.
    Notification::assertNotSentTo(
        $user,
        VerifyEmail::class,
    );
});

it('sends the queued reset notification on a password reset request', function () {
    Notification::fake();

    $user = User::factory()->create();
    $user->sendPasswordResetNotification('a-reset-token');

    Notification::assertSentTo($user, QueuedResetPassword::class);
    Notification::assertNotSentTo(
        $user,
        ResetPassword::class,
    );
});
