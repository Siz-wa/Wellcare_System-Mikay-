<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use Carbon\Carbon;

/**
 * `appointments.consultation_type` — the patient's choice of a video visit
 * rather than an in-clinic one.
 *
 * The interesting property here is not the validation rule; it is that the
 * value survives the whole chain. Booking runs
 *
 *     BookAppointmentRequest -> AppointmentController::store() -> BookingService::bookSlot()
 *
 * and `store()` does NOT use `$request->validated()` — it hand-builds its
 * payload array. So a rule added to the FormRequest with no matching line in
 * the controller validates a field that is then silently dropped, and the
 * appointment quietly books as in-person. These tests assert the persisted
 * column, never the request, because only the column proves the wiring.
 *
 * The second boundary is the service restriction: a blood draw, a scan and
 * physical therapy cannot happen over video, and the frontend hiding the option
 * is a courtesy that a direct POST bypasses.
 */
beforeEach(function () {
    $this->patient = userWithRole('user');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Maria Reyes',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    // `day_of_week` is stored in MySQL DAYOFWEEK convention (1=Sun), so it goes
    // through the model's converter rather than Carbon's dayOfWeek directly.
    $this->date = Carbon::parse('next monday');

    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $this->payload = fn (array $overrides = []) => array_merge([
        'firstName' => 'Juan',
        'lastName' => 'Dela Cruz',
        'email' => 'juan.delacruz@gmail.com',
        'contactNumber' => '09171234567',
        'age' => 34,
        'gender' => 'male',
        'service' => 'general',
        'branch' => 'Wellcare Dasmarinas',
        'appointmentDate' => $this->date->toDateString(),
        'appointmentTime' => '9:00 AM',
        'patientStatus' => 'new',
        'coverage' => 'cash',
        'doctorId' => $this->doctor->id,
    ], $overrides);
});

// ── The value survives the chain ──────────────────────────────────────────────

it('persists a virtual booking all the way to the appointments row', function () {
    $this->actingAs($this->patient)
        ->post('/appointments', ($this->payload)(['consultationType' => 'virtual']))
        ->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first()->consultation_type)->toBe('virtual');
});

it('persists an in-person booking', function () {
    $this->actingAs($this->patient)
        ->post('/appointments', ($this->payload)(['consultationType' => 'in_person']))
        ->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first()->consultation_type)->toBe('in_person');
});

it('defaults to in_person when the client sends no consultation type at all', function () {
    // Every caller written before Phase 3 — including the other booking tests —
    // omits this key. They must keep booking successfully.
    $this->actingAs($this->patient)
        ->post('/appointments', ($this->payload)())
        ->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first()->consultation_type)->toBe('in_person');
});

// ── Validation ────────────────────────────────────────────────────────────────

it('rejects a consultation type outside the enum', function () {
    $this->actingAs($this->patient)
        ->post('/appointments', ($this->payload)(['consultationType' => 'hologram']))
        ->assertSessionHasErrors('consultation_type');

    expect(Appointment::count())->toBe(0);
});

it('refuses a video booking for a service that needs the patient present', function (string $service) {
    $this->actingAs($this->patient)
        ->post('/appointments', ($this->payload)([
            'service' => $service,
            'consultationType' => 'virtual',
        ]))
        ->assertSessionHasErrors('consultation_type');

    expect(Appointment::count())->toBe(0);
})->with(['laboratory', 'imaging', 'physical-therapy']);

it('still allows those services in person', function (string $service) {
    $this->actingAs($this->patient)
        ->post('/appointments', ($this->payload)([
            'service' => $service,
            'consultationType' => 'in_person',
        ]))
        ->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first())
        ->service->toBe($service)
        ->consultation_type->toBe('in_person');
})->with(['laboratory', 'imaging', 'physical-therapy']);

// ── Model helper ──────────────────────────────────────────────────────────────

it('reports isVirtual only for a virtual appointment', function () {
    $virtual = Appointment::factory()->virtual()->create();
    $inPerson = Appointment::factory()->create();

    expect($virtual->isVirtual())->toBeTrue()
        ->and($inPerson->isVirtual())->toBeFalse();
});

it('reports isInConsultation only while the visit is underway', function (string $status, bool $expected) {
    $appointment = Appointment::factory()->create(['status' => $status]);

    expect($appointment->isInConsultation())->toBe($expected);
})->with([
    ['requested', false],
    ['confirmed', false],
    ['checked_in', true],
    ['in_progress', true],
    ['completed', false],
    ['cancelled', false],
]);

// ── The unrelated field is untouched ─────────────────────────────────────────

it('does not disturb the doctor assignment or coverage while adding the new field', function () {
    $this->actingAs($this->patient)
        ->post('/appointments', ($this->payload)(['consultationType' => 'virtual']))
        ->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first())
        ->doctor_id->toBe($this->doctor->id)
        ->coverage->toBe('cash')
        ->status->toBe('requested');
});

it('keeps a guest out of booking entirely', function () {
    $this->post('/appointments', ($this->payload)(['consultationType' => 'virtual']))
        ->assertRedirect('/login');

    expect(Appointment::count())->toBe(0);
});
