<?php

use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Models\Patient;

/**
 * The doctor's interpretation is the doctor's, and nobody else's.
 *
 * The review screen used to seed its "Doctor's Interpretation" box with the
 * nurse's bench notes, via `$result->interpretation ?? $result->notes` in
 * LabReviewController. Validating without editing — the default action — then
 * stored the nurse's words as the doctor's clinical reading, with the doctor's
 * name against them, and that text is what the patient is shown.
 *
 * Found in the September end-to-end run: patient-facing copy read
 * "Mild anaemia noted — recommend doctor review" under the heading
 * "Doctor's Interpretation", bylined "Reviewed by Dr. Maria Reyes".
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

    $this->result = LabTestResult::create([
        'patient_id' => $this->patient->id,
        'user_id' => $this->appointment->user_id,
        'appointment_id' => $this->appointment->id,
        'requested_by' => $this->doctor->id,
        'recorded_by' => $this->nurse->id,
        'test_name' => 'Complete Blood Count',
        'status' => 'recorded',
        'severity' => 'abnormal',
        'notes' => 'Specimen adequate, EDTA tube. Mild anaemia noted — recommend doctor review.',
        'requested_at' => now()->subHour(),
        'recorded_at' => now(),
    ]);
});

it('does not pre-fill the interpretation with the nurse notes', function () {
    $this->actingAs($this->doctor)
        ->get('/doctor/lab-reviews')
        ->assertOk()
        ->assertInertia(function ($page) {
            $row = collect($page->toArray()['props']['results'] ?? [])
                ->firstWhere('id', (string) $this->result->id)
                ?? collect($page->toArray()['props']['results'] ?? [])->first();

            expect($row)->not->toBeNull();

            // The field the doctor types into starts empty …
            expect($row['interpretation'])->toBe('');

            // … and the nurse's remarks travel separately, so the review screen
            // can still show them read-only beside it.
            expect($row['nurseNotes'])->toBe($this->result->notes);
        });
});

it('stores only what the doctor actually wrote', function () {
    $this->actingAs($this->doctor)
        ->post("/doctor/lab-reviews/{$this->result->id}/validate", [
            'interpretation' => 'Mild normocytic anaemia. Repeat CBC in 4 weeks.',
        ])
        ->assertRedirect();

    $this->result->refresh();

    expect($this->result->status)->toBe('reviewed')
        ->and($this->result->reviewed_by)->toBe($this->doctor->id)
        ->and($this->result->interpretation)
        ->toBe('Mild normocytic anaemia. Repeat CBC in 4 weeks.')
        // The regression itself: the two fields must not be the same text.
        ->and($this->result->interpretation)->not->toBe($this->result->notes)
        // And the nurse's note survives unedited.
        ->and($this->result->notes)->toContain('Specimen adequate');
});

it('refuses to validate with no interpretation at all', function () {
    // The empty box is the honest starting point, so the guard against signing
    // off an empty reading has to be the validation rule rather than a
    // pre-filled default.
    $this->actingAs($this->doctor)
        ->post("/doctor/lab-reviews/{$this->result->id}/validate", [
            'interpretation' => '',
        ])
        ->assertSessionHasErrors('interpretation');

    expect($this->result->refresh()->status)->toBe('recorded');
});
