<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;

/**
 * Guards the fix for the lexical-sort bug.
 *
 * `appointment_time` is a varchar holding a display string ("9:00 AM", written
 * by BookingService via format('g:i A')), so ORDER BY over it sorts
 * alphabetically: "1:00 PM" < "10:00 AM" < "8:00 AM". Five controllers ordered
 * the clinic day that way and showed the afternoon first.
 *
 * `appointment_at` is the real datetime column that replaced it in those
 * queries, kept in step by Appointment::booted().
 *
 * Note the times chosen below. They are the ones that actually separate a
 * lexical sort from a chronological one — an "8:00/9:00/10:00" fixture passes
 * under both and proves nothing. The existing suite missed this bug partly
 * because AppointmentFactory writes a zero-padded "09:00 AM", which is the one
 * format that happens to sort correctly as a string.
 */
function appointmentAtTime(string $time, string $date = '2026-10-15'): Appointment
{
    return Appointment::factory()->create([
        'appointment_date' => $date,
        'appointment_time' => $time,
    ]);
}

test('appointment_at is derived from the date and display time on create', function () {
    $appointment = appointmentAtTime('1:00 PM');

    expect($appointment->fresh()->appointment_at->format('Y-m-d H:i'))
        ->toBe('2026-10-15 13:00');
});

test('the twelve-hour boundaries are not off by twelve hours', function (string $time, string $expected) {
    expect(appointmentAtTime($time)->fresh()->appointment_at->format('H:i'))
        ->toBe($expected);
})->with([
    'noon' => ['12:00 PM', '12:00'],
    'midnight' => ['12:30 AM', '00:30'],
    'morning' => ['9:00 AM', '09:00'],
    'afternoon' => ['4:30 PM', '16:30'],
    'padded' => ['09:00 AM', '09:00'],
]);

test('ordering by appointment_at is chronological where ordering by the string is not', function () {
    // Deliberately inserted out of order, and chosen so the two sorts disagree.
    foreach (['1:00 PM', '10:00 AM', '8:00 AM', '9:30 AM', '12:00 PM'] as $time) {
        appointmentAtTime($time);
    }

    expect(Appointment::orderBy('appointment_at')->pluck('appointment_time')->all())
        ->toBe(['8:00 AM', '9:30 AM', '10:00 AM', '12:00 PM', '1:00 PM']);

    // The bug, pinned: the old ordering really does put the afternoon first.
    // If this ever starts matching chronological order, the fixture has lost
    // the property that makes the test above meaningful.
    expect(Appointment::orderBy('appointment_time')->pluck('appointment_time')->all())
        ->toBe(['1:00 PM', '10:00 AM', '12:00 PM', '8:00 AM', '9:30 AM']);
});

test('moving an appointment moves its sort key', function () {
    $appointment = appointmentAtTime('9:00 AM');

    $appointment->update([
        'appointment_date' => '2026-10-16',
        'appointment_time' => '2:30 PM',
    ]);

    expect($appointment->fresh()->appointment_at->format('Y-m-d H:i'))
        ->toBe('2026-10-16 14:30');
});

test('startsAt reads the stored column and still works before save', function () {
    $saved = appointmentAtTime('3:15 PM');
    expect($saved->startsAt()->format('Y-m-d H:i'))->toBe('2026-10-15 15:15');

    // An unsaved instance has no stored column yet; startsAt() must still
    // answer, because BookingService builds windows from models in memory.
    $unsaved = new Appointment([
        'appointment_date' => '2026-10-15',
        'appointment_time' => '3:15 PM',
    ]);
    expect($unsaved->startsAt()->format('Y-m-d H:i'))->toBe('2026-10-15 15:15');
});

test('the doctor appointment list returns the day in chronological order', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();

    foreach (['1:00 PM', '8:00 AM', '10:00 AM'] as $time) {
        Appointment::factory()->create([
            'doctor_id' => $doctor->id,
            'patient_id' => $patient->id,
            'user_id' => User::factory(),
            'status' => 'confirmed',
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => $time,
        ]);
    }

    $response = $this->actingAs($doctor)->get(route('doctor.appointments'));

    $times = collect($response->viewData('page')['props']['appointments'])
        ->pluck('time')
        ->all();

    expect($times)->toBe(['8:00 AM', '10:00 AM', '1:00 PM']);
});
