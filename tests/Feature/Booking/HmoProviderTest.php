<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use Carbon\Carbon;

/**
 * "Other" is an option on the HMO dropdown, not an answer to it.
 *
 * The dropdown offers it as an escape hatch for a card the clinic is not
 * accredited with, and every form that shows it also asks which provider it
 * actually is. The typed name is what gets stored — there is no second column
 * — so the literal `other` reaching the database means nothing but "the box was
 * left empty", and it reaches HR as a coverage to verify with no company to
 * verify it against.
 *
 * Asserted against the server rather than the form, because the frontend
 * showing a second field is a courtesy that a direct POST bypasses.
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

    $this->date = Carbon::parse('next monday');

    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $this->patientRecord = Patient::factory()->forGuarantor($this->patient)->create([
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'email' => 'juan.delacruz@gmail.com',
        'contact_number' => '09171234567',
        'age' => 34,
        'gender' => 'male',
    ]);

    $this->payload = fn (array $overrides = []) => array_merge([
        'patientId' => $this->patientRecord->id,
        'service' => 'general',
        'branch' => 'Wellcare Dasmarinas',
        'appointmentDate' => $this->date->toDateString(),
        'appointmentTime' => '9:00 AM',
        'consultationType' => 'in_person',
        'coverage' => 'hmo',
        'hmoId' => 'MC-123456',
        'doctorId' => $this->doctor->id,
    ], $overrides);
});

test('booking refuses an HMO named only "other"', function () {
    $this->actingAs($this->patient)
        ->post(route('appointments.store'), ($this->payload)(['hmo' => 'other']))
        ->assertSessionHasErrors('hmo');

    $this->assertDatabaseCount('appointments', 0);
});

test('booking stores the provider a patient typed against "other"', function () {
    $this->actingAs($this->patient)
        ->post(route('appointments.store'), ($this->payload)(['hmo' => 'Sun Life Grepa']))
        ->assertSessionHasNoErrors();

    expect(Appointment::sole()->hmo)->toBe('Sun Life Grepa');
});

test('booking still accepts an accredited provider from the dropdown', function () {
    $this->actingAs($this->patient)
        ->post(route('appointments.store'), ($this->payload)(['hmo' => 'maxicare']))
        ->assertSessionHasNoErrors();

    expect(Appointment::sole()->hmo)->toBe('maxicare');
});

test('saving a patient record refuses an HMO named only "other"', function () {
    $this->actingAs($this->patient)
        ->post(route('user.patients.store'), [
            'firstName' => 'Ana',
            'lastName' => 'Dela Cruz',
            'relationship' => 'child',
            'gender' => 'female',
            'birthdate' => now()->subYears(20)->toDateString(),
            'age' => 20,
            'contactNumber' => '09181234567',
            'defaultCoverage' => 'hmo',
            'hmoProvider' => 'other',
            'hmoId' => 'MC-123456',
        ])
        ->assertSessionHasErrors('hmo_provider');
});

test('registration refuses an HMO named only "other"', function () {
    $this->post(route('register.store'), [
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'maria.santos@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'contact_number' => '09171234567',
        'gender' => 'F',
        'birthdate' => now()->subYears(30)->toDateString(),
        'hmo' => 'other',
        'consent_data_processing' => '1',
        'consent_treatment' => '1',
    ])->assertSessionHasErrors('hmo');

    $this->assertDatabaseMissing('users', ['email' => 'maria.santos@example.com']);
});
