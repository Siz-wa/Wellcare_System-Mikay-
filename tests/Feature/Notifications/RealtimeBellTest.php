<?php

use App\Events\NotificationCreated;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Support\Facades\Event;

/**
 * The bell updates without a page load.
 *
 * Reverb was installed but carried only video signalling, so a patient whose
 * doctor had just confirmed their visit saw nothing until they navigated.
 */
it('announces a new notification on the recipient\'s private channel', function () {
    Event::fake([NotificationCreated::class]);
    $patient = userWithRole('user');
    $appointment = Appointment::factory()->create(['user_id' => $patient->id]);

    $notification = AppointmentNotification::create([
        'appointment_id' => $appointment->id,
        'user_id' => $patient->id,
        'type' => 'confirmed',
        'subject' => 'Confirmed',
        'body' => 'Your appointment is confirmed.',
        'read' => false,
    ]);

    Event::assertDispatched(NotificationCreated::class, function (NotificationCreated $event) use ($patient, $notification) {
        $channel = $event->broadcastOn()[0];

        return $channel instanceof PrivateChannel
            && $channel->name === 'private-App.Models.User.'.$patient->id
            && $event->broadcastWith() === ['id' => $notification->id, 'type' => 'confirmed'];
    });
});

it('carries no clinical content over the socket', function () {
    $event = new NotificationCreated(1, 2, 'lab_critical');

    expect(array_keys($event->broadcastWith()))->toBe(['id', 'type']);
});

it('shares the browser-facing socket address only with signed-in users', function () {
    config(['broadcasting.default' => 'reverb']);

    $this->get('/')->assertInertia(fn ($page) => $page->where('realtime', null));

    $this->actingAs(userWithRole('user'))
        ->get('/user/dashboard')
        ->assertInertia(fn ($page) => $page->has('realtime.key')->has('realtime.host'));
});

/**
 * Shared hosting runs no long-lived processes, so Reverb cannot run there and
 * hosted Pusher serves the same protocol instead. The browser must then dial
 * Pusher's cluster, not the Reverb address left over in the config.
 */
it('points browsers at hosted pusher when that is the broadcaster', function () {
    config([
        'broadcasting.default' => 'pusher',
        'broadcasting.connections.pusher.key' => 'pusher-key',
        'broadcasting.connections.pusher.options.cluster' => 'ap1',
    ]);

    $this->actingAs(userWithRole('user'))
        ->get('/user/dashboard')
        ->assertInertia(fn ($page) => $page
            ->where('realtime.broadcaster', 'pusher')
            ->where('realtime.key', 'pusher-key')
            ->where('realtime.cluster', 'ap1')
            ->where('realtime.host', 'ws-ap1.pusher.com')
            ->where('realtime.port', 443)
            ->where('realtime.scheme', 'https'));
});

it('shares no socket address when broadcasting is off', function () {
    config(['broadcasting.default' => 'null']);

    $this->actingAs(userWithRole('user'))
        ->get('/user/dashboard')
        ->assertInertia(fn ($page) => $page->where('realtime', null));
});
