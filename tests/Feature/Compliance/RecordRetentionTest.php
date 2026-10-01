<?php

use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use Illuminate\Support\Facades\DB;

/**
 * SC-1 — the retention floor under every deletion path.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.6 (RET-1, RET-2, RET-3).
 *
 * These tests exist because the failure they cover was silent, self-service and
 * irreversible: `DELETE /settings/profile` hard-deleted the `users` row, and six
 * ON DELETE CASCADE foreign keys destroyed the account holder's allergies,
 * diagnoses and documents on the way out.
 */

/** A guarantor with one patient carrying a full clinical record. */
function guarantorWithClinicalRecord(): array
{
    $user = userWithRole('user');
    $user->profile()->create([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'contact_number' => '09171234567',
    ]);

    $patient = Patient::factory()->create([
        'guarantor_id' => $user->id,
        'first_name' => 'Maria',
        'last_name' => 'Santos',
    ]);

    $recorder = userWithRole('doctor');

    $allergy = PatientAllergy::create([
        'patient_id' => $patient->id,
        'user_id' => $user->id,
        'recorded_by' => $recorder->id,
        'allergen' => 'Penicillin',
        'severity' => 'severe',
    ]);

    $diagnosis = PatientDiagnosis::create([
        'patient_id' => $patient->id,
        'user_id' => $user->id,
        'recorded_by' => $recorder->id,
        'diagnosis' => 'Hypertension',
        'type' => 'chronic',
        'status' => 'active',
        'diagnosed_at' => now()->subYear(),
    ]);

    $document = PatientDocument::create([
        'patient_id' => $patient->id,
        'user_id' => $user->id,
        'uploaded_by' => $recorder->id,
        'title' => 'CBC Results',
        'type' => 'lab',
        'file_path' => 'patient-documents/1/cbc.pdf',
        'file_name' => 'cbc.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1024,
    ]);

    return compact('user', 'patient', 'recorder', 'allergy', 'diagnosis', 'document');
}

// ── RET-1: closing an account must not destroy the record ────────────────────

test('closing an account retires the login but keeps the clinical record', function () {
    ['user' => $user, 'patient' => $patient, 'allergy' => $allergy,
        'diagnosis' => $diagnosis, 'document' => $document] = guarantorWithClinicalRecord();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect('/');

    // The record survives in full. This is the whole point of the change: every
    // one of these four assertions failed before it.
    $this->assertDatabaseHas('patients', ['id' => $patient->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('patient_allergies', ['id' => $allergy->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('patient_diagnoses', ['id' => $diagnosis->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('patient_documents', ['id' => $document->id, 'deleted_at' => null]);

    // The account itself is retired, not removed.
    $this->assertSoftDeleted('users', ['id' => $user->id]);
});

test('closing an account destroys its credentials and frees the email address', function () {
    ['user' => $user] = guarantorWithClinicalRecord();

    $originalEmail = $user->email;
    $originalHash = $user->password;

    $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password']);

    $row = DB::table('users')->where('id', $user->id)->first();

    expect($row->email)->toBe("closed-account-{$user->id}@wellcare.invalid")
        ->and($row->email)->not->toBe($originalEmail)
        ->and($row->password)->not->toBe($originalHash)
        ->and($row->remember_token)->toBeNull()
        ->and($row->two_factor_secret)->toBeNull()
        ->and((bool) $row->is_active)->toBeFalse();

    // The address is genuinely released — a unique index ignores `deleted_at`,
    // so without the rewrite the person could never register again.
    expect(DB::table('users')->where('email', $originalEmail)->exists())->toBeFalse();
});

test('a closed account cannot sign back in', function () {
    ['user' => $user] = guarantorWithClinicalRecord();
    $email = $user->email;

    $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password']);

    $this->post('/login', ['email' => $email, 'password' => 'password']);

    $this->assertGuest();
});

test('closing an account drops sessions on every other device', function () {
    ['user' => $user] = guarantorWithClinicalRecord();

    DB::table('sessions')->insert([
        'id' => 'another-device-session',
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Other device',
        'payload' => base64_encode(serialize([])),
        'last_activity' => now()->timestamp,
    ]);

    $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password']);

    expect(DB::table('sessions')->where('user_id', $user->id)->exists())->toBeFalse();
});

test('staff accounts still cannot be self-closed', function () {
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasErrors('password');

    $this->assertDatabaseHas('users', ['id' => $doctor->id, 'deleted_at' => null]);
});

// ── RET-1 / RET-2: the schema itself must not cascade into the record ────────

test('force-deleting a guarantor detaches the record instead of destroying it', function () {
    ['user' => $user, 'allergy' => $allergy,
        'diagnosis' => $diagnosis, 'document' => $document] = guarantorWithClinicalRecord();

    // The hard delete the old endpoint performed, done deliberately. Even this
    // must not take the clinical record with it.
    $user->forceDelete();

    $this->assertDatabaseHas('patient_allergies', ['id' => $allergy->id, 'user_id' => null]);
    $this->assertDatabaseHas('patient_diagnoses', ['id' => $diagnosis->id, 'user_id' => null]);
    $this->assertDatabaseHas('patient_documents', ['id' => $document->id, 'user_id' => null]);
});

test('force-deleting a clinician does not delete what they recorded', function () {
    ['recorder' => $recorder, 'allergy' => $allergy, 'diagnosis' => $diagnosis] = guarantorWithClinicalRecord();

    // RET-2: `recorded_by` used to cascade, so removing one doctor's account
    // would have erased every allergy and diagnosis they ever wrote, for every
    // patient in the clinic.
    $recorder->forceDelete();

    $this->assertDatabaseHas('patient_allergies', ['id' => $allergy->id, 'recorded_by' => null]);
    $this->assertDatabaseHas('patient_diagnoses', ['id' => $diagnosis->id, 'recorded_by' => null]);
});

// ── RET-3: staff deletions are reversible ────────────────────────────────────

test('a doctor removing a diagnosis soft-deletes it', function () {
    ['patient' => $patient, 'recorder' => $doctor, 'diagnosis' => $diagnosis] = guarantorWithClinicalRecord();

    $this->actingAs($doctor)
        ->delete(route('doctor.patient-records.diagnoses.destroy', $diagnosis->id));

    $this->assertSoftDeleted('patient_diagnoses', ['id' => $diagnosis->id]);
    expect(PatientDiagnosis::withTrashed()->find($diagnosis->id))->not->toBeNull();
    expect($patient->diagnoses()->count())->toBe(0);
});

test('a doctor removing an allergy soft-deletes it', function () {
    ['recorder' => $doctor, 'allergy' => $allergy] = guarantorWithClinicalRecord();

    $this->actingAs($doctor)
        ->delete(route('doctor.patient-records.allergies.destroy', $allergy->id));

    $this->assertSoftDeleted('patient_allergies', ['id' => $allergy->id]);
});

test('a doctor removing a document soft-deletes the row', function () {
    ['recorder' => $doctor, 'document' => $document] = guarantorWithClinicalRecord();

    $this->actingAs($doctor)
        ->delete(route('doctor.patient-records.documents.destroy', $document->id));

    $this->assertSoftDeleted('patient_documents', ['id' => $document->id]);
});
