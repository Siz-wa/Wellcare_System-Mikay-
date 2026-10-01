<?php

use App\Models\Appointment;

/**
 * A consultation begins with the patient, not the doctor.
 *
 * The consultations page used to carry a "Start New Session" button that opened
 * the full clinical editor against no appointment at all. It could not work:
 * the editor's Save and Finalize are disabled without a booking, so a doctor
 * could type a complete SOAP note and lose every word of it. It could not be
 * made to work either — a consultation is documented against a booked
 * appointment, and the doctor is not the one who books.
 *
 * The real sequence is the one these tests pin down:
 *
 *   patient checks in (day-of, their own dashboard)  →  status `checked_in`
 *   doctor opens the visit                           →  status `in_progress`
 *
 * The button is gone from the UI; this is the server-side half, and it is what
 * stops the same thing being rebuilt through the API. `start` was previously
 * reachable only from an activity-log test, despite being the endpoint the
 * whole flow now hangs on.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
});

it('starts a visit the patient has checked in for', function () {
    $appointment = Appointment::factory()
        ->forDoctor($this->doctor)
        ->checkedIn()
        ->create();

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$appointment->id}/start")
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->status)->toBe('in_progress');
});

it('refuses to start a visit the patient has not checked in for', function (string $status) {
    $appointment = Appointment::factory()
        ->forDoctor($this->doctor)
        ->create(['status' => $status]);

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$appointment->id}/start")
        ->assertStatus(422);

    // Unchanged: the doctor cannot conjure a visit into existence, and a
    // cancelled or completed one cannot be reopened this way.
    expect($appointment->fresh()->status)->toBe($status);
})->with(['requested', 'pending_hmo_approval', 'confirmed', 'completed', 'cancelled', 'no_show']);

it('refuses to start another doctor\'s visit', function () {
    $appointment = Appointment::factory()
        ->forDoctor(userWithRole('doctor'))
        ->checkedIn()
        ->create();

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$appointment->id}/start")
        ->assertForbidden();

    expect($appointment->fresh()->status)->toBe('checked_in');
});

it('treats a second click as the same request, not an error', function () {
    $appointment = Appointment::factory()
        ->forDoctor($this->doctor)
        ->checkedIn()
        ->create();

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$appointment->id}/start");

    // The editor opens as this posts, so a double-click — or a click landing
    // before the refreshed props arrive — must not throw a 422 error page over
    // a chart the doctor is already writing in.
    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$appointment->id}/start")
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->status)->toBe('in_progress');
});
