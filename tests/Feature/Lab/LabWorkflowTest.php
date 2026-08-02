<?php

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\LabTestResult;
use App\Models\Patient;

/**
 * The doctor → nurse → doctor lab workflow (DFD processes 5, 6 and the review
 * half of 7), plus the guards that keep it in order.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
    $this->nurse = userWithRole('nurse');

    $this->patient = Patient::factory()->create();
    $this->appointment = Appointment::factory()
        ->forPatient($this->patient)
        ->forDoctor($this->doctor)
        ->inProgress()
        ->create();
});

it('carries a lab test through request, record and review', function () {
    // ── 1. Doctor requests the test ──────────────────────────────────────────
    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$this->appointment->id}/lab-request", [
            'test_name' => 'Complete Blood Count',
        ])
        ->assertRedirect();

    $result = LabTestResult::firstOrFail();

    expect($result->status)->toBe('requested')
        ->and($result->requested_by)->toBe($this->doctor->id)
        ->and($result->patient_id)->toBe($this->patient->id)
        ->and($result->requested_at)->not->toBeNull()
        ->and($result->recorded_at)->toBeNull()
        ->and($result->reviewed_at)->toBeNull();

    // ── 2. Nurse records the results ─────────────────────────────────────────
    $this->actingAs($this->nurse)
        ->post("/nurse/lab-queue/{$result->id}/record", [
            'severity' => 'critical',
            'notes' => 'Specimen haemolysed slightly.',
            'parameters' => [
                ['name' => 'Hemoglobin', 'result' => '9.1', 'unit' => 'g/dL', 'ref_range' => '12.0–16.0', 'status' => 'abnormal'],
                ['name' => 'Platelets', 'result' => '215', 'unit' => '×10³/µL', 'ref_range' => '150–400', 'status' => 'normal'],
            ],
        ])
        ->assertRedirect();

    $result->refresh();

    expect($result->status)->toBe('recorded')
        ->and($result->severity)->toBe('critical')
        ->and($result->recorded_by)->toBe($this->nurse->id)
        ->and($result->recorded_at)->not->toBeNull()
        ->and($result->reviewed_at)->toBeNull()
        ->and($result->parameters)->toHaveCount(2);

    // Parameter order must survive the round trip — the doctor reads them as a
    // panel, and a shuffled panel is a misread panel.
    expect($result->parameters->pluck('name')->all())
        ->toBe(['Hemoglobin', 'Platelets']);

    // ── 3. Doctor validates ──────────────────────────────────────────────────
    $this->actingAs($this->doctor)
        ->post("/doctor/lab-reviews/{$result->id}/validate", [
            'interpretation' => 'Anaemia confirmed. Start iron supplementation.',
        ])
        ->assertRedirect();

    $result->refresh();

    expect($result->status)->toBe('reviewed')
        ->and($result->reviewed_by)->toBe($this->doctor->id)
        ->and($result->reviewed_at)->not->toBeNull()
        ->and($result->interpretation)->toBe('Anaemia confirmed. Start iron supplementation.');
});

it('notifies every nurse when a doctor requests a lab test', function () {
    // A second nurse, so this proves the notification fans out rather than
    // landing on whoever happens to be first.
    $secondNurse = userWithRole('nurse');

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$this->appointment->id}/lab-request", [
            'test_name' => 'Thyroid Panel',
        ])
        ->assertRedirect();

    $notified = AppointmentNotification::where('type', 'lab_requested')
        ->pluck('user_id')
        ->sort()
        ->values()
        ->all();

    expect($notified)->toBe(
        collect([$this->nurse->id, $secondNurse->id])->sort()->values()->all()
    );

    // The doctor who ordered it must not be told about their own request.
    expect(AppointmentNotification::where('user_id', $this->doctor->id)->exists())
        ->toBeFalse();
});

it('exposes ordered labs on the consultation payload', function () {
    LabTestResult::factory()
        ->forPatient($this->patient)
        ->recorded('critical')
        ->create([
            'requested_by' => $this->doctor->id,
            'appointment_id' => $this->appointment->id,
            'test_name' => 'ECG Report',
        ]);

    $this->actingAs($this->doctor)
        ->get('/doctor/consultations')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('doctor/consultations/consultations')
            ->has('consultations.0.labs', 1)
            ->where('consultations.0.labs.0.testName', 'ECG Report')
            ->where('consultations.0.labs.0.status', 'recorded')
            ->where('consultations.0.labs.0.severity', 'critical')
        );
});

it('rejects a lab request with no test name', function () {
    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$this->appointment->id}/lab-request", [
            'test_name' => '',
        ])
        ->assertSessionHasErrors('test_name');

    expect(LabTestResult::count())->toBe(0);
});

it('stops a doctor ordering labs on another doctors appointment', function () {
    $otherDoctor = userWithRole('doctor');

    $this->actingAs($otherDoctor)
        ->post("/doctor/consultations/{$this->appointment->id}/lab-request", [
            'test_name' => 'Urinalysis',
        ])
        ->assertForbidden();

    expect(LabTestResult::count())->toBe(0);
});

it('refuses to review a test the nurse has not recorded yet', function () {
    $result = LabTestResult::factory()
        ->forPatient($this->patient)
        ->create(['requested_by' => $this->doctor->id]);

    $this->actingAs($this->doctor)
        ->post("/doctor/lab-reviews/{$result->id}/validate", [
            'interpretation' => 'Looks fine to me.',
        ])
        ->assertSessionHasErrors('interpretation');

    expect($result->fresh()->status)->toBe('requested');
});

it('refuses to record results twice', function () {
    $result = LabTestResult::factory()
        ->forPatient($this->patient)
        ->recorded()
        ->create(['requested_by' => $this->doctor->id]);

    $this->actingAs($this->nurse)
        ->post("/nurse/lab-queue/{$result->id}/record", [
            'severity' => 'normal',
            'parameters' => [
                ['name' => 'Hemoglobin', 'result' => '13.2', 'unit' => 'g/dL', 'ref_range' => '12.0–16.0', 'status' => 'normal'],
            ],
        ])
        ->assertSessionHasErrors('severity');

    // The second attempt must not append a duplicate panel.
    expect($result->fresh()->parameters)->toHaveCount(0);
});

it('requires at least one parameter to record a result', function () {
    $result = LabTestResult::factory()
        ->forPatient($this->patient)
        ->create(['requested_by' => $this->doctor->id]);

    $this->actingAs($this->nurse)
        ->post("/nurse/lab-queue/{$result->id}/record", [
            'severity' => 'normal',
            'parameters' => [],
        ])
        ->assertSessionHasErrors('parameters');

    expect($result->fresh()->status)->toBe('requested');
});

it('shows the nurse only tests still awaiting results', function () {
    LabTestResult::factory()->forPatient($this->patient)->count(2)
        ->create(['requested_by' => $this->doctor->id]);
    LabTestResult::factory()->forPatient($this->patient)->recorded()
        ->create(['requested_by' => $this->doctor->id]);

    $this->actingAs($this->nurse)
        ->get('/nurse/lab-queue')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('nurse/lab-queue/lab-queue')
            ->has('pending', 2)
            ->has('recent', 1)
        );
});

it('shows the doctor only tests that already have results', function () {
    LabTestResult::factory()->forPatient($this->patient)
        ->create(['requested_by' => $this->doctor->id]);
    LabTestResult::factory()->forPatient($this->patient)->recorded('critical')
        ->create(['requested_by' => $this->doctor->id]);
    LabTestResult::factory()->forPatient($this->patient)->reviewed()
        ->create(['requested_by' => $this->doctor->id]);

    $this->actingAs($this->doctor)
        ->get('/doctor/lab-reviews')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('doctor/lab-reviews/lab-reviews')
            // The 'requested' one has no values yet, so it must not appear.
            ->has('results', 2)
        );
});
