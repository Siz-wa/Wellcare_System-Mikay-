<?php

use App\Models\Appointment;
use App\Models\NotificationPreference;
use App\Models\Patient;
use App\Models\User;

/**
 * Task 2.1 — the reminders the `reminder` enum has been reserved for since the
 * notifications table was first created.
 *
 * The value was carried through four enum migrations and dispatched from
 * nowhere, while `no_show` was recorded as a terminal state with nothing trying
 * to prevent one.
 *
 * The test that matters most here is the idempotency one. A reminder system
 * that re-sends is worse than none — it is the fastest way to teach a patient to
 * ignore the clinic's messages.
 */
function upcomingAppointment(array $attributes = []): Appointment
{
    $patient = Patient::factory()->create();

    return Appointment::factory()->create(array_merge([
        'patient_id' => $patient->id,
        'user_id' => User::factory(),
        'status' => 'confirmed',
        'email' => 'patient@example.test',
        'contact_number' => '09171234567',
    ], $attributes));
}

/** An appointment sitting inside the 48-hour window. */
function appointmentInAheadWindow(array $attributes = []): Appointment
{
    $at = now()->addHours(40);

    return upcomingAppointment(array_merge([
        'appointment_date' => $at->toDateString(),
        'appointment_time' => $at->format('g:i A'),
    ], $attributes));
}

// ── The 48-hour tier ─────────────────────────────────────────────────────────

test('an appointment two days out is reminded', function () {
    $appointment = appointmentInAheadWindow();

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    expect($appointment->refresh()->reminded_ahead_at)->not->toBeNull();

    $this->assertDatabaseHas('appointment_notifications', [
        'appointment_id' => $appointment->id,
        'type' => 'reminder',
    ]);
});

test('an appointment outside the window is left alone', function (int $hours) {
    $at = now()->addHours($hours);
    $appointment = upcomingAppointment([
        'appointment_date' => $at->toDateString(),
        'appointment_time' => $at->format('g:i A'),
    ]);

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    expect($appointment->refresh()->reminded_ahead_at)->toBeNull();
})->with([
    'too far out' => [96],
    'not yet due' => [60],
]);

// ── Idempotency: the failure mode that ruins a reminder system ───────────────

test('a second sweep does not re-remind', function () {
    $appointment = appointmentInAheadWindow();

    $this->artisan('wellcare:reminders:send')->assertSuccessful();
    $firstStamp = $appointment->refresh()->reminded_ahead_at;

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    expect($appointment->refresh()->reminded_ahead_at->timestamp)
        ->toBe($firstStamp->timestamp)
        ->and(
            DB::table('appointment_notifications')
                ->where('appointment_id', $appointment->id)
                ->where('type', 'reminder')
                ->count()
        )->toBe(1);
});

test('sent state is recorded even when the patient has muted in-app reminders', function () {
    // The bug this guards. The in-app preference ABORTS the notification row,
    // so a derived "have we reminded?" check would find nothing and re-send
    // every sweep, forever, to exactly the patient who reads by SMS.
    $user = userWithRole('user');
    NotificationPreference::forUser($user)->update([
        'preferences' => array_merge(NotificationPreference::defaults(), [
            NotificationPreference::key('inapp', 'appointments') => false,
        ]),
    ]);

    $appointment = appointmentInAheadWindow(['user_id' => $user->id]);

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    // No row — correctly suppressed …
    $this->assertDatabaseMissing('appointment_notifications', [
        'appointment_id' => $appointment->id,
        'type' => 'reminder',
    ]);

    // … but the clinic still knows it has reminded them.
    expect($appointment->refresh()->reminded_ahead_at)->not->toBeNull();

    $this->artisan('wellcare:reminders:send')->assertSuccessful();
    // And does not do it again.
    expect($appointment->refresh()->reminded_ahead_at)->not->toBeNull();
});

// ── The two tiers are independent ────────────────────────────────────────────

/**
 * Both same-day tests pin the clock to 09:00 first.
 *
 * They build an appointment at `today()` + `now()->addHours(3)`, formatted
 * `g:i A`. Run after 21:00 the addition rolls past midnight, so "2:20 AM"
 * recombined with TODAY'S date lands roughly twenty-one hours in the **past** —
 * the appointment is this morning rather than later today, no same-day reminder
 * is due, and the test fails. It failed for every developer running the suite
 * in the evening and passed for everyone running it in the morning.
 *
 * `travelTo` rather than a smaller offset: any fixed number of hours has some
 * hour of the day that breaks it, and a test whose correctness depends on when
 * it is run is not a test.
 */
test('the same-day reminder is sent for an appointment later today', function () {
    $this->travelTo(today()->setHour(9));

    $appointment = upcomingAppointment([
        'appointment_date' => today()->toDateString(),
        'appointment_time' => now()->addHours(3)->format('g:i A'),
    ]);

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    expect($appointment->refresh()->reminded_same_day_at)->not->toBeNull();
});

test('sending the same-day reminder does not mark the 48-hour one as done', function () {
    // A booking made inside the window never got the ahead reminder. Collapsing
    // the tiers would record it as sent and suppress nothing that was ever sent.
    $this->travelTo(today()->setHour(9));

    $appointment = upcomingAppointment([
        'appointment_date' => today()->toDateString(),
        'appointment_time' => now()->addHours(3)->format('g:i A'),
    ]);

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    $appointment->refresh();

    expect($appointment->reminded_same_day_at)->not->toBeNull()
        ->and($appointment->reminded_ahead_at)->toBeNull();
});

test('an appointment starting within the hour is not reminded', function () {
    // "Your appointment is today" arriving after it started reads as a bug.
    $appointment = upcomingAppointment([
        'appointment_date' => today()->toDateString(),
        'appointment_time' => now()->addMinutes(20)->format('g:i A'),
    ]);

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    expect($appointment->refresh()->reminded_same_day_at)->toBeNull();
});

// ── Which appointments qualify ───────────────────────────────────────────────

test('only confirmed appointments are reminded', function (string $status) {
    $appointment = appointmentInAheadWindow(['status' => $status]);

    $this->artisan('wellcare:reminders:send')->assertSuccessful();

    expect($appointment->refresh()->reminded_ahead_at)->toBeNull();
})->with([
    'requested — not yet accepted by the doctor' => ['requested'],
    'awaiting HMO approval' => ['pending_hmo_approval'],
    'cancelled' => ['cancelled'],
    'no show' => ['no_show'],
    'completed' => ['completed'],
]);

test('a dry run sends nothing and stamps nothing', function () {
    $appointment = appointmentInAheadWindow();

    $this->artisan('wellcare:reminders:send --dry-run')->assertSuccessful();

    expect($appointment->refresh()->reminded_ahead_at)->toBeNull();
    $this->assertDatabaseMissing('appointment_notifications', [
        'appointment_id' => $appointment->id,
        'type' => 'reminder',
    ]);
});

test('nothing due is reported rather than treated as an error', function () {
    $this->artisan('wellcare:reminders:send')
        ->expectsOutputToContain('No appointments due')
        ->assertSuccessful();
});
