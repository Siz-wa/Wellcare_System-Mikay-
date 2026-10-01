<?php

use App\Jobs\DeliverNotification;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\User;
use Illuminate\Support\Facades\Bus;

/**
 * Task 1.3 — a critical lab result cannot go unacknowledged in silence.
 *
 * The routing was already correct before this task: the requesting doctor is
 * alerted the moment the nurse records a critical value, and the patient only
 * after clinician review. What was missing was the last step of the loop —
 * `read` was a bare boolean with no timestamp, nothing distinguished "opened
 * the bell" from "took responsibility", and nothing escalated an alert nobody
 * touched.
 *
 * Joint Commission Quick Safety 52: sent, received, acknowledged, acted upon.
 */
function criticalNotificationFor(User $doctor, ?Appointment $appointment = null): AppointmentNotification
{
    $appointment ??= Appointment::factory()->create(['doctor_id' => $doctor->id]);

    return AppointmentNotification::create([
        'appointment_id' => $appointment->id,
        'user_id' => $doctor->id,
        'type' => 'lab_critical',
        'subject' => 'Critical Lab Result — Needs Review',
        'body' => 'Potassium 6.8 mmol/L.',
        'read' => false,
    ]);
}

// ── Read is not acknowledged ─────────────────────────────────────────────────

test('reading a critical result does not acknowledge it', function () {
    // The distinction the whole task rests on. Opening the bell is not the same
    // act as accepting a critical value, and the audit trail must not claim it.
    $doctor = userWithRole('doctor');
    $notification = criticalNotificationFor($doctor);

    $this->actingAs($doctor)->post(route('notifications.read', $notification->id));

    $notification->refresh();

    expect($notification->read)->toBeTrue()
        ->and($notification->read_at)->not->toBeNull()
        ->and($notification->acknowledged_at)->toBeNull();
});

test('marking read records when, not just that', function () {
    $doctor = userWithRole('doctor');
    $notification = criticalNotificationFor($doctor);

    $this->actingAs($doctor)->post(route('notifications.read', $notification->id));

    expect($notification->refresh()->read_at)->not->toBeNull();
});

// ── Acknowledgement ──────────────────────────────────────────────────────────

test('a doctor can acknowledge a critical result', function () {
    $doctor = userWithRole('doctor');
    $notification = criticalNotificationFor($doctor);

    $this->actingAs($doctor)
        ->post(route('notifications.acknowledge', $notification->id))
        ->assertSessionHasNoErrors();

    $notification->refresh();

    expect($notification->acknowledged_at)->not->toBeNull()
        ->and($notification->acknowledged_by)->toBe($doctor->id)
        ->and($notification->read)->toBeTrue();
});

test('the first acknowledgement is the one kept', function () {
    // It answers "how long was this result unattended". A later click must not
    // overwrite it and make the response look faster than it was.
    $doctor = userWithRole('doctor');
    $notification = criticalNotificationFor($doctor);

    $this->actingAs($doctor)->post(route('notifications.acknowledge', $notification->id));
    $first = $notification->refresh()->acknowledged_at;

    $this->travel(10)->minutes();
    $this->actingAs($doctor)->post(route('notifications.acknowledge', $notification->id));

    expect($notification->refresh()->acknowledged_at->timestamp)->toBe($first->timestamp);
});

test('a routine notification cannot be acknowledged', function () {
    // Requiring acknowledgement of everything would make the gesture
    // meaningless — a click performed without reading.
    $doctor = userWithRole('doctor');
    $appointment = Appointment::factory()->create(['doctor_id' => $doctor->id]);

    $notification = AppointmentNotification::create([
        'appointment_id' => $appointment->id,
        'user_id' => $doctor->id,
        'type' => 'lab_recorded',
        'subject' => 'Lab Results Ready',
        'body' => 'Ready for review.',
        'read' => false,
    ]);

    $this->actingAs($doctor)
        ->post(route('notifications.acknowledge', $notification->id))
        ->assertStatus(422);
});

test('one doctor cannot acknowledge another doctor\'s alert', function () {
    $owner = userWithRole('doctor');
    $other = userWithRole('doctor');
    $notification = criticalNotificationFor($owner);

    $this->actingAs($other)
        ->post(route('notifications.acknowledge', $notification->id))
        ->assertNotFound();

    expect($notification->refresh()->acknowledged_at)->toBeNull();
});

// ── Escalation ───────────────────────────────────────────────────────────────

