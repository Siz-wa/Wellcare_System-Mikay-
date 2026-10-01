<?php

use App\Models\Appointment;
use App\Models\Patient;

/**
 * Nothing in the app renders invented clinical numbers.
 *
 * `/doctor/dashboard` was `fn () => inertia('doctor/dashboard')` — a route with
 * no controller, so every figure on the page came from hardcoded arrays in
 * `dashboard-data.ts`. It greeted whoever opened it as "Dr. Douglas", reported
 * "TOTAL PATIENTS 70" against a real roster of 13, and carried made-up trend
 * deltas. Nothing linked to it, but the route was live and a bookmark landed a
 * clinician on it.
 */
it('redirects the doctor dashboard to the real appointments page', function () {
    $doctor = userWithRole('doctor');

    $this->actingAs($doctor)
        ->get('/doctor/dashboard')
        ->assertRedirect('/doctor/appointments');
});

it('no longer ships the mock dashboard page or its fabricated data', function () {
    expect(file_exists(sourcePath('resources/js/pages/doctor/dashboard.tsx')))->toBeFalse();

    // Comments stripped: the note explaining WHY the mock was removed names
    // "Dr. Douglas", and that explanation is exactly what a future reader needs.
    // The guard is about code, not prose.
    $data = withoutComments(
        file_get_contents(sourcePath('resources/js/pages/doctor/dashboard-data.ts'))
    );

    // The greeting that outed it, and the arrays behind the figures.
    expect($data)->not->toContain('Dr. Douglas');

    foreach (['statCards', 'todayAppointments', 'pendingLabReviews', 'patientActivityData'] as $fabricated) {
        expect($data)->not->toContain("export const {$fabricated}");
    }

    // navGroups stays — the sidebar reads it.
    expect($data)->toContain('export const navGroups');
});

/**
 * "Last visit" means a visit, not the day the record was created.
 *
 * mapPatientSummary() fell back to `created_at` when a patient had no completed
 * appointment, so both the doctor's and the nurse's record lists told staff a
 * patient with zero visits had been seen.
 */
it('reports no last visit for a patient who has never completed one', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();

    $page = $this->actingAs($doctor)->get('/doctor/patient-records')->assertOk();

    $row = collect($page->viewData('page')['props']['patients']['data'] ?? [])
        ->firstWhere('id', $patient->id);

    expect($row)->not->toBeNull()
        ->and($row['appointmentCount'])->toBe(0)
        ->and($row['lastUpdate'])->toBeNull();
});

it('reports the completed visit date once there is one', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();

    Appointment::factory()
        ->forPatient($patient)
        ->forDoctor($doctor)
        ->create([
            'status' => 'completed',
            'appointment_date' => now()->subDays(3)->toDateString(),
        ]);

    $page = $this->actingAs($doctor)->get('/doctor/patient-records')->assertOk();

    $row = collect($page->viewData('page')['props']['patients']['data'] ?? [])
        ->firstWhere('id', $patient->id);

    expect($row['lastUpdate'])->toBe(now()->subDays(3)->format('d M Y'));
});
