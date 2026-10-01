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
