<?php

use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Models\User;

/**
 * Task 3.1 — vitals as measurements.
 *
 * All six were varchars holding display text with units baked in ("70 bpm",
 * "36.7 C"), which made the most-used view in a clinical record impossible: a
 * trend across visits, a growth curve, a BMI, an out-of-range flag.
 *
 * The tests that matter most here are the ones asserting a NULL. MySQL casts
 * `'abc'` and `''` to 0, so the easy implementation silently records a heart
 * rate of zero — a clinically impossible value that looks exactly like a real
 * measurement. A missing reading must stay missing.
 */
function vitalsConsultation(User $doctor, array $vitals, array $appointmentAttributes = []): ConsultationSession
{
    $appointment = Appointment::factory()->create(array_merge([
        'doctor_id' => $doctor->id,
        'patient_id' => Patient::factory(),
        'user_id' => User::factory(),
        'status' => 'in_progress',
        'age' => 40,
    ], $appointmentAttributes));

    $payload = array_merge([
        'soap[subjective]' => 'Routine review.',
        'finalize' => '0',
    ], $vitals);

    test()->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", $payload);

    return $appointment->fresh()->consultationSession;
}

// ── The strings become numbers ───────────────────────────────────────────────

test('a saved consultation records vitals as measurements', function () {
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[bloodPressure]' => '119/83',
        'vitals[heartRate]' => '70',
        'vitals[temperature]' => '36.7',
        'vitals[oxygenSaturation]' => '96',
        'vitals[weight]' => '68',
        'vitals[height]' => '175',
    ]);

    expect($session->systolic)->toBe(119)
        ->and($session->diastolic)->toBe(83)
        ->and($session->heart_rate_bpm)->toBe(70)
        ->and($session->temperature_c)->toBe(36.7)
        ->and($session->oxygen_saturation_pct)->toBe(96)
        ->and($session->weight_kg)->toBe(68.0)
        ->and($session->height_cm)->toBe(175.0);
});

test('the display strings are still written alongside', function () {
    // Dual-write: nothing that reads the strings today has to change.
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[bloodPressure]' => '119/83',
        'vitals[heartRate]' => '70',
    ]);

    expect($session->blood_pressure)->toBe('119/83')
        ->and($session->heart_rate)->toBe('70');
});

// ── It does not invent readings ──────────────────────────────────────────────

test('an omitted vital stays null rather than becoming zero', function () {
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[bloodPressure]' => '119/83',
    ]);

    // The failure this guards: a heart rate of 0 is impossible, and unlike a
    // null it looks like a measurement somebody took.
    expect($session->heart_rate_bpm)->toBeNull()
        ->and($session->temperature_c)->toBeNull()
        ->and($session->weight_kg)->toBeNull();
});

test('a blood pressure that is not two numbers is rejected before it is stored', function () {
    // Discovered while writing this: the controller's `regex:/^\d{2,3}\/\d{2,3}$/`
    // rule refuses the whole save, so a lone "120" never reaches the parser at
    // all. That is stricter than parsing it to null and better — the doctor is
    // told, rather than silently losing the reading.
    $doctor = userWithRole('doctor');
    $appointment = Appointment::factory()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => Patient::factory(),
        'user_id' => User::factory(),
        'status' => 'in_progress',
    ]);

    $this->actingAs($doctor)
        ->post("/doctor/consultations/{$appointment->id}/save", [
            'soap[subjective]' => 'Review.',
            'vitals[bloodPressure]' => '120',
            'finalize' => '0',
        ])
        ->assertSessionHasErrors('vitals[bloodPressure]');
});

test('an empty blood pressure yields neither half', function () {
    // Both or neither — guessing which half a lone number represents would be
    // inventing a finding.
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[bloodPressure]' => '',
        'vitals[heartRate]' => '70',
    ]);

    expect($session->systolic)->toBeNull()
        ->and($session->diastolic)->toBeNull()
        // …and the rest of the save is unaffected.
        ->and($session->heart_rate_bpm)->toBe(70);
});

test('vitals recorded with their units still parse', function () {
    // The seeded rows are written this way, and a doctor may type it.
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[heartRate]' => '70',
        'vitals[temperature]' => '36.7',
    ]);

    expect($session->heart_rate_bpm)->toBe(70)
        ->and($session->temperature_c)->toBe(36.7);
});

