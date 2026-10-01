<?php

use App\Models\Appointment;
use App\Models\ConsultationPrescription;
use App\Models\ConsultationSession;
use App\Models\LabTestResult;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use Illuminate\Support\Facades\DB;

/**
 * SC-5 — encryption at rest for the highest-value SPI.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §1.2 and §2.4 (E-1). Every column asserted here
 * was plaintext in MySQL until 2026-09-08: a single `SELECT` returned named
 * conditions against named people.
 *
 * The tests read through `DB::table()` deliberately — going through the model
 * would decrypt on the way out and pass whether or not anything was encrypted,
 * which is the one mistake that would make this whole file worthless.
 */

/** The stored bytes, bypassing Eloquent casts entirely. */
function rawColumn(string $table, int $id, string $column): ?string
{
    return DB::table($table)->where('id', $id)->value($column);
}

test('a diagnosis is unreadable in the database and readable through the model', function () {
    $patient = Patient::factory()->create();

    $diagnosis = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'diagnosis' => 'Major Depressive Disorder',
        'icd_code' => 'F32.9',
        'notes' => 'Referred to psychiatry.',
        'type' => 'primary',
        'status' => 'active',
        'diagnosed_at' => now()->subMonth(),
    ]);

    foreach (['diagnosis' => 'Major Depressive Disorder', 'icd_code' => 'F32.9', 'notes' => 'Referred to psychiatry.'] as $column => $plaintext) {
        expect(rawColumn('patient_diagnoses', $diagnosis->id, $column))
            ->not->toContain($plaintext);
    }

    // ...and the application still works.
    $fresh = $diagnosis->fresh();
    expect($fresh->diagnosis)->toBe('Major Depressive Disorder')
        ->and($fresh->icd_code)->toBe('F32.9')
        ->and($fresh->notes)->toBe('Referred to psychiatry.');
});

test('allergen and reaction are encrypted at rest', function () {
    $patient = Patient::factory()->create();

    $allergy = PatientAllergy::create([
        'patient_id' => $patient->id,
        'allergen' => 'Penicillin',
        'reaction' => 'Anaphylaxis',
        'severity' => 'severe',
    ]);

    expect(rawColumn('patient_allergies', $allergy->id, 'allergen'))->not->toContain('Penicillin')
        ->and(rawColumn('patient_allergies', $allergy->id, 'reaction'))->not->toContain('Anaphylaxis')
        // Severity stays plaintext — it names no substance and the audit trail
        // watches it (QW-3), which would relocate the clear text anyway.
        ->and(rawColumn('patient_allergies', $allergy->id, 'severity'))->toBe('severe');

    expect($allergy->fresh()->allergen)->toBe('Penicillin');
});

test('the SOAP note is encrypted at rest', function () {
    $appointment = Appointment::factory()->create();

    $session = ConsultationSession::create([
        'appointment_id' => $appointment->id,
        'doctor_id' => $appointment->doctor_id,
        'subjective' => 'Reports chest tightness for three days.',
        'objective' => 'BP 150/95, no murmur.',
        'assessment' => 'Suspected angina.',
        'plan' => 'ECG, refer to cardiology.',
        'status' => 'draft',
    ]);

    foreach (['subjective' => 'chest tightness', 'objective' => 'no murmur', 'assessment' => 'angina', 'plan' => 'cardiology'] as $column => $fragment) {
        expect(rawColumn('consultation_sessions', $session->id, $column))->not->toContain($fragment);
    }

    expect($session->fresh()->assessment)->toBe('Suspected angina.');
});

test('a prescription name is encrypted — a drug is a diagnosis by inference', function () {
    $appointment = Appointment::factory()->create();
    $session = ConsultationSession::create([
        'appointment_id' => $appointment->id,
        'doctor_id' => $appointment->doctor_id,
        'status' => 'draft',
    ]);

    $prescription = ConsultationPrescription::create([
        'session_id' => $session->id,
        'name' => 'Metformin 500mg',
        'instructions' => 'Twice daily with food',
    ]);

    expect(rawColumn('consultation_prescriptions', $prescription->id, 'name'))->not->toContain('Metformin')
        ->and($prescription->fresh()->name)->toBe('Metformin 500mg');
});

