<?php

use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\LoaRequest;
use App\Models\Patient;
use App\Models\User;
use App\Services\BookingService;

/**
 * Task 2.2 — moving an appointment as one transaction.
 *
 * The path this replaces was cancel-then-rebook, which releases the old slot
 * before the new one is secured: a patient moving an appointment could end up
 * with none, having had one when they started.
 *
 * Two things these tests pin that are easy to get wrong:
 *
 *   • the appointment must not conflict with ITSELF — its own row occupies the
 *     patient's day and the doctor's cap, so every check has to exclude it;
 *   • the origin slot must actually be released, and the identity of the
 *     appointment must survive, or this is a rebook wearing a different name.
 */
function reschedulableDoctor(): User
{
    $doctor = userWithRole('doctor');

    // A doctor with no published profile offers no slots at all — BookingService
    // checks `doctor_profiles.is_active` before it looks at availability.
    DoctorProfile::create([
        'user_id' => $doctor->id,
        'display_name' => 'Dr. Reschedule',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    // Availability on every weekday, so a move to "five days from now" lands on
    // an open day whenever the suite happens to run. `isoToStoredDay` converts
    // to the MySQL DAYOFWEEK convention the column stores.
    foreach (range(1, 7) as $isoDay) {
        AvailabilityBlock::create([
            'doctor_id' => $doctor->id,
            'day_of_week' => AvailabilityBlock::isoToStoredDay($isoDay),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'slot_duration_minutes' => 30,
            'is_available' => true,
        ]);
    }

    return $doctor;
}

function bookedAppointment(User $doctor, ?Patient $patient = null, array $attributes = []): Appointment
{
    $patient ??= Patient::factory()->create();
    $at = now()->addDays(5)->setTime(9, 0);

    return Appointment::factory()->create(array_merge([
        'doctor_id' => $doctor->id,
        'patient_id' => $patient->id,
        'user_id' => User::factory(),
        'status' => 'confirmed',
        'appointment_date' => $at->toDateString(),
        'appointment_time' => '9:00 AM',
        'duration_minutes' => 30,
    ], $attributes));
}

function booking(): BookingService
{
    return app(BookingService::class);
}

// ── The move ─────────────────────────────────────────────────────────────────

test('an appointment keeps its identity when moved', function () {
    // The whole point. A cancel-and-rebook produces a new row and loses the
    // history; a reschedule is an update.
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor);
    $originalId = $appointment->id;

    $newDate = now()->addDays(6)->toDateString();
    $moved = booking()->rescheduleAppointment($appointment, $newDate, '10:00 AM');

    expect($moved->id)->toBe($originalId)
        ->and($moved->appointment_date->toDateString())->toBe($newDate)
        ->and($moved->appointment_time)->toBe('10:00 AM')
        ->and($moved->status)->toBe('confirmed');

    expect(Appointment::count())->toBe(1);
});

test('the sort key follows the move', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor);

    $newDate = now()->addDays(6)->toDateString();
    $moved = booking()->rescheduleAppointment($appointment, $newDate, '2:30 PM');

    expect($moved->appointment_at->format('Y-m-d H:i'))->toBe("{$newDate} 14:30");
});

test('the origin slot is released', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor);
    $originDate = $appointment->appointment_date->toDateString();

    booking()->rescheduleAppointment($appointment, now()->addDays(6)->toDateString(), '10:00 AM');

    // Somebody else can now take 9:00 AM on the original day.
    expect(booking()->getAvailableSlots($doctor->id, $originDate))
        ->toContain('9:00 AM');
});

// ── It must not conflict with itself ─────────────────────────────────────────

test('moving to a different time on the same day is allowed', function () {
    // The self-collision case: the appointment's own row sits in the day it is
    // moving within.
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor);
    $sameDay = $appointment->appointment_date->toDateString();

    $moved = booking()->rescheduleAppointment($appointment, $sameDay, '11:00 AM');

    expect($moved->appointment_time)->toBe('11:00 AM');
});

test('moving to the slot it already occupies is not reported as a clash', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor);

    $moved = booking()->rescheduleAppointment(
        $appointment,
        $appointment->appointment_date->toDateString(),
        '9:00 AM',
    );

    expect($moved->appointment_time)->toBe('9:00 AM');
});

// ── Conflicts that are real ──────────────────────────────────────────────────

test('a slot already taken by someone else is refused', function () {
    $doctor = reschedulableDoctor();
    $mine = bookedAppointment($doctor);

    $theirDate = now()->addDays(6)->toDateString();
    bookedAppointment($doctor, null, [
        'appointment_date' => $theirDate,
        'appointment_time' => '10:00 AM',
    ]);

    expect(fn () => booking()->rescheduleAppointment($mine, $theirDate, '10:00 AM'))
        ->toThrow(SlotUnavailableException::class);

    // And the original booking is untouched — the patient still has one.
    expect($mine->refresh()->appointment_time)->toBe('9:00 AM');
});

test('the patient cannot be moved onto a time they already occupy', function () {
    $doctor = reschedulableDoctor();
    $patient = Patient::factory()->create();

    $first = bookedAppointment($doctor, $patient);
    $second = bookedAppointment($doctor, $patient, [
        'appointment_time' => '2:00 PM',
    ]);

    // One person cannot be in two rooms at once.
    expect(fn () => booking()->rescheduleAppointment(
        $second,
        $first->appointment_date->toDateString(),
        '9:00 AM',
    ))->toThrow(SlotUnavailableException::class);
});

