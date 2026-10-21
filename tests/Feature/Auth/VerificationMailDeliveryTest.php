<?php

use App\Models\User;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Laravel\Fortify\Features;

/**
 * The verification mail must reach the transport, not just be dispatched.
 *
 * The notification tests fake the notification layer, so they pass even when
 * the mail channel quietly drops the message. These run the real channel
 * against the array mailer and assert a message was actually handed over.
 */
beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::emailVerification());

    $this->sentMail = collect();
    Event::listen(MessageSent::class, fn (MessageSent $event) => $this->sentMail->push($event->message));
});

it('delivers the verification mail when a person registers', function () {
    $this->post(route('register.store'), [
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'email' => 'ana.reyes@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'contact_number' => '09171234567',
        'gender' => 'F',
        'birthdate' => now()->subYears(30)->toDateString(),
        'consent_data_processing' => '1',
        'consent_treatment' => '1',
    ])->assertSessionHasNoErrors();

    $verification = $this->sentMail->first(fn ($message) => $message->getSubject() === 'Verify Email Address');

    expect($verification)->not->toBeNull()
        ->and($verification->getTo()[0]->getAddress())->toBe('ana.reyes@example.com');
});

it('delivers the verification mail when it is resent', function () {
    $user = User::factory()->unverified()->create(['email' => 'resend@example.com']);

    $this->actingAs($user)->post(route('verification.send'));

    $verification = $this->sentMail->first(fn ($message) => $message->getSubject() === 'Verify Email Address');

    expect($verification)->not->toBeNull()
        ->and($verification->getTo()[0]->getAddress())->toBe('resend@example.com');
});
