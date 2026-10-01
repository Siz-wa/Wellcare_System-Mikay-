<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use App\Models\RecordAccessLog;
use App\Policies\PatientPolicy;
use Illuminate\Support\Facades\Storage;

/**
 * SC-2 — the authorization matrix, asserted.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.2 (A-1, A-2, A-3, A-10).
 *
 * Before the policy layer, `app/Policies/` did not exist and several of these
 * endpoints had no check at all beyond `role:`. The point of this file is that
 * the matrix is now something you can read off a test run rather than
 * reconstruct by grepping four controllers.
 */
function clinicalFixture(): array
{
    $guarantor = userWithRole('user');
    $patient = Patient::factory()->create(['guarantor_id' => $guarantor->id]);

    $doctor = userWithRole('doctor');

    // The care relationship: an appointment between this doctor and this patient.
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'user_id' => $guarantor->id,
        'doctor_id' => $doctor->id,
    ]);

    $otherDoctor = userWithRole('doctor');
    $nurse = userWithRole('nurse');

    return compact('guarantor', 'patient', 'doctor', 'otherDoctor', 'nurse');
}

// ── A-3: destructive writes are no longer reachable by id alone ──────────────

test('a doctor cannot delete a diagnosis for a patient they have no relationship with', function () {
    ['patient' => $patient, 'doctor' => $doctor, 'otherDoctor' => $stranger] = clinicalFixture();

    $diagnosis = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'diagnosis' => 'Hypertension',
        'type' => 'chronic',
        'status' => 'active',
        'diagnosed_at' => now()->subMonth(),
    ]);

    // $stranger holds role:doctor and nothing else. This used to succeed.
    $this->actingAs($stranger)
        ->delete(route('doctor.patient-records.diagnoses.destroy', $diagnosis->id))
        ->assertForbidden();

    $this->assertDatabaseHas('patient_diagnoses', ['id' => $diagnosis->id, 'deleted_at' => null]);
});

test('the recording doctor can always correct their own diagnosis', function () {
    ['patient' => $patient, 'doctor' => $doctor] = clinicalFixture();

    $diagnosis = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'diagnosis' => 'Hypertension',
        'type' => 'chronic',
        'status' => 'active',
        'diagnosed_at' => now()->subMonth(),
    ]);

    $this->actingAs($doctor)
        ->patch(route('doctor.patient-records.diagnoses.update', $diagnosis->id), ['status' => 'resolved'])
        ->assertRedirect();

    expect($diagnosis->fresh()->status)->toBe('resolved');
});

test('a doctor with a care relationship may amend a colleague\'s diagnosis', function () {
    ['patient' => $patient, 'doctor' => $doctor, 'otherDoctor' => $colleague] = clinicalFixture();

    $diagnosis = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'diagnosis' => 'Hypertension',
        'type' => 'chronic',
        'status' => 'active',
        'diagnosed_at' => now()->subMonth(),
    ]);

    // Taking over the list: an unassigned appointment puts the colleague in
    // relationship, the same widening DoctorAppointmentController already makes.
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'doctor_id' => null,
    ]);

    $this->actingAs($colleague)
        ->patch(route('doctor.patient-records.diagnoses.update', $diagnosis->id), ['status' => 'resolved'])
        ->assertRedirect();

    expect($diagnosis->fresh()->status)->toBe('resolved');
});

test('a nurse cannot author a diagnosis', function () {
    ['patient' => $patient, 'nurse' => $nurse] = clinicalFixture();

    // There is no nurse diagnosis route at all — the capability split. Asserted
    // here so that adding one later fails this test rather than passing silently.
    $this->actingAs($nurse)
        ->post(route('doctor.patient-records.diagnoses.store', $patient), [
            'diagnosis' => 'Hypertension',
            'type' => 'primary',
            'status' => 'active',
            'diagnosed_at' => now()->subDay()->toDateString(),
        ])
        ->assertForbidden();
});

test('an unrelated allergy cannot be deleted by id alone', function () {
    ['patient' => $patient, 'doctor' => $doctor, 'otherDoctor' => $stranger] = clinicalFixture();

    $allergy = PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => $doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'severe',
    ]);

    $this->actingAs($stranger)
        ->delete(route('doctor.patient-records.allergies.destroy', $allergy->id))
        ->assertForbidden();

    $this->assertDatabaseHas('patient_allergies', ['id' => $allergy->id, 'deleted_at' => null]);
});

// ── A-2: document downloads ──────────────────────────────────────────────────

function documentFor(Patient $patient, int $uploaderId): PatientDocument
{
    Storage::disk('local')->put("patient-documents/{$patient->id}/scan.pdf", 'x');

    return PatientDocument::create([
        'patient_id' => $patient->id,
        'user_id' => $patient->guarantor_id,
        'uploaded_by' => $uploaderId,
        'title' => 'Scan',
        'type' => 'imaging',
        'file_path' => "patient-documents/{$patient->id}/scan.pdf",
        'file_name' => 'scan.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1,
    ]);
}

test('a guarantor cannot download another family\'s document', function () {
    Storage::fake('local');
    ['patient' => $patient, 'doctor' => $doctor] = clinicalFixture();
    $document = documentFor($patient, $doctor->id);

    $outsider = userWithRole('user');

    $this->actingAs($outsider)
        ->get(route('user.records.documents.download', $document->id))
        ->assertForbidden();
});