test('nothing is escalated before the threshold', function () {
    userWithRole('nurse');
    criticalNotificationFor(userWithRole('doctor'));

    $this->artisan('wellcare:results:escalate')
        ->expectsOutputToContain('Nothing to escalate')
        ->assertSuccessful();
});

test('an unacknowledged critical result is escalated after the threshold', function () {
    Bus::fake();
    userWithRole('nurse');
    $notification = criticalNotificationFor(userWithRole('doctor'));

    $notification->forceFill([
        'created_at' => now()->subMinutes(AppointmentNotification::ESCALATE_AFTER_MINUTES + 1),
    ])->save();

    $this->artisan('wellcare:results:escalate')->assertSuccessful();

    expect($notification->refresh()->escalation_count)->toBe(1)
        ->and($notification->escalated_at)->not->toBeNull();

    Bus::assertDispatched(DeliverNotification::class);
});

test('an acknowledged result is never escalated', function () {
    Bus::fake();
    $doctor = userWithRole('doctor');
    userWithRole('nurse');
    $notification = criticalNotificationFor($doctor);

    $notification->forceFill([
        'created_at' => now()->subHours(2),
    ])->save();
    $notification->acknowledge($doctor);

    // Re-faked so the assertion below sees only what the COMMAND dispatched.
    // Creating the notification above already queues its own delivery — that is
    // task 1.2 working, not an escalation.
    Bus::fake();

    $this->artisan('wellcare:results:escalate')
        ->expectsOutputToContain('Nothing to escalate')
        ->assertSuccessful();

    Bus::assertNotDispatched(DeliverNotification::class);
});

test('escalation stops at the bound rather than repeating forever', function () {
    // An alert that repeats indefinitely trains people to mute the one channel
    // that cannot be muted.
    Bus::fake();
    userWithRole('nurse');
    $notification = criticalNotificationFor(userWithRole('doctor'));

    $notification->forceFill([
        'created_at' => now()->subHours(2),
        'escalation_count' => AppointmentNotification::MAX_ESCALATIONS,
    ])->save();

    $this->artisan('wellcare:results:escalate')
        ->expectsOutputToContain('Nothing to escalate')
        ->assertSuccessful();
});

test('escalation widens to nurses rather than re-notifying the same doctor', function () {
    Bus::fake();
    $doctor = userWithRole('doctor');
    $nurse = userWithRole('nurse');
    $notification = criticalNotificationFor($doctor);

    $notification->forceFill([
        'created_at' => now()->subMinutes(AppointmentNotification::ESCALATE_AFTER_MINUTES + 1),
    ])->save();

    $this->artisan('wellcare:results:escalate')->assertSuccessful();

    // Re-notifying the doctor who has already not responded is not escalation.
    Bus::assertDispatched(
        DeliverNotification::class,
        fn (DeliverNotification $job) => (new ReflectionProperty($job, 'userId'))
            ->getValue($job) === $nurse->id
    );
});

test('having nobody to escalate to is reported as a failure, not a silent success', function () {
    // If there is no nurse or admin account, that is itself the finding.
    Bus::fake();
    $notification = criticalNotificationFor(userWithRole('doctor'));

    $notification->forceFill([
        'created_at' => now()->subHours(2),
    ])->save();

    $this->artisan('wellcare:results:escalate')->assertFailed();
});

test('a dry run changes nothing', function () {
    Bus::fake();
    userWithRole('nurse');
    $notification = criticalNotificationFor(userWithRole('doctor'));

    $notification->forceFill([
        'created_at' => now()->subHours(2),
    ])->save();

    // See the note above: isolate the command's dispatches from the
    // notification's own delivery.
    Bus::fake();

    $this->artisan('wellcare:results:escalate --dry-run')->assertSuccessful();

    expect($notification->refresh()->escalation_count)->toBe(0);
    Bus::assertNotDispatched(DeliverNotification::class);
});

// ── Surfaced to the clinician ────────────────────────────────────────────────

test('an outstanding critical result is counted separately from unread messages', function () {
    $doctor = userWithRole('doctor');
    $notification = criticalNotificationFor($doctor);

    // Cleared the bell, but the clinical work is still outstanding.
    $this->actingAs($doctor)->post(route('notifications.read-all'));

    $response = $this->actingAs($doctor)->get(route('doctor.appointments'));
    $props = $response->viewData('page')['props'];

    expect($props['unreadCount'])->toBe(0)
        ->and($props['unacknowledgedCritical'])->toBe(1);

    $notification->acknowledge($doctor);

    $after = $this->actingAs($doctor)->get(route('doctor.appointments'));

    expect($after->viewData('page')['props']['unacknowledgedCritical'])->toBe(0);
});
