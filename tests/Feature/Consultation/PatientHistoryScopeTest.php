<?php

use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\Patient;

/**
 * The security boundary around `/doctor/consultations/patient-history`.
 *
 * This endpoint takes an email address and returns a patient's last 20
 * completed consultations *in full* — SOAP narrative, vitals and
 * prescriptions. Until this test existed its only guard was `role:doctor`,
 * which answers "is this user a doctor?" and never "is this user *this
 * patient's* doctor?". Any doctor in the clinic could read any patient's
 * clinical record by supplying an address, and the frontend already sends one
 * it reads straight off the appointment row.
 *
 * The fix scopes the query to the signed-in doctor's own appointments. The two
 * directions that matter:
 *
 *   1. A doctor still gets their own patients' history — the narrowing must not
 *      break the feature it protects.
 *   2. A different doctor gets nothing, and specifically no fragment of the
 *      narrative leaks into the response body.
 *
 * Asserted against the raw body as well as the parsed JSON, because a partial
 * leak through a differently-shaped payload would still pass a count check.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
    $this->otherDoctor = userWithRole('doctor');
    $this->guarantor = userWithRole('user');

    $this->record = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Alice',
        'last_name' => 'Reyes',
    ]);

    $this->appointment = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->create([
            'email' => 'alice.reyes@example.com',
            'status' => 'completed',
            'appointment_date' => now()->subWeek()->toDateString(),
        ]);

    ConsultationSession::create([
        'appointment_id' => $this->appointment->id,
        'doctor_id' => $this->doctor->id,
        'subjective' => 'PATIENT-NARRATIVE-SENTINEL',
        'assessment' => 'Hypertension, stage 1',
        'plan' => 'Amlodipine 5mg daily',
        'blood_pressure' => '150/95',
        'status' => 'finalized',
    ]);
});

// ── The feature still works for the doctor who owns the record ────────────────

it('returns a doctor their own completed consultation history', function () {
    $this->actingAs($this->doctor)
        ->getJson('/doctor/consultations/patient-history?email=alice.reyes@example.com')
        ->assertOk()
        ->assertJsonCount(1, 'history')
        ->assertJsonPath('history.0.id', $this->appointment->id)
        ->assertJsonPath('history.0.soap.subjective', 'PATIENT-NARRATIVE-SENTINEL')
        ->assertJsonPath('history.0.vitals.bloodPressure', '150/95');
});

it('still honours exclude_id for the owning doctor', function () {
    $second = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->create([
            'email' => 'alice.reyes@example.com',
            'status' => 'completed',
            'appointment_date' => now()->subDays(2)->toDateString(),
        ]);

    $this->actingAs($this->doctor)
        ->getJson("/doctor/consultations/patient-history?email=alice.reyes@example.com&exclude_id={$second->id}")
        ->assertOk()
        ->assertJsonCount(1, 'history')
        ->assertJsonPath('history.0.id', $this->appointment->id);
});

// ── The boundary ──────────────────────────────────────────────────────────────

it('returns nothing to a doctor who did not attend the consultation', function () {
    $response = $this->actingAs($this->otherDoctor)
        ->getJson('/doctor/consultations/patient-history?email=alice.reyes@example.com')
        ->assertOk()
        ->assertJsonCount(0, 'history');

    // The count alone would pass on a payload that leaked the narrative under a
    // different key. Assert on the bytes actually sent.
    expect($response->getContent())
        ->not->toContain('PATIENT-NARRATIVE-SENTINEL')
        ->not->toContain('Amlodipine')
        ->not->toContain('150/95');
});

it('does not leak history through a second doctors own appointment for the same patient', function () {
    // The other doctor legitimately sees this same person for something else.
    // They must get their own row and nothing from the first doctor's visit.
    $theirs = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->otherDoctor)
        ->create([
            'email' => 'alice.reyes@example.com',
            'status' => 'completed',
            'appointment_date' => now()->subDay()->toDateString(),
        ]);

    $response = $this->actingAs($this->otherDoctor)
        ->getJson('/doctor/consultations/patient-history?email=alice.reyes@example.com')
        ->assertOk()
        ->assertJsonCount(1, 'history')
        ->assertJsonPath('history.0.id', $theirs->id);

    expect($response->getContent())->not->toContain('PATIENT-NARRATIVE-SENTINEL');
});

// ── Role gating, unchanged but pinned ────────────────────────────────────────

it('refuses the history endpoint to every non-doctor role', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->getJson('/doctor/consultations/patient-history?email=alice.reyes@example.com')
        ->assertForbidden();
})->with(['user', 'nurse', 'hr', 'admin']);

it('sends a guest to login rather than the history endpoint', function () {
    $this->get('/doctor/consultations/patient-history?email=alice.reyes@example.com')
        ->assertRedirect('/login');
});
