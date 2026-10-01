<?php

use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Services\ConsultationSessionService;

/**
 * Where a set of vitals came from, and why the record has to say.
 *
 * The video room shows the doctor the same six fields as the in-person session
 * editor — BP, heart rate, temperature, SpO2, weight, height — and a doctor on
 * a video call can measure exactly none of them. Every number recorded during a
 * virtual visit is one the patient read off their own cuff, thermometer, scale
 * or oximeter.
 *
 * That is ordinary telehealth practice, on one condition: the chart must
 * identify a patient-supplied reading as patient-supplied. Without it a
 * `120/80` written during a video call is indistinguishable from one a nurse
 * took with a clinic cuff, and the record silently asserts a measurement that
 * never happened.
 *
 * `vitals_source` is that condition. These tests cover the three rules that
 * make it trustworthy — an explicit choice wins, silence preserves, and
 * "nothing was obtained" cannot coexist with six numbers — plus the historical
 * rows whose provenance is genuinely unknown and must not be guessed at.
 */
beforeEach(function () {
    $this->service = app(ConsultationSessionService::class);

    $this->doctor = userWithRole('doctor');
    $this->guarantor = userWithRole('user');
    $this->record = Patient::factory()->forGuarantor($this->guarantor)->create();

    $this->soap = ['subjective' => 'Cough', 'objective' => '', 'assessment' => 'URI', 'plan' => 'Rest'];
    $this->vitals = ['bloodPressure' => '120/80', 'heartRate' => '72'];

    $this->virtualVisit = fn () => Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => 'checked_in']);

    $this->clinicVisit = fn () => Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->create(['status' => 'checked_in']);
});

// ── The default, derived from how the patient was seen ────────────────────────

it('records a virtual visit\'s vitals as patient-reported when the doctor picks nothing', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->openVirtualRoom($appointment, $this->doctor);

    $session = $this->service->saveNotes($appointment, $this->doctor, $this->soap, $this->vitals);

    // The doctor was on a video call. Nobody was holding a cuff.
    expect($session->vitals_source)->toBe('patient_reported')
        ->and($session->vitalsSourceLabel())->toBe('Patient-reported')
        ->and($session->blood_pressure)->toBe('120/80');
});

it('records an in-person visit\'s vitals as clinic-measured when the doctor picks nothing', function () {
    $appointment = ($this->clinicVisit)();

    $session = $this->service->saveNotes($appointment, $this->doctor, $this->soap, $this->vitals);

    expect($session->vitals_source)->toBe('clinic_measured');
});

// ── Rule 1: an explicit choice wins ───────────────────────────────────────────

it('stores the source the doctor chose', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->openVirtualRoom($appointment, $this->doctor);

    $session = $this->service->saveNotes(
        $appointment,
        $this->doctor,
        $this->soap,
        $this->vitals + ['source' => 'home_device'],
    );

    expect($session->vitals_source)->toBe('home_device');
});

it('ignores a source that is not in the vocabulary rather than storing it', function () {
    $appointment = ($this->clinicVisit)();

    $session = $this->service->saveNotes(
        $appointment,
        $this->doctor,
        $this->soap,
        $this->vitals + ['source' => 'guessed'],
    );

    // Falls back rather than throwing: the request validation already refuses
    // this, and a service that threw would take a whole clinical note down over
    // a provenance label.
    expect($session->vitals_source)->toBe('clinic_measured');
});

// ── Rule 2: silence preserves ─────────────────────────────────────────────────

it('does not relabel vitals when a later save omits the source', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->openVirtualRoom($appointment, $this->doctor);

    // In the room: the patient read out their own blood pressure.
    $this->service->saveNotes(
        $appointment,
        $this->doctor,
        $this->soap,
        $this->vitals + ['source' => 'patient_reported'],
    );

    // Later, from the session-editor modal, which posts no source at all.
    $session = $this->service->saveNotes($appointment, $this->doctor, $this->soap, $this->vitals);

    // The regression this guards: falling through to the mode default here
    // would relabel a patient's own reading as a clinic measurement, which is
    // the exact false claim the column exists to prevent.
    expect($session->vitals_source)->toBe('patient_reported');
});

// ── Rule 3: "not obtained" cannot coexist with readings ───────────────────────

it('clears the measurements when the doctor marks them not obtained', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->openVirtualRoom($appointment, $this->doctor);

    $session = $this->service->saveNotes(
        $appointment,
        $this->doctor,
        $this->soap,
        [
            'bloodPressure' => '120/80',
            'heartRate' => '72',
            'temperature' => '36.5',
            'oxygenSaturation' => '98',
            'weight' => '70',
            'height' => '175',
            'source' => 'not_obtained',
        ],
    );

    expect($session->vitals_source)->toBe('not_obtained')
        ->and($session->blood_pressure)->toBeNull()
        ->and($session->heart_rate)->toBeNull()
        ->and($session->temperature)->toBeNull()
        ->and($session->oxygen_saturation)->toBeNull()
        ->and($session->weight)->toBeNull()
        ->and($session->height)->toBeNull()
        // The SOAP note is untouched — only the vitals claim was contradictory.
        ->and($session->assessment)->toBe('URI');
});

// ── Rows that predate the column ──────────────────────────────────────────────

it('reports no label for a session whose provenance was never recorded', function () {
    $session = new ConsultationSession(['mode' => 'virtual']);

    // Deliberately not backfilled by the migration: these rows include virtual
    // visits, and defaulting them to clinic_measured would write a clinical
    // claim nothing supports.
    expect($session->vitals_source)->toBeNull()
        ->and($session->vitalsSourceLabel())->toBeNull();
});

// ── The HTTP surface ──────────────────────────────────────────────────────────

it('refuses a save whose source is outside the vocabulary', function () {
    $appointment = ($this->clinicVisit)();

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", [
            'vitals[bloodPressure]' => '120/80',
            'vitals[source]' => 'made_up',
            'finalize' => '0',
        ])
        ->assertSessionHasErrors('vitals[source]');
});

it('accepts a source the doctor picked in the room', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->openVirtualRoom($appointment, $this->doctor);

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", [
            'vitals[bloodPressure]' => '118/76',
            'vitals[source]' => 'home_device',
            'finalize' => '0',
        ])
        ->assertSessionHasNoErrors();

    expect($appointment->fresh()->consultationSession->vitals_source)->toBe('home_device');
});

it('sends the room the current source and the vocabulary to choose from', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->openVirtualRoom($appointment, $this->doctor);

    $this->actingAs($this->doctor)
        ->get("/doctor/consultations/{$appointment->id}/room")
        ->assertInertia(fn ($page) => $page
            // Never blank on this page: the room only opens for a virtual
            // session, whose honest default is patient-reported.
            ->where('vitals.source', 'patient_reported')
            ->where('vitalsSources.patient_reported', 'Patient-reported')
            ->where('vitalsSources.not_obtained', 'Not obtained')
        );
});
