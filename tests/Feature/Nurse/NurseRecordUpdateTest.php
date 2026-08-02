<?php

use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDiagnosis;
use App\Models\PatientDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * What the nurse may actually write, and what the write is attributed to.
 *
 * The interesting assertions are the negative ones. `Patient::$fillable`
 * includes `default_coverage`, `hmo_provider` and `hmo_id`, so the demographics
 * form is only safe because UpdatePatientDemographicsRequest allow-lists its
 * fields — this file proves the allow-list holds rather than assuming it.
 */
beforeEach(function () {
    $this->nurse = userWithRole('nurse');
    $this->record = Patient::factory()->create([
        'first_name' => 'Original',
        'last_name' => 'Name',
        'contact_number' => '09170000001',
        'hmo_provider' => 'Maxicare',
        'hmo_id' => 'MX-SECRET-001',
        'default_coverage' => 'hmo',
    ]);
});

// ── Demographics ──────────────────────────────────────────────────────────────

it('lets a nurse update patient demographics', function () {
    $this->actingAs($this->nurse)
        ->patch("/nurse/patient-records/{$this->record->id}", [
            'first_name' => 'Updated',
            'last_name' => 'Person',
            'contact_number' => '09171234567',
            'address' => '12 Aguinaldo Highway, Dasmariñas',
            'gender' => 'female',
            'civil_status' => 'married',
        ])
        ->assertRedirect();

    $this->record->refresh();

    expect($this->record->first_name)->toBe('Updated')
        ->and($this->record->last_name)->toBe('Person')
        ->and($this->record->contact_number)->toBe('09171234567')
        ->and($this->record->civil_status)->toBe('married');
});

it('will not let a nurse rewrite insurance identity through the demographics form', function () {
    $this->actingAs($this->nurse)
        ->patch("/nurse/patient-records/{$this->record->id}", [
            'first_name' => 'Updated',
            'last_name' => 'Person',
            'contact_number' => '09171234567',
            // None of these are in the request's rules(), so validated() drops
            // them. A nurse must not be able to move a patient onto another
            // policy, or read/rewrite an HMO member number.
            'hmo_id' => 'MX-ATTACKER-999',
            'hmo_provider' => 'Intellicare',
            'default_coverage' => 'cash',
        ])
        ->assertRedirect();

    $this->record->refresh();

    expect($this->record->hmo_id)->toBe('MX-SECRET-001')
        ->and($this->record->hmo_provider)->toBe('Maxicare')
        ->and($this->record->default_coverage)->toBe('hmo');
});

it('rejects a demographics update with no contact number', function () {
    // Contact number is part of how Patient::findOrCreateFromBooking() matches
    // people, so blanking it would start splitting one person into two records.
    $this->actingAs($this->nurse)
        ->patch("/nurse/patient-records/{$this->record->id}", [
            'first_name' => 'Updated',
            'last_name' => 'Person',
            'contact_number' => '',
        ])
        ->assertSessionHasErrors('contact_number');

    expect($this->record->fresh()->first_name)->toBe('Original');
});

it('rejects a gender outside the patients enum', function () {
    // Regression: the first version of UpdatePatientDemographicsRequest reused
    // the user-profile rule Rule::in(['M','F']). `patients.gender` is
    // enum('male','female','other'), so 'F' passed validation and MySQL then
    // truncated the column to '' — a silent write of bad data.
    $this->actingAs($this->nurse)
        ->patch("/nurse/patient-records/{$this->record->id}", [
            'first_name' => 'Updated',
            'last_name' => 'Person',
            'contact_number' => '09171234567',
            'gender' => 'F',
        ])
        ->assertSessionHasErrors('gender');

    expect($this->record->fresh()->first_name)->toBe('Original');
});