test('a slot inside the minimum lead time is refused', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor);

    expect(fn () => booking()->rescheduleAppointment(
        $appointment,
        today()->toDateString(),
        now()->addMinutes(30)->format('g:i A'),
    ))->toThrow(SlotUnavailableException::class);
});

// ── States that cannot be moved ──────────────────────────────────────────────

test('an appointment that has progressed can no longer be rescheduled', function (string $status) {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor, null, ['status' => $status]);

    expect(fn () => booking()->rescheduleAppointment(
        $appointment,
        now()->addDays(6)->toDateString(),
        '10:00 AM',
    ))->toThrow(SlotUnavailableException::class);
})->with([
    'checked in' => ['checked_in'],
    'in progress' => ['in_progress'],
    'completed' => ['completed'],
    'cancelled' => ['cancelled'],
    'no show' => ['no_show'],
]);

// ── HMO approval does not travel silently ────────────────────────────────────

test('moving past an approved LOA sends it back for re-approval', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor, null, ['coverage' => 'hmo']);

    LoaRequest::create([
        'appointment_id' => $appointment->id,
        'patient_id' => $appointment->patient_id,
        'status' => 'approved',
        'valid_until' => now()->addDays(5)->toDateString(),
    ]);

    // Beyond the LOA's validity.
    $moved = booking()->rescheduleAppointment(
        $appointment,
        now()->addDays(20)->toDateString(),
        '10:00 AM',
    );

    expect($moved->status)->toBe('pending_hmo_approval');
});

test('moving within an approved LOA keeps the approval', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor, null, ['coverage' => 'hmo']);

    LoaRequest::create([
        'appointment_id' => $appointment->id,
        'patient_id' => $appointment->patient_id,
        'status' => 'approved',
        'valid_until' => now()->addDays(30)->toDateString(),
    ]);

    $moved = booking()->rescheduleAppointment(
        $appointment,
        now()->addDays(6)->toDateString(),
        '10:00 AM',
    );

    expect($moved->status)->toBe('confirmed');
});

test('a cash appointment is unaffected by LOA logic', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor, null, ['coverage' => 'cash']);

    $moved = booking()->rescheduleAppointment(
        $appointment,
        now()->addDays(20)->toDateString(),
        '10:00 AM',
    );

    expect($moved->status)->toBe('confirmed');
});

// ── Reminders follow the appointment ─────────────────────────────────────────

test('a moved appointment can be reminded about again', function () {
    // Reminders already sent describe a date that no longer applies. A patient
    // who moves an appointment and is never reminded of the new time is worse
    // off than before they moved it.
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor);
    $appointment->forceFill([
        'reminded_ahead_at' => now(),
        'reminded_same_day_at' => now(),
    ])->save();

    $moved = booking()->rescheduleAppointment(
        $appointment,
        now()->addDays(6)->toDateString(),
        '10:00 AM',
    );

    expect($moved->reminded_ahead_at)->toBeNull()
        ->and($moved->reminded_same_day_at)->toBeNull();
});

// ── The route ────────────────────────────────────────────────────────────────

test('the booking account can reschedule its own appointment', function () {
    $doctor = reschedulableDoctor();
    $user = userWithRole('user');
    $appointment = bookedAppointment($doctor, null, ['user_id' => $user->id]);

    $this->actingAs($user)
        ->post(route('appointments.reschedule', $appointment), [
            'appointment_date' => now()->addDays(6)->toDateString(),
            'appointment_time' => '10:00 AM',
        ])
        ->assertSessionHasNoErrors();

    expect($appointment->refresh()->appointment_time)->toBe('10:00 AM');
});

test('another patient cannot reschedule someone else\'s appointment', function () {
    $doctor = reschedulableDoctor();
    $appointment = bookedAppointment($doctor, null, ['user_id' => userWithRole('user')->id]);

    $this->actingAs(userWithRole('user'))
        ->post(route('appointments.reschedule', $appointment), [
            'appointment_date' => now()->addDays(6)->toDateString(),
            'appointment_time' => '10:00 AM',
        ])
        ->assertForbidden();

    expect($appointment->refresh()->appointment_time)->toBe('9:00 AM');
});

test('the doctor is told when a patient moves their appointment', function () {
    $doctor = reschedulableDoctor();
    $user = userWithRole('user');
    $appointment = bookedAppointment($doctor, null, ['user_id' => $user->id]);

    $this->actingAs($user)->post(route('appointments.reschedule', $appointment), [
        'appointment_date' => now()->addDays(6)->toDateString(),
        'appointment_time' => '10:00 AM',
    ]);

    expect(AppointmentNotification::where('user_id', $doctor->id)->where('type', 'rescheduled')->exists())
        ->toBeTrue();
});

test('the patient dashboard offers reschedule for a movable booking', function () {
    $doctor = reschedulableDoctor();
    $user = userWithRole('user');
    $patient = Patient::factory()->forGuarantor($user)->create();
    $appointment = bookedAppointment($doctor, $patient, ['user_id' => $user->id]);

    $this->actingAs($user)
        ->get('/user/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('bookingWindow.min')
            ->where('appointments.0.id', $appointment->id)
            ->where('appointments.0.canReschedule', true)
            ->where('appointments.0.doctorId', $doctor->id));
});
