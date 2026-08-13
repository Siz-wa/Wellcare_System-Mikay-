<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use Carbon\Carbon;

/**
 * The rules that make a patient record mean something.
 *
 *  - Age is birthdate arithmetic, never typed. Two editable fields for one fact
 *    eventually disagree, and a typed age is stale the day after it is typed.
 *  - A patient aged 18 or under cannot hold their own HMO or PhilHealth
 *    membership, so no coverage is asked of them.
 *  - "Other" as a relationship tells the clinic nothing on its own.
 *  - One account holder, one "Myself" record.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');

    $this->payload = fn (array $overrides = []) => array_merge([
        'firstName' => 'Miguel',
        'lastName' => 'Santos',
        'email' => 'miguel@example.com',
        'contactNumber' => '09171234567',
        'birthdate' => now()->subYears(30)->subMonth()->toDateString(),
        'gender' => 'male',
        'relationship' => 'child',
    ], $overrides);
});

// ── Age follows birthdate ─────────────────────────────────────────────────────

it('works the age out from the birthdate', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'birthdate' => now()->subYears(7)->subMonth()->toDateString(),
        ]))
        ->assertSessionHasNoErrors();

    expect(Patient::sole()->age)->toBe(7);
});

it('ignores an age the client sends alongside the birthdate', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'birthdate' => now()->subYears(7)->subMonth()->toDateString(),
            'age' => 44,
        ]))
        ->assertSessionHasNoErrors();

    expect(Patient::sole()->age)->toBe(7);
});

it('requires a birthdate', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['birthdate' => '']))
        ->assertSessionHasErrors('birthdate');

    expect(Patient::count())->toBe(0);
});

it('refuses a birthdate in the future', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'birthdate' => now()->addDay()->toDateString(),
        ]))
        ->assertSessionHasErrors('birthdate');
});

it('refuses a birth year that would make them over 120', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['birthdate' => '1850-01-01']))
        ->assertSessionHasErrors('birthdate');
});

it('reports the age as of today, not as of when the record was typed', function () {
    // The stored column is a cache. A patient entered at 17 five years ago is
    // 22 now, and the booking flow must not still treat them as a child.
    $patient = Patient::factory()->forGuarantor($this->guarantor)->create([
        'birthdate' => now()->subYears(22)->subMonth()->toDateString(),
        'age' => 17,
    ]);

    expect($patient->current_age)->toBe(22)
        ->and($patient->isMinor())->toBeFalse();
});

// ── Minors and coverage ───────────────────────────────────────────────────────

it('refuses to store a coverage other than cash for a minor', function (string $coverage) {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'birthdate' => now()->subYears(8)->toDateString(),
            'defaultCoverage' => $coverage,
            'hmoProvider' => 'maxicare',
            'hmoId' => 'MC-123456',
        ]))
        ->assertSessionHasErrors('default_coverage');

    expect(Patient::count())->toBe(0);
})->with(['hmo', 'philhealth', 'corporate']);

it('still allows cash for a minor', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'birthdate' => now()->subYears(8)->toDateString(),
            'defaultCoverage' => 'cash',
        ]))
        ->assertSessionHasNoErrors();

    expect(Patient::sole()->default_coverage)->toBe('cash');
});

it('treats exactly 18 as a minor and 19 as an adult', function () {
    $eighteen = Patient::factory()->forGuarantor($this->guarantor)->aged(18)->create();
    $nineteen = Patient::factory()->forGuarantor($this->guarantor)->aged(19)->create();

    expect($eighteen->isMinor())->toBeTrue()
        ->and($nineteen->isMinor())->toBeFalse();
});

it('marks a minor on the booking page so the coverage step can hide the chooser', function () {
    Patient::factory()->forGuarantor($this->guarantor)->aged(8)->create();

    $this->actingAs($this->guarantor)
        ->get('/book')
        ->assertInertia(fn ($page) => $page->where('patients.0.isMinor', true));
});

// ── Minors cannot be booked under their own coverage ─────────────────────────

it('refuses a non-cash booking for a minor', function () {
    $doctor = userWithRole('doctor');
    DoctorProfile::create([
        'user_id' => $doctor->id,
        'display_name' => 'Dr. Reyes',
        'specialty' => 'general',
        'is_active' => true,
    ]);
    AvailabilityBlock::create([
        'doctor_id' => $doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $child = Patient::factory()->forGuarantor($this->guarantor)->aged(8)->create();

    $this->actingAs($this->guarantor)
        ->post('/appointments', [
            'patientId' => $child->id,
            'service' => 'general',
            'appointmentDate' => Carbon::parse('next monday')->toDateString(),
            'appointmentTime' => '9:00 AM',
            'coverage' => 'hmo',
            'hmo' => 'maxicare',
            'hmoId' => 'MC-123456',
            'doctorId' => $doctor->id,
        ])
        ->assertSessionHasErrors('coverage');

    expect(Appointment::count())->toBe(0);
});

// ── "Other" needs saying ──────────────────────────────────────────────────────

it('requires a note when the relationship is "other"', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['relationship' => 'other']))
        ->assertSessionHasErrors('relationship_note');

    expect(Patient::count())->toBe(0);
});

it('stores the note and uses it as the label', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)([
            'relationship' => 'other',
            'relationshipNote' => 'Grandchild',
        ]))
        ->assertSessionHasNoErrors();

    expect(Patient::sole())
        ->relationship_to_guarantor->toBe('other')
        ->relationship_note->toBe('Grandchild')
        ->relationship_label->toBe('Grandchild');
});

it('does not ask for a note on the named relationships', function () {
    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['relationship' => 'child']))
        ->assertSessionHasNoErrors();

    expect(Patient::sole()->relationship_label)->toBe('Child');
});

// ── One "Myself" ──────────────────────────────────────────────────────────────

it('refuses a second record for the account holder', function () {
    Patient::factory()->forGuarantor($this->guarantor)->create([
        'relationship_to_guarantor' => 'self',
    ]);

    $this->actingAs($this->guarantor)
        ->post('/user/patients', ($this->payload)(['relationship' => 'self']))
        ->assertSessionHasErrors('relationship_to_guarantor');

    expect(Patient::count())->toBe(1);
});

it('lets the existing self record keep being itself when edited', function () {
    $self = Patient::factory()->forGuarantor($this->guarantor)->create([
        'relationship_to_guarantor' => 'self',
    ]);

    $this->actingAs($this->guarantor)
        ->patch("/user/patients/{$self->id}", ($this->payload)([
            'relationship' => 'self',
            'firstName' => 'Renamed',
        ]))
        ->assertSessionHasNoErrors();

    expect($self->fresh()->first_name)->toBe('Renamed');
});

it('refuses to archive the account holder’s own record', function () {
    // Soft-deleting it would only hide it: ensureSelfPatient() recreates or
    // re-adopts on the next visit to /book, so "archived" would come back.
    $self = Patient::factory()->forGuarantor($this->guarantor)->create([
        'relationship_to_guarantor' => 'self',
    ]);

    $this->actingAs($this->guarantor)
        ->delete("/user/patients/{$self->id}")
        ->assertSessionHasErrors('patient');

    expect(Patient::count())->toBe(1);
});

// ── The gate no longer offers a "Myself" quick-add ───────────────────────────

it('does not send a self-profile prefill to the booking page', function () {
    Patient::factory()->forGuarantor($this->guarantor)->create();

    $this->actingAs($this->guarantor)
        ->get('/book')
        ->assertInertia(fn ($page) => $page->missing('selfProfile'));
});
