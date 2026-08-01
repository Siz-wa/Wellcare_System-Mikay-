<?php

use App\Models\LabTestResult;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientDocument;
use App\Models\User;

/**
 * The patient-facing record and lab surfaces.
 *
 * Two boundaries matter here and both are tested directly:
 *
 *   1. Guarantor isolation — a signed-in account may read only the patients
 *      it guarantees. Route-model binding will happily resolve any {patient}
 *      in the URL, so the controller's abort_if is the only thing stopping
 *      one family reading another's medical record.
 *
 *   2. Review gating — a lab result is invisible to the patient until a
 *      doctor has validated it. `requested` and `recorded` rows carry raw,
 *      uninterpreted values.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');
    $this->doctor = userWithRole('doctor');

    // Two people receiving care under one booking account.
    $this->alice = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Alice', 'last_name' => 'Reyes',
    ]);
    $this->bob = Patient::factory()->forGuarantor($this->guarantor)->create([
        'first_name' => 'Bob', 'last_name' => 'Reyes',
    ]);

    // A completely separate family.
    $this->stranger = userWithRole('user');
    $this->strangersPatient = Patient::factory()->forGuarantor($this->stranger)->create();
});

// ── Guarantor isolation ───────────────────────────────────────────────────────

it('lists every patient under the signed-in account', function () {
    $this->actingAs($this->guarantor)
        ->get('/user/records')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/records/records')
            ->has('patients', 2)
        );
});

it('does not list patients belonging to another account', function () {
    $this->actingAs($this->guarantor)
        ->get('/user/records')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('patients', fn ($patients) => collect($patients)
                ->pluck('id')
                ->doesntContain($this->strangersPatient->id)
            )
        );
});

it('opens the record of a patient the account guarantees', function () {
    $this->actingAs($this->guarantor)
        ->get("/user/records/{$this->alice->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/records/record-detail')
            ->where('profile.firstName', 'Alice')
        );
});

it('forbids reading another guarantors patient by id', function () {
    $this->actingAs($this->guarantor)
        ->get("/user/records/{$this->strangersPatient->id}")
        ->assertForbidden();
});

it('forbids downloading another guarantors document', function () {
    $document = PatientDocument::create([
        'patient_id' => $this->strangersPatient->id,
        'user_id' => $this->stranger->id,
        'uploaded_by' => $this->doctor->id,
        'title' => 'Chest X-Ray',
        'type' => 'imaging',
        'file_path' => 'patient-documents/x/scan.pdf',
        'file_name' => 'scan.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1024,
    ]);

    $this->actingAs($this->guarantor)
        ->get("/user/records/documents/{$document->id}/download")
        ->assertForbidden();
});

it('shows allergies on the record it does own', function () {
    PatientAllergy::create([
        'patient_id' => $this->alice->id,
        'user_id' => $this->guarantor->id,
        'recorded_by' => $this->doctor->id,
        'allergen' => 'Penicillin',
        'severity' => 'severe',
        'reaction' => 'Anaphylaxis',
    ]);

    $this->actingAs($this->guarantor)
        ->get("/user/records/{$this->alice->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('allergies', 1)
            ->where('allergies.0.allergen', 'Penicillin')
            ->where('allergies.0.severity', 'severe')
        );
});

// ── Lab review gating ─────────────────────────────────────────────────────────

it('shows a lab result only once a doctor has reviewed it', function () {
    LabTestResult::factory()->forPatient($this->alice)->reviewed()
        ->create(['requested_by' => $this->doctor->id, 'test_name' => 'Lipid Profile']);

    $this->actingAs($this->guarantor)
        ->get('/user/lab-results')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/lab-results/lab-results')
            ->has('results', 1)
            ->where('results.0.testName', 'Lipid Profile')
        );
});

it('hides lab results still awaiting the nurse or the doctor', function () {
    // Nurse has not encoded it yet.
    LabTestResult::factory()->forPatient($this->alice)
        ->create(['requested_by' => $this->doctor->id]);

    // Nurse encoded it; doctor has not validated it.
    LabTestResult::factory()->forPatient($this->alice)->recorded('critical')
        ->create(['requested_by' => $this->doctor->id]);

    $this->actingAs($this->guarantor)
        ->get('/user/lab-results')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('results', 0));
});

it('does not leak lab results across guarantors', function () {
    LabTestResult::factory()->forPatient($this->strangersPatient)->reviewed()
        ->create(['requested_by' => $this->doctor->id, 'test_name' => 'Thyroid Panel']);

    $this->actingAs($this->guarantor)
        ->get('/user/lab-results')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('results', 0));
});

it('covers every patient under the account, not just the first', function () {
    LabTestResult::factory()->forPatient($this->alice)->reviewed()
        ->create(['requested_by' => $this->doctor->id]);
    LabTestResult::factory()->forPatient($this->bob)->reviewed()
        ->create(['requested_by' => $this->doctor->id]);

    $this->actingAs($this->guarantor)
        ->get('/user/lab-results')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('results', 2));
});

// ── Role gating ───────────────────────────────────────────────────────────────

it('keeps clinical staff out of the patient portal', function () {
    foreach (['doctor', 'nurse', 'hr'] as $role) {
        $staff = userWithRole($role);

        $this->actingAs($staff)->get('/user/records')->assertForbidden();
        $this->actingAs($staff)->get('/user/lab-results')->assertForbidden();
    }
});

it('sends a guest to login rather than the records page', function () {
    $this->get('/user/records')->assertRedirect('/login');
    $this->get('/user/lab-results')->assertRedirect('/login');
});

// ── Regression guard for the guarantor model ──────────────────────────────────

it('keeps two patients under one account from bleeding into each other', function () {
    PatientAllergy::create([
        'patient_id' => $this->alice->id,
        'user_id' => $this->guarantor->id,
        'recorded_by' => $this->doctor->id,
        'allergen' => 'Shellfish',
        'severity' => 'moderate',
    ]);

    // Bob shares the guarantor account but has no allergies of his own.
    $this->actingAs($this->guarantor)
        ->get("/user/records/{$this->bob->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('allergies', 0));
});

it('forbids an account that guarantees nobody from reading any record', function () {
    $lonely = User::factory()->role('user')->create();

    $this->actingAs($lonely)
        ->get("/user/records/{$this->alice->id}")
        ->assertForbidden();
});