test('a not-obtained consultation records no measurements', function () {
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[bloodPressure]' => '119/83',
        'vitals[heartRate]' => '70',
        'vitals[source]' => 'not_obtained',
    ]);

    // "Nothing was obtained" and a recorded blood pressure cannot both be true.
    expect($session->systolic)->toBeNull()
        ->and($session->heart_rate_bpm)->toBeNull();
});

// ── What the numbers make possible ───────────────────────────────────────────

test('BMI is computed from the measurements', function () {
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[weight]' => '68',
        'vitals[height]' => '175',
    ]);

    // 68 / 1.75^2 = 22.2
    expect($session->bmi())->toBe(22.2);
});

test('BMI is null when either measurement is missing', function () {
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[weight]' => '68',
    ]);

    expect($session->bmi())->toBeNull();
});

test('an out-of-range adult reading is flagged', function () {
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[bloodPressure]' => '180/95',
        'vitals[heartRate]' => '70',
    ]);

    $flags = collect($session->outOfRange())->pluck('field')->all();

    expect($flags)->toContain('systolic')
        ->and($flags)->toContain('diastolic')
        ->and($flags)->not->toContain('heart_rate_bpm');
});

test('a normal adult reading is flagged as nothing', function () {
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[bloodPressure]' => '119/83',
        'vitals[heartRate]' => '70',
        'vitals[temperature]' => '36.7',
        'vitals[oxygenSaturation]' => '98',
    ]);

    expect($session->outOfRange())->toBeEmpty();
});

test('a child is not measured against adult ranges', function () {
    // A healthy toddler's heart rate of 130 sits far outside every adult range.
    // Flagging it would train clinicians to dismiss the flag.
    $session = vitalsConsultation(userWithRole('doctor'), [
        'vitals[heartRate]' => '130',
    ], ['age' => 3]);

    expect($session->outOfRange())->toBeEmpty();
});

// ── The trend, which is the point of the whole task ──────────────────────────

test('a patient\'s readings come back in date order', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();

    foreach ([['3', '130'], ['2', '125'], ['1', '120']] as [$daysAgo, $systolic]) {
        $appointment = Appointment::factory()->create([
            'doctor_id' => $doctor->id,
            'patient_id' => $patient->id,
            'user_id' => User::factory(),
            'status' => 'in_progress',
            'appointment_date' => now()->subDays((int) $daysAgo)->toDateString(),
            'appointment_time' => '9:00 AM',
        ]);

        $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", [
            'soap[subjective]' => 'Review.',
            'vitals[bloodPressure]' => "{$systolic}/80",
            'finalize' => '0',
        ]);
    }

    $trend = ConsultationSession::vitalsTrendFor($patient->id);

    // Oldest first — a trend read backwards is a different clinical story.
    expect(collect($trend)->pluck('systolic')->all())->toBe([130, 125, 120]);
});

test('a consultation with no measurements is not a point on the trend', function () {
    $doctor = userWithRole('doctor');
    $patient = Patient::factory()->create();

    $appointment = Appointment::factory()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patient->id,
        'user_id' => User::factory(),
        'status' => 'in_progress',
    ]);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", [
        'soap[subjective]' => 'Phone advice only.',
        'vitals[source]' => 'not_obtained',
        'finalize' => '0',
    ]);

    expect(ConsultationSession::vitalsTrendFor($patient->id))->toBeEmpty();
});

test('one patient\'s readings never appear on another\'s trend', function () {
    // Keyed on the patient, not the account — a guarantor's own readings must
    // not show on their child's chart.
    $doctor = userWithRole('doctor');
    $guarantor = User::factory()->create();
    $child = Patient::factory()->create(['guarantor_id' => $guarantor->id]);
    $parent = Patient::factory()->create(['guarantor_id' => $guarantor->id]);

    // Distinct times: `appointments_active_slot_unique` refuses two live
    // bookings for one doctor at one moment, which is the double-booking guard
    // doing its job rather than a fixture inconvenience.
    foreach ([[$child, '110', '9:00 AM'], [$parent, '150', '10:00 AM']] as [$patient, $systolic, $time]) {
        $appointment = Appointment::factory()->create([
            'doctor_id' => $doctor->id,
            'patient_id' => $patient->id,
            'user_id' => $guarantor->id,
            'status' => 'in_progress',
            'appointment_time' => $time,
        ]);

        $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", [
            'soap[subjective]' => 'Review.',
            'vitals[bloodPressure]' => "{$systolic}/80",
            'finalize' => '0',
        ]);
    }

    expect(collect(ConsultationSession::vitalsTrendFor($child->id))->pluck('systolic')->all())
        ->toBe([110]);
});
