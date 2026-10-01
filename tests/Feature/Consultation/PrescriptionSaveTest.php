<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Task 1.1 end-to-end — a doctor can prescribe, and cannot prescribe past a
 * recorded allergy without saying why.
 *
 * Before this task the write path did not exist at all: `prescription.tsx` was
 * built and never rendered, `mapAppointment()` hardcoded `prescriptions => []`,
 * and the only code in the repository that created a ConsultationPrescription
 * was the seeder. These tests are what stop that regressing to a read-only
 * feature again.
 */
function consultationFor(Patient $patient, User $doctor): Appointment
{
    return Appointment::factory()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patient->id,
        'user_id' => $patient->guarantor_id ?? User::factory(),
        'status' => 'in_progress',
        'appointment_date' => today()->toDateString(),
        'appointment_time' => '10:00 AM',
    ]);
}

function savePayload(array $overrides = []): array
{
    return array_merge([
        'soap[subjective]' => 'Cough for three days.',
        'soap[objective]' => 'Chest clear.',
        'soap[assessment]' => 'URTI.',
        'soap[plan]' => 'Rest and fluids.',
        'finalize' => '0',
    ], $overrides);
}

// ── The write path exists ────────────────────────────────────────────────────

test('a doctor can save a prescription', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();
    $appointment = consultationFor($patient, $doctor);

    $this->actingAs($doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", savePayload([
            'medications' => [
                ['name' => 'Paracetamol 500mg', 'instructions' => 'Every 6 hours'],
            ],
        ]))
        ->assertSessionHasNoErrors();

    $session = $appointment->fresh()->consultationSession;

    expect($session->prescriptions)->toHaveCount(1)
        ->and($session->prescriptions->first()->name)->toBe('Paracetamol 500mg')
        ->and($session->prescriptions->first()->instructions)->toBe('Every 6 hours');
});

test('saving again replaces the list rather than appending to it', function () {
    $doctor = userWithRole('doctor');
    $appointment = consultationFor(Patient::factory()->create(), $doctor);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", savePayload([
        'medications' => [['name' => 'Paracetamol 500mg', 'instructions' => 'BID']],
    ]));

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", savePayload([
        'medications' => [['name' => 'Losartan 50mg', 'instructions' => 'OD']],
    ]));

    $session = $appointment->fresh()->consultationSession;

    expect($session->prescriptions)->toHaveCount(1)
        ->and($session->prescriptions->first()->name)->toBe('Losartan 50mg');
});

test('blank medication rows are dropped', function () {
    $doctor = userWithRole('doctor');
    $appointment = consultationFor(Patient::factory()->create(), $doctor);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", savePayload([
        'medications' => [
            ['name' => 'Paracetamol 500mg', 'instructions' => 'BID'],
            ['name' => '', 'instructions' => ''],
            ['name' => '   ', 'instructions' => 'orphaned instruction'],
        ],
    ]));

    expect($appointment->fresh()->consultationSession->prescriptions)->toHaveCount(1);
});

// ── The gate ─────────────────────────────────────────────────────────────────

test('a prescription conflicting with a recorded allergy is refused', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();
    PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'severe',
        'reaction' => 'Anaphylaxis',
    ]);
    $appointment = consultationFor($patient, $doctor);

    $this->actingAs($doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", savePayload([
            'medications' => [['name' => 'Amoxicillin 500mg', 'instructions' => 'TID']],
        ]))
        ->assertSessionHasErrors('consultation')
        ->assertSessionHas('allergyConflicts');

    expect($appointment->fresh()->consultationSession?->prescriptions ?? collect())
        ->toHaveCount(0);
});

test('the refusal rolls the SOAP note back too', function () {
    // One transaction: a doctor must not end up with a saved note and silently
    // discarded medications.
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();
    PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'severe',
    ]);
    $appointment = consultationFor($patient, $doctor);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", savePayload([
        'soap[assessment]' => 'This assessment must not survive.',
        'medications' => [['name' => 'Amoxicillin 500mg', 'instructions' => 'TID']],
    ]));

    expect($appointment->fresh()->consultationSession?->assessment)
        ->not->toBe('This assessment must not survive.');
});

