<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Services\BookingService;
use Carbon\Carbon;

/**
 * `appointments.patient_status` is derived, not asked.
 *
 * It used to be a New / Returning toggle the patient answered themselves, which
 * was wrong twice over: it is a fact about the record rather than an opinion,
 * and on a guarantor account the answer was about the wrong person — a
 * first-time child was filed as "returning" because their mother had visited
 * before. It is now read off the chosen patient's own visit history.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Maria Reyes',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    $this->date = Carbon::parse('next monday');

    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $this->mother = Patient::factory()->forGuarantor($this->guarantor)->create([
        'relationship_to_guarantor' => 'self',
    ]);
    $this->child = Patient::factory()->forGuarantor($this->guarantor)->create([
        'relationship_to_guarantor' => 'child',
    ]);

    $this->book = fn (Patient $patient, string $time = '9:00 AM') => $this->actingAs($this->guarantor)
        ->post('/appointments', [
            'patientId' => $patient->id,
            'service' => 'general',
            'appointmentDate' => $this->date->toDateString(),
            'appointmentTime' => $time,
            'coverage' => 'cash',
            'doctorId' => $this->doctor->id,
        ]);
});

it('files a first-time patient as new', function () {
    ($this->book)($this->child)->assertSessionHasNoErrors();

    expect(Appointment::sole()->patient_status)->toBe('new');
});

it('files a patient who has been seen before as returning', function () {
    Appointment::factory()->create([
        'patient_id' => $this->child->id,
        'status' => 'completed',
    ]);

    ($this->book)($this->child)->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first()->patient_status)->toBe('returning');
});

it('does not count a cancelled or no-show visit as having been seen', function (string $status) {
    Appointment::factory()->create([
        'patient_id' => $this->child->id,
        'status' => $status,
    ]);

    ($this->book)($this->child)->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first()->patient_status)->toBe('new');
})->with(['cancelled', 'no_show']);

it('judges each patient on their own history, not the account’s', function () {
    // The bug this replaces: the mother had visited, so her child's first ever
    // appointment was pre-selected as "returning".
    Appointment::factory()->create([
        'patient_id' => $this->mother->id,
        'status' => 'completed',
    ]);

    ($this->book)($this->child)->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first())
        ->patient_id->toBe($this->child->id)
        ->patient_status->toBe('new');
});

it('ignores a patient status the client tries to send', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', [
            'patientId' => $this->child->id,
            'service' => 'general',
            'appointmentDate' => $this->date->toDateString(),
            'appointmentTime' => '9:00 AM',
            'coverage' => 'cash',
            'doctorId' => $this->doctor->id,
            'patientStatus' => 'returning',
        ])
        ->assertSessionHasNoErrors();

    expect(Appointment::sole()->patient_status)->toBe('new');
});

it('still honours an explicit status from a direct service call', function () {
    // Seeders and the older booking tests build their own payload arrays and
    // set this themselves; the derivation must not override them.
    app(BookingService::class)->bookSlot([
        'user_id' => $this->guarantor->id,
        'patient_id' => $this->child->id,
        'service' => 'general',
        'appointment_date' => $this->date->toDateString(),
        'appointment_time' => '9:00 AM',
        'coverage' => 'cash',
        'doctor_id' => $this->doctor->id,
        'patient_status' => 'returning',
    ]);

    expect(Appointment::sole()->patient_status)->toBe('returning');
});
