<?php

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\PaymentVerification;
use App\Models\User;

/**
 * Every way an appointment gets cancelled tells the other party.
 *
 * Pre-handover QA found that the patient's own cancel button promised "your
 * doctor is notified" and notified nobody, and that a doctor's time off
 * cancelled whole days — confirmed and paid bookings included — without a
 * single patient hearing about it.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
    $this->patient = userWithRole('user');
});

function bookingFor(User $patient, User $doctor, array $overrides = []): Appointment
{
    return Appointment::factory()->forDoctor($doctor)->create([
        'user_id' => $patient->id,
        'appointment_date' => now()->addDays(5)->toDateString(),
        'status' => 'confirmed',
        ...$overrides,
    ]);
}

it('tells the doctor when a patient cancels from the dashboard', function () {
    $appointment = bookingFor($this->patient, $this->doctor);

    $this->actingAs($this->patient)
        ->post("/user/appointments/{$appointment->id}/cancel")
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->status)->toBe('cancelled')
        ->and(AppointmentNotification::where('user_id', $this->doctor->id)
            ->where('appointment_id', $appointment->id)
            ->where('type', 'cancelled')
            ->exists())->toBeTrue();
});

it('records the reason a patient gives', function () {
    $appointment = bookingFor($this->patient, $this->doctor);

    $this->actingAs($this->patient)
        ->post("/user/appointments/{$appointment->id}/cancel", ['reason' => 'Feeling better'])
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->cancellation_reason)->toBe('Feeling better');
});

it('notifies every patient whose appointment a doctor time-off cancels', function () {
    $date = now()->addDays(6)->toDateString();
    $confirmed = bookingFor($this->patient, $this->doctor, ['appointment_date' => $date]);
    $other = userWithRole('user');
    $requested = bookingFor($other, $this->doctor, [
        'appointment_date' => $date,
        'appointment_time' => '10:00 AM',
        'status' => 'requested',
    ]);

    $this->actingAs($this->doctor)
        ->post('/doctor/availability/time-off', ['date' => $date, 'reason' => 'Medical conference'])
        ->assertSessionHasNoErrors();

    foreach ([[$confirmed, $this->patient], [$requested, $other]] as [$appointment, $owner]) {
        expect($appointment->fresh()->status)->toBe('cancelled')
            ->and(AppointmentNotification::where('user_id', $owner->id)
                ->where('appointment_id', $appointment->id)
                ->where('type', 'cancelled')
                ->exists())->toBeTrue();
    }
});

it('cancels the same appointments whether the doctor or an admin closes the day', function () {
    $date = now()->addDays(7)->toDateString();
    $confirmed = bookingFor($this->patient, $this->doctor, ['appointment_date' => $date]);

    $this->actingAs(userWithRole('admin'))
        ->post("/admin/doctors/{$this->doctor->id}/out-of-office", ['date' => $date])
        ->assertSessionHasNoErrors();

    // The admin path used to cancel only `requested`, leaving confirmed
    // bookings on a day the doctor was not coming in.
    expect($confirmed->fresh()->status)->toBe('cancelled')
        ->and(AppointmentNotification::where('user_id', $this->patient->id)->where('type', 'cancelled')->exists())
        ->toBeTrue();
});

it('asks HR for a refund decision when a paid booking is cancelled', function () {
    $hr = userWithRole('hr');
    $appointment = bookingFor($this->patient, $this->doctor, ['consultation_type' => 'virtual']);
    PaymentVerification::factory()->forAppointment($appointment)->create([
        'status' => 'verified',
        'amount_paid' => 500,
        'verified_at' => now(),
    ]);

    $this->actingAs($this->doctor)
        ->post("/doctor/appointments/{$appointment->id}/cancel")
        ->assertSessionHasNoErrors();

    expect(AppointmentNotification::where('user_id', $hr->id)->where('type', 'refund_due')->exists())->toBeTrue()
        ->and(AppointmentNotification::where('user_id', $this->patient->id)->where('type', 'cancelled')->first()->body)
        ->toContain('₱500.00');
});

it('does not tell a video patient to come to the clinic when their visit is confirmed', function () {
    $appointment = bookingFor($this->patient, $this->doctor, [
        'status' => 'requested',
        'consultation_type' => 'virtual',
    ]);

    $this->actingAs($this->doctor)->post("/doctor/appointments/{$appointment->id}/confirm");

    $body = AppointmentNotification::where('user_id', $this->patient->id)->where('type', 'confirmed')->value('body');

    expect($body)->not->toContain('arrive at the clinic')
        ->and($body)->toContain('video room');
});

it('refuses to cancel a visit that is already under way', function () {
    $appointment = bookingFor($this->patient, $this->doctor, ['status' => 'checked_in']);

    $this->actingAs($this->patient)
        ->post("/user/appointments/{$appointment->id}/cancel")
        ->assertSessionHasErrors('cancel');

    expect($appointment->fresh()->status)->toBe('checked_in');
});

it('marks video visits on the doctor appointment list', function () {
    bookingFor($this->patient, $this->doctor, ['status' => 'requested', 'consultation_type' => 'virtual']);

    $this->actingAs($this->doctor)
        ->get('/doctor/appointments')
        ->assertInertia(fn ($page) => $page->where('appointments.0.consultationType', 'virtual'));
});
