<?php

use App\Models\Patient;
use App\Models\PatientAllergy;

/**
 * The security boundary around the nurse module.
 *
 * Two directions matter here, and only one of them is the usual one:
 *
 * 1. Every new nurse surface is closed to every other role.
 * 2. **The nurse is closed to the doctor's diagnosis routes.** That is the
 *    capability split Phase 5 exists to encode — a nurse may encode intake data
 *    and upload documents, but authoring a diagnosis is the attending doctor's
 *    clinical judgment. Hanging `role:nurse|doctor` on the doctor's record
 *    routes would have granted it silently, so the split gets asserted rather
 *    than trusted.
 */
beforeEach(function () {
    $this->nurse = userWithRole('nurse');
    $this->doctor = userWithRole('doctor');
    $this->admin = userWithRole('admin');
    $this->hr = userWithRole('hr');
    $this->patient = userWithRole('user');

    $this->record = Patient::factory()->create();
});

// ── Read surfaces ─────────────────────────────────────────────────────────────

it('opens every nurse page for a nurse', function (string $url, string $component) {
    $this->actingAs($this->nurse)
        ->get($url)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component($component));
})->with([
    ['/nurse/dashboard', 'nurse/dashboard/dashboard'],
    ['/nurse/appointments', 'nurse/appointments/appointments'],
    ['/nurse/patient-records', 'nurse/patient-records/patient-records'],
    ['/nurse/lab-queue', 'nurse/lab-queue/lab-queue'],
    ['/nurse/loa-monitoring', 'nurse/loa-monitoring/loa-monitoring'],
]);

it('opens a patient record detail for a nurse', function () {
    $this->actingAs($this->nurse)
        ->get("/nurse/patient-records/{$this->record->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('nurse/patient-records/patient-record-detail')
            ->has('allergies')
            ->has('diagnoses')
            ->has('documents')
        );
});

it('refuses every nurse page to every other role', function (string $actor, string $url) {
    $this->actingAs($this->{$actor})->get($url)->assertForbidden();
})->with(['doctor', 'admin', 'hr', 'patient'])
    ->with([
        '/nurse/dashboard',
        '/nurse/appointments',
        '/nurse/patient-records',
    ]);

it('requires a login for every nurse surface', function (string $url) {
    $this->get($url)->assertRedirect('/login');
})->with([
    '/nurse/dashboard',
    '/nurse/appointments',
    '/nurse/patient-records',
]);

// ── Write surfaces the nurse DOES have ────────────────────────────────────────

it('refuses nurse record writes to every other role', function (string $actor) {
    $patientId = $this->record->id;

    $this->actingAs($this->{$actor})
        ->patch("/nurse/patient-records/{$patientId}", [
            'first_name' => 'Mal',
            'last_name' => 'Actor',
            'contact_number' => '09170000000',
        ])
        ->assertForbidden();

    $this->actingAs($this->{$actor})
        ->post("/nurse/patient-records/{$patientId}/allergies", [
            'allergen' => 'Penicillin',
            'severity' => 'mild',
        ])
        ->assertForbidden();
})->with(['doctor', 'admin', 'hr', 'patient']);

// ── The capability split ──────────────────────────────────────────────────────

it('gives the nurse no diagnosis route of their own', function () {
    // Asserted against the router rather than an HTTP call: the claim is that
    // the route does not exist for nurses at all, not merely that one URL 403s.
    $nurseDiagnosisRoutes = collect(app('router')->getRoutes())
        ->filter(fn ($route) => str_contains($route->uri(), 'nurse/'))
        ->filter(fn ($route) => str_contains($route->uri(), 'diagnos'));

    expect($nurseDiagnosisRoutes)->toBeEmpty();
});

it('refuses the doctor diagnosis write routes to a nurse', function () {
    $patientId = $this->record->id;

    $this->actingAs($this->nurse)
        ->post("/doctor/patient-records/{$patientId}/diagnoses", [
            'diagnosis' => 'Hypertension',
            'type' => 'primary',
            'status' => 'active',
            'diagnosed_at' => now()->subDay()->toDateString(),
        ])
        ->assertForbidden();

    expect($this->record->diagnoses()->count())->toBe(0);
});

it('refuses the whole doctor record surface to a nurse', function (string $url) {
    $this->actingAs($this->nurse)->get($url)->assertForbidden();
})->with(fn () => [
    '/doctor/patient-records',
    '/doctor/lab-reviews',
    '/doctor/appointments',
]);

// ── Cross-role leakage on the shared read concern ─────────────────────────────

it('does not let a nurse delete an allergy through the doctor route', function () {
    $allergy = PatientAllergy::create([
        'patient_id' => $this->record->id,
        'user_id' => $this->record->guarantor_id,
        'recorded_by' => $this->doctor->id,
        'allergen' => 'Shellfish',
        'severity' => 'severe',
    ]);

    $this->actingAs($this->nurse)
        ->delete("/doctor/patient-records/allergies/{$allergy->id}")
        ->assertForbidden();

    expect(PatientAllergy::find($allergy->id))->not->toBeNull();
});
