<?php

use App\Models\Appointment;
use App\Models\Patient;

/**
 * A vital sign is a measurement, and the rules are what make it one.
 *
 * All six fields in the session editor were plain text boxes, and the rule
 * behind each was `string|max:10`. `abcdefghij` was therefore a storable heart
 * rate — written into the clinical record, with nothing downstream that would
 * ever catch it. Provenance was already taken seriously here (see
 * VitalsProvenanceTest, which proves the record says where a reading came
 * from); this file covers the reading itself.
 *
 * The bounds are survivable-extreme rather than normal. A fever of 41.5 °C and
 * a newborn's 2.4 kg both have to be recordable, so these reject typos and not
 * findings — the narrower ranges shown under each field in the form are hints
 * for exactly that reason. The columns stay strings, because blood pressure is
 * genuinely `120/80` and existing rows are not being rewritten; what changed is
 * what may be written to them from here.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');
    $this->record = Patient::factory()->create();

    $this->appointment = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->create(['status' => 'checked_in']);

    $this->save = fn (array $vitals) => test()
        ->actingAs($this->doctor)
        ->post("/doctor/consultations/{$this->appointment->id}/save", [
            'soap[subjective]' => 'Cough',
            'vitals[source]' => 'clinic_measured',
            ...$vitals,
        ]);
});

// ── Refused ──────────────────────────────────────────────────────────────────

it('refuses letters in a vital sign', function (string $field, string $typed) {
    ($this->save)(["vitals[{$field}]" => $typed])
        ->assertSessionHasErrors("vitals[{$field}]");

    expect($this->appointment->refresh()->consultationSession)->toBeNull();
})->with([
    'heart rate' => ['heartRate', 'abcdefghij'],
    'temperature' => ['temperature', 'hot'],
    'oxygen saturation' => ['oxygenSaturation', 'low'],
    'weight' => ['weight', 'heavy'],
    'height' => ['height', 'tall'],
    'blood pressure' => ['bloodPressure', 'high'],
]);

it('refuses a reading no body could produce', function (string $field, string $typed) {
    ($this->save)(["vitals[{$field}]" => $typed])
        ->assertSessionHasErrors("vitals[{$field}]");
})->with([
    'a heart rate of 900' => ['heartRate', '900'],
    'a temperature of 300' => ['temperature', '300'],
    'a saturation above 100%' => ['oxygenSaturation', '140'],
    'a weight of 900 kg' => ['weight', '900'],
    'a height of 900 cm' => ['height', '900'],
]);

it('refuses a blood pressure that is not systolic over diastolic', function (string $typed) {
    ($this->save)(['vitals[bloodPressure]' => $typed])
        ->assertSessionHasErrors('vitals[bloodPressure]');
})->with([
    'one number' => '120',
    'three parts' => '120/80/60',
    'a dash' => '120-80',
]);

it('names the field the doctor typed in, not the payload key', function () {
    ($this->save)(['vitals[heartRate]' => 'abcdefghij'])
        ->assertSessionHasErrors([
            'vitals[heartRate]' => 'The heart rate field must be an integer.',
        ]);
});

// ── Accepted ─────────────────────────────────────────────────────────────────

it('accepts a full set of ordinary readings', function () {
    ($this->save)([
        'vitals[bloodPressure]' => '120/80',
        'vitals[heartRate]' => '72',
        'vitals[temperature]' => '36.5',
        'vitals[oxygenSaturation]' => '98',
        'vitals[weight]' => '70',
        'vitals[height]' => '175',
    ])->assertSessionHasNoErrors();

    expect($this->appointment->refresh()->consultationSession)
        ->heart_rate->toBe('72')
        ->temperature->toBe('36.5')
        ->blood_pressure->toBe('120/80');
});

it('accepts a genuine finding at the edge of survivable', function (string $field, string $typed) {
    ($this->save)(["vitals[{$field}]" => $typed])
        ->assertSessionHasNoErrors();
})->with([
    'a high fever' => ['temperature', '41.5'],
    'severe hypothermia' => ['temperature', '28'],
    'a newborn at 2.4 kg' => ['weight', '2.4'],
    'a newborn at 48 cm' => ['height', '48'],
    'a tachycardia of 190' => ['heartRate', '190'],
    'a saturation of 82%' => ['oxygenSaturation', '82'],
]);

it('still accepts a session with no vitals at all', function () {
    ($this->save)([])->assertSessionHasNoErrors();
});