it('rejects a future birthdate', function () {
    $this->actingAs($this->nurse)
        ->patch("/nurse/patient-records/{$this->record->id}", [
            'first_name' => 'Updated',
            'last_name' => 'Person',
            'contact_number' => '09171234567',
            'birthdate' => now()->addYear()->toDateString(),
        ])
        ->assertSessionHasErrors('birthdate');
});

// ── Allergies ─────────────────────────────────────────────────────────────────

it('lets a nurse record an allergy attributed to themselves', function () {
    $this->actingAs($this->nurse)
        ->post("/nurse/patient-records/{$this->record->id}/allergies", [
            'allergen' => 'Penicillin',
            'severity' => 'severe',
            'reaction' => 'Anaphylaxis',
        ])
        ->assertRedirect();

    $allergy = PatientAllergy::where('patient_id', $this->record->id)->first();

    expect($allergy)->not->toBeNull()
        ->and($allergy->allergen)->toBe('Penicillin')
        ->and($allergy->severity)->toBe('severe')
        // The chain of custody matters as much as the value.
        ->and($allergy->recorded_by)->toBe($this->nurse->id);
});

it('rejects an allergy with an invalid severity', function () {
    $this->actingAs($this->nurse)
        ->post("/nurse/patient-records/{$this->record->id}/allergies", [
            'allergen' => 'Penicillin',
            'severity' => 'catastrophic',
        ])
        ->assertSessionHasErrors('severity');

    expect(PatientAllergy::count())->toBe(0);
});

it('lets a nurse remove an allergy', function () {
    $allergy = PatientAllergy::create([
        'patient_id' => $this->record->id,
        'user_id' => $this->record->guarantor_id,
        'recorded_by' => $this->nurse->id,
        'allergen' => 'Shellfish',
        'severity' => 'mild',
    ]);

    $this->actingAs($this->nurse)
        ->delete("/nurse/patient-records/allergies/{$allergy->id}")
        ->assertRedirect();

    expect(PatientAllergy::find($allergy->id))->toBeNull();
});

// ── Diagnoses stay closed ─────────────────────────────────────────────────────

it('shows diagnoses to a nurse without offering any way to change them', function () {
    PatientDiagnosis::create([
        'patient_id' => $this->record->id,
        'user_id' => $this->record->guarantor_id,
        // Authored by a doctor — the point of the test is that the nurse can
        // read it and has no route to change it.
        'recorded_by' => userWithRole('doctor')->id,
        'diagnosis' => 'Hypertension',
        'type' => 'primary',
        'status' => 'active',
        'diagnosed_at' => now()->subMonth(),
    ]);

    $this->actingAs($this->nurse)
        ->get("/nurse/patient-records/{$this->record->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('diagnoses', 1)
            ->where('diagnoses.0.diagnosis', 'Hypertension')
        );
});

// ── Documents ─────────────────────────────────────────────────────────────────

it('lets a nurse upload a document attributed to themselves', function () {
    Storage::fake('local');

    $this->actingAs($this->nurse)
        ->post("/nurse/patient-records/{$this->record->id}/documents", [
            'title' => 'CBC Result',
            'type' => 'lab',
            'file' => UploadedFile::fake()->create('cbc.pdf', 120, 'application/pdf'),
        ])
        ->assertRedirect();

    $document = PatientDocument::where('patient_id', $this->record->id)->first();

    expect($document)->not->toBeNull()
        ->and($document->title)->toBe('CBC Result')
        ->and($document->uploaded_by)->toBe($this->nurse->id);

    Storage::disk('local')->assertExists($document->file_path);
});

it('rejects a document upload with a disallowed file type', function () {
    Storage::fake('local');

    $this->actingAs($this->nurse)
        ->post("/nurse/patient-records/{$this->record->id}/documents", [
            'title' => 'Payload',
            'type' => 'other',
            'file' => UploadedFile::fake()->create('shell.php', 10, 'application/x-php'),
        ])
        ->assertSessionHasErrors('file');

    expect(PatientDocument::count())->toBe(0);
});