test('the conflict detail reaches the session so the doctor can see what matched', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();
    PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'severe',
        'reaction' => 'Anaphylaxis',
    ]);
    $appointment = consultationFor($patient, $doctor);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", savePayload([
        'medications' => [['name' => 'Amoxicillin 500mg', 'instructions' => 'TID']],
    ]));

    $conflicts = session('allergyConflicts');

    expect($conflicts)->toHaveCount(1)
        ->and($conflicts[0]['name'])->toBe('Amoxicillin 500mg')
        ->and($conflicts[0]['conflicts'][0]['allergen'])->toBe('Penicillin')
        ->and($conflicts[0]['conflicts'][0]['severity'])->toBe('severe')
        ->and($conflicts[0]['conflicts'][0]['reaction'])->toBe('Anaphylaxis');
});

// ── The override ─────────────────────────────────────────────────────────────

test('a reason lets the prescription through and is audited', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();
    PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'mild',
        'reaction' => 'Mild rash',
    ]);
    $appointment = consultationFor($patient, $doctor);

    $this->actingAs($doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", savePayload([
            'medications' => [['name' => 'Amoxicillin 500mg', 'instructions' => 'TID']],
            'allergyOverrideReason' => 'Tolerated this drug twice since the 2019 rash.',
        ]))
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->consultationSession->prescriptions)->toHaveCount(1);

    $this->assertDatabaseHas('activity_log', [
        'description' => 'Allergy warning overridden on a prescription',
        'causer_id' => $doctor->id,
    ]);
});

test('a too-short reason is rejected as a validation error', function () {
    $doctor = userWithRole('doctor');
    $appointment = consultationFor(Patient::factory()->create(), $doctor);

    $this->actingAs($doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", savePayload([
            'medications' => [['name' => 'Amoxicillin 500mg', 'instructions' => 'TID']],
            'allergyOverrideReason' => 'ok',
        ]))
        ->assertSessionHasErrors('allergyOverrideReason');
});

test('the override reason is kept out of the admin-readable audit log', function () {
    // ConsultationPrescription deliberately excludes drug names from
    // activity_log — a drug name is a diagnosis by inference. An allergen and
    // the clinical reason carry the same disclosure, so they stay out too.
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();
    PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'mild',
    ]);
    $appointment = consultationFor($patient, $doctor);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", savePayload([
        'medications' => [['name' => 'Amoxicillin 500mg', 'instructions' => 'TID']],
        'allergyOverrideReason' => 'Tolerated since the 2019 rash, proceeding.',
    ]));

    $properties = DB::table('activity_log')
        ->where('description', 'Allergy warning overridden on a prescription')
        ->value('properties');

    expect($properties)->not->toContain('Penicillin')
        ->and($properties)->not->toContain('Amoxicillin')
        ->and($properties)->not->toContain('2019 rash');
});

// ── A clean prescription is unaffected ───────────────────────────────────────

test('an unrelated drug saves normally for an allergic patient', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();
    PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'severe',
    ]);
    $appointment = consultationFor($patient, $doctor);

    $this->actingAs($doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", savePayload([
            'medications' => [['name' => 'Paracetamol 500mg', 'instructions' => 'Every 6 hours']],
        ]))
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->consultationSession->prescriptions)->toHaveCount(1);
});

test('finalizing saves the prescriptions before the note is sealed', function () {
    $doctor = userWithRole('doctor');
    $appointment = consultationFor(Patient::factory()->create(), $doctor);

    $this->actingAs($doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", savePayload([
            'medications' => [['name' => 'Losartan 50mg', 'instructions' => 'OD']],
            'finalize' => '1',
        ]))
        ->assertSessionHasNoErrors();

    $session = $appointment->fresh()->consultationSession;

    expect($session->status)->toBe('finalized')
        ->and($session->prescriptions)->toHaveCount(1);
});
