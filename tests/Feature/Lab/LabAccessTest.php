<?php

use App\Models\LabTestResult;
use App\Models\Patient;
use App\Models\User;

/**
 * Role gating and record isolation.
 *
 * The isolation test is the important one: a single User can be the guarantor
 * for several Patients, and every record-bleed bug in this codebase has come
 * from keying medical data on user_id instead of patient_id.
 */
it('keeps the nurse out of the doctor lab review page', function () {
    $this->actingAs(userWithRole('nurse'))
        ->get('/doctor/lab-reviews')
        ->assertForbidden();
});

it('keeps the doctor out of the nurse lab queue', function () {
    $this->actingAs(userWithRole('doctor'))
        ->get('/nurse/lab-queue')
        ->assertForbidden();
});

it('keeps patients out of both lab surfaces', function () {
    $patient = userWithRole('user');

    $this->actingAs($patient)->get('/nurse/lab-queue')->assertForbidden();
    $this->actingAs($patient)->get('/doctor/lab-reviews')->assertForbidden();
});

it('sends a guest to login rather than the lab queue', function () {
    $this->get('/nurse/lab-queue')->assertRedirect('/login');
});

it('lands a nurse on the lab queue after login', function () {
    $this->actingAs(userWithRole('nurse'))
        ->get('/dashboard')
        ->assertRedirect(route('nurse.lab-queue'));
});

it('does not bleed lab results between two patients sharing one account', function () {
    $doctor = userWithRole('doctor');

    // One booking account, two people receiving care under it.
    $guarantor = User::factory()->create();
    $alice = Patient::factory()->forGuarantor($guarantor)->create();
    $bob = Patient::factory()->forGuarantor($guarantor)->create();

    LabTestResult::factory()->forPatient($alice)->recorded()->count(2)
        ->create(['requested_by' => $doctor->id]);
    LabTestResult::factory()->forPatient($bob)->recorded()
        ->create(['requested_by' => $doctor->id]);

    expect($alice->labResults()->count())->toBe(2)
        ->and($bob->labResults()->count())->toBe(1);

    // And the rows really are keyed to the person, not the shared account.
    expect($alice->labResults->pluck('patient_id')->unique()->all())
        ->toBe([$alice->id]);
});