test('lab notes are encrypted but the searchable test name is not', function () {
    $patient = Patient::factory()->create();

    $result = LabTestResult::factory()->create([
        'patient_id' => $patient->id,
        'test_name' => 'HbA1c',
        'notes' => 'Fasting sample, haemolysed.',
        'interpretation' => 'Consistent with poorly controlled diabetes.',
    ]);

    expect(rawColumn('lab_test_results', $result->id, 'notes'))->not->toContain('haemolysed')
        ->and(rawColumn('lab_test_results', $result->id, 'interpretation'))->not->toContain('diabetes')
        // Deliberately plaintext: LabReviewController searches this column with
        // LIKE, and LIKE over ciphertext returns nothing rather than erroring —
        // it would break the screen silently.
        ->and(rawColumn('lab_test_results', $result->id, 'test_name'))->toBe('HbA1c');
});

test('insurance member numbers are encrypted on both tables that hold them', function () {
    $patient = Patient::factory()->create(['hmo_id' => 'MX-99887766']);
    $appointment = Appointment::factory()->create([
        'hmo_id' => 'MX-99887766',
        'additional_info' => 'Prefers a female doctor.',
    ]);

    expect(rawColumn('patients', $patient->id, 'hmo_id'))->not->toContain('99887766')
        ->and(rawColumn('appointments', $appointment->id, 'hmo_id'))->not->toContain('99887766')
        ->and(rawColumn('appointments', $appointment->id, 'additional_info'))->not->toContain('female doctor');

    expect($patient->fresh()->hmo_id)->toBe('MX-99887766')
        ->and($appointment->fresh()->hmo_id)->toBe('MX-99887766');
});

// ── The search paths that encryption must not have broken ────────────────────

test('patient search still works — the searched columns were left plaintext', function () {
    $doctor = userWithRole('doctor');
    Patient::factory()->create([
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'email' => 'juan@example.com',
    ]);

    $this->actingAs($doctor)
        ->get(route('doctor.patient-records', ['search' => 'Dela Cruz']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('patients.data', 1));
});

test('lab review search still works', function () {
    $doctor = userWithRole('doctor');
    LabTestResult::factory()->create(['test_name' => 'Complete Blood Count']);

    $this->actingAs($doctor)
        ->get(route('doctor.lab-reviews', ['search' => 'Complete Blood']))
        ->assertOk();
});

// ── ND-8: the key is now load-bearing ────────────────────────────────────────

test('encrypted values survive a key rotation through APP_PREVIOUS_KEYS', function () {
    $patient = Patient::factory()->create();
    $diagnosis = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'diagnosis' => 'Hypertension',
        'type' => 'chronic',
        'status' => 'active',
        'diagnosed_at' => now()->subMonth(),
    ]);

    $oldKey = config('app.key');
    $newKey = 'base64:'.base64_encode(random_bytes(32));

    // Exactly the production rotation: promote a new key, keep the old one as a
    // previous key. This is the mitigation that makes ND-8's key-loss risk
    // recoverable rather than terminal, so it is asserted rather than assumed.
    config(['app.key' => $newKey, 'app.previous_keys' => [$oldKey]]);
    app()->forgetInstance('encrypter');

    expect($diagnosis->fresh()->diagnosis)->toBe('Hypertension');

    // A row written after rotation uses the new key and still reads back.
    $written = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'diagnosis' => 'Type 2 Diabetes',
        'type' => 'chronic',
        'status' => 'active',
        'diagnosed_at' => now(),
    ]);

    expect($written->fresh()->diagnosis)->toBe('Type 2 Diabetes');
});
