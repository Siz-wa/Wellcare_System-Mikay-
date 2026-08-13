<?php

use App\Models\Appointment;
use App\Models\Patient;

/**
 * "My Patients" — the guarantor's own roster.
 *
 * PatientRecordController is read-only by design, because clinical writes belong
 * to staff. This controller narrows that rule rather than dropping it: a
 * guarantor may write demographics, contact details, relationship and coverage,
 * and nothing else. The tests that matter here are therefore the boundary ones —
 * that the narrowing did not also open someone else's record.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');
    $this->stranger = userWithRole('user');

    // Birthdate, not age: age is derived from it server-side, and the form shows
    // it read-only for the same reason.
    $this->payload = fn (array $overrides = []) => array_merge([
        'firstName' => 'Juan',
        'lastName' => 'Dela Cruz',
        'email' => 'juan.delacruz@example.com',
        'contactNumber' => '09171234567',
        'birthdate' => now()->subYears(8)->subMonth()->toDateString(),
        'gender' => 'male',
        'relationship' => 'child',
    ], $overrides);
});

// ── Create ────────────────────────────────────────────────────────────────────

it('lets a guarantor add a patient to their own account', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)())
        ->assertSessionHasNoErrors();

    $patient = Patient::sole();

    expect($patient->guarantor_id)->toBe($this->guarantor->id)
        ->and($patient->relationship_to_guarantor)->toBe('child')
        ->and($patient->full_name)->toBe('Juan Dela Cruz')
        // Auto-generated on create, so the clinic has an id to file under.
        ->and($patient->clinic_id)->toStartWith('WC-');
});

it('will not let the client choose which account a patient belongs to', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'guarantor_id' => $this->stranger->id,
        ]))
        ->assertSessionHasNoErrors();

    expect(Patient::sole()->guarantor_id)->toBe($this->guarantor->id);
});

it('requires a relationship', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['relationship' => '']))
        ->assertSessionHasErrors('relationship_to_guarantor');

    expect(Patient::count())->toBe(0);
});

it('rejects a contact number that is not a PH mobile', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['contactNumber' => '12345']))
        ->assertSessionHasErrors('contact_number');

    expect(Patient::count())->toBe(0);
});

it('requires the HMO member number when coverage is HMO', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'defaultCoverage' => 'hmo',
            'hmoProvider' => 'maxicare',
        ]))
        ->assertSessionHasErrors('hmo_id');

    expect(Patient::count())->toBe(0);
});

it('sends the guarantor straight into booking when the patient was added from the gate', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['bookAfterSave' => true]))
        ->assertRedirect('/book?patient='.Patient::sole()->id);
});

it('does not write bookAfterSave onto the record', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['bookAfterSave' => true]));

    expect(Patient::sole()->getAttributes())->not->toHaveKey('bookAfterSave');
});

// ── Update ────────────────────────────────────────────────────────────────────

it('lets a guarantor edit their own patient', function () {
    $patient = Patient::factory()->forGuarantor($this->guarantor)->create();

    $this->actingAs($this->guarantor)
        ->patch("/user/patients/{$patient->id}", ($this->payload)([
            'firstName' => 'Maria',
            'relationship' => 'spouse',
        ]))
        ->assertSessionHasNoErrors();

    expect($patient->fresh())
        ->first_name->toBe('Maria')
        ->relationship_to_guarantor->toBe('spouse');
});

it('refuses to edit a patient belonging to another account', function () {
    $patient = Patient::factory()->forGuarantor($this->stranger)->create([
        'first_name' => 'Untouched',
    ]);

    $this->actingAs($this->guarantor)
        ->patch("/user/patients/{$patient->id}", ($this->payload)())
        ->assertForbidden();

    expect($patient->fresh()->first_name)->toBe('Untouched');
});

// ── Archive ───────────────────────────────────────────────────────────────────

it('archives a patient with a soft delete, keeping the record', function () {
    $patient = Patient::factory()->forGuarantor($this->guarantor)->create();

    $this->actingAs($this->guarantor)
        ->delete("/user/patients/{$patient->id}")
        ->assertSessionHasNoErrors();

    expect(Patient::count())->toBe(0)
        ->and(Patient::withTrashed()->count())->toBe(1);
});

it('refuses to archive a patient belonging to another account', function () {
    $patient = Patient::factory()->forGuarantor($this->stranger)->create();

    $this->actingAs($this->guarantor)
        ->delete("/user/patients/{$patient->id}")
        ->assertForbidden();

    expect(Patient::count())->toBe(1);
});

it('refuses to archive a patient who still has an appointment coming up', function (string $status) {
    $patient = Patient::factory()->forGuarantor($this->guarantor)->create();
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => $status,
    ]);

    $this->actingAs($this->guarantor)
        ->delete("/user/patients/{$patient->id}")
        ->assertSessionHasErrors('patient');

    expect(Patient::count())->toBe(1);
})->with(['requested', 'pending_hmo_approval', 'confirmed', 'checked_in', 'in_progress']);

it('allows archiving once every appointment has reached a terminal state', function (string $status) {
    $patient = Patient::factory()->forGuarantor($this->guarantor)->create();
    Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => $status,
    ]);

    $this->actingAs($this->guarantor)
        ->delete("/user/patients/{$patient->id}")
        ->assertSessionHasNoErrors();

    expect(Patient::count())->toBe(0);
})->with(['completed', 'cancelled', 'no_show']);

// ── Index ─────────────────────────────────────────────────────────────────────

it('only lists the signed-in account’s own patients', function () {
    Patient::factory()->forGuarantor($this->guarantor)->count(2)->create();
    Patient::factory()->forGuarantor($this->stranger)->create();

    $this->actingAs($this->guarantor)
        ->get('/user/patients')
        ->assertInertia(fn ($page) => $page
            ->component('user/patients/patients')
            ->has('patients', 2)
        );
});

it('keeps a guest out entirely', function () {
    $this->get('/user/patients')->assertRedirect('/login');
    $this->post('/user/patients', ($this->payload)())->assertRedirect('/login');
});