test('an orphaned document is unreachable even by clinical staff', function () {
    Storage::fake('local');
    ['patient' => $patient, 'doctor' => $doctor] = clinicalFixture();
    $document = documentFor($patient, $doctor->id);

    // A pre-migration row keyed only on the legacy user_id shape. Nobody can
    // attribute it to a patient, so nobody streams it.
    $document->update(['patient_id' => null]);

    $this->actingAs($doctor)
        ->get(route('doctor.patient-records.documents.download', $document->id))
        ->assertForbidden();
});

test('a nurse cannot delete a document another clinician attached', function () {
    Storage::fake('local');
    ['patient' => $patient, 'doctor' => $doctor, 'nurse' => $nurse] = clinicalFixture();
    $document = documentFor($patient, $doctor->id);

    $this->actingAs($nurse)
        ->delete(route('doctor.patient-records.documents.destroy', $document->id))
        ->assertForbidden();
});

// ── A-1: break-glass is permitted but recorded ───────────────────────────────

test('an in-relationship read is flagged as such', function () {
    ['patient' => $patient, 'doctor' => $doctor] = clinicalFixture();

    $this->actingAs($doctor)->get(route('doctor.patient-records.show', $patient))->assertOk();

    expect(RecordAccessLog::latest('id')->first()->had_care_relationship)->toBeTrue();
});

test('a read with no care relationship is allowed but recorded as break-glass', function () {
    ['patient' => $patient, 'otherDoctor' => $stranger] = clinicalFixture();

    // Deliberately NOT a 403 — see PatientPolicy and ND-2. A doctor covering a
    // colleague's list must not meet a permission error; the access is recorded
    // instead so it can be reviewed.
    $this->actingAs($stranger)->get(route('doctor.patient-records.show', $patient))->assertOk();

    $entry = RecordAccessLog::latest('id')->first();

    expect($entry->had_care_relationship)->toBeFalse()
        ->and($entry->actor_id)->toBe($stranger->id)
        ->and($entry->patient_id)->toBe($patient->id);
});

test('the care-relationship question is left null where it does not apply', function () {
    ['guarantor' => $guarantor, 'patient' => $patient, 'doctor' => $doctor] = clinicalFixture();

    // A guarantor reading their own record: not a clinical access at all.
    $this->actingAs($guarantor)->get(route('user.records.show', $patient))->assertOk();
    expect(RecordAccessLog::latest('id')->first()->had_care_relationship)->toBeNull();

    // A roster search: no patient in view to ask the question about.
    $this->actingAs($doctor)->get(route('doctor.patient-records'))->assertOk();
    expect(RecordAccessLog::latest('id')->first()->had_care_relationship)->toBeNull();
});

// ── The portal stays guarantor-only ──────────────────────────────────────────

test('the patient portal refuses a record the account does not guarantee', function () {
    ['patient' => $patient] = clinicalFixture();
    $outsider = userWithRole('user');

    $this->actingAs($outsider)->get(route('user.records.show', $patient))->assertForbidden();

    // A fully VALID payload on purpose. SavePatientRequest validates before the
    // controller runs its authorize(), so an incomplete body 302s on validation
    // and would make this test pass without the policy ever being consulted.
    $this->actingAs($outsider)
        ->patch(route('user.patients.update', $patient), [
            'first_name' => 'Hijacked',
            'last_name' => 'Record',
            'email' => 'x@example.com',
            'contact_number' => '09171234567',
            'gender' => 'female',
            'relationship' => 'spouse',
            'birthdate' => now()->subYears(30)->toDateString(),
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('patients', ['id' => $patient->id, 'first_name' => 'Hijacked']);
});

// ── The admin surface goes through the same matrix ───────────────────────────

test('an admin may edit demographics but is not admitted to the clinical record', function () {
    ['patient' => $patient] = clinicalFixture();
    $admin = userWithRole('admin');

    $this->actingAs($admin)->get(route('admin.patients'))->assertOk();

    $this->actingAs($admin)
        ->put(route('admin.patients.update', $patient), [
            'first_name' => 'Corrected',
            'last_name' => 'Name',
            'email' => 'corrected@example.com',
            'contact_number' => '09171234567',
        ])
        ->assertRedirect();

    expect($patient->fresh()->first_name)->toBe('Corrected');

    // An administrator is a records clerk here, not a clinician. There is no
    // admin route to the chart, and PatientPolicy::view() would refuse one.
    expect(app(PatientPolicy::class)->view($admin, $patient))->toBeFalse();
});

it('limits doctors to their own patients when the clinic turns on care-team-only access', function () {
    $doctor = userWithRole('doctor');
    $other = userWithRole('doctor');
    $patient = Patient::factory()->create();
    Appointment::factory()->forPatient($patient)->forDoctor($doctor)->create();

    config(['security.records_care_team_only' => false]);
    $this->actingAs($other)->get("/doctor/patient-records/{$patient->id}")->assertOk();

    config(['security.records_care_team_only' => true]);
    $this->actingAs($other)->get("/doctor/patient-records/{$patient->id}")->assertForbidden();
    $this->actingAs($doctor)->get("/doctor/patient-records/{$patient->id}")->assertOk();
});
