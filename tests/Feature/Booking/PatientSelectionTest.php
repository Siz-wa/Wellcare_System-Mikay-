<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\PatientProfile;
use App\Services\BookingService;
use Carbon\Carbon;

/**
 * Booking names a patient instead of retyping one.
 *
 * The account is a guarantor account — a mother books for herself and for her
 * child — so "who is this appointment for" is settled before the wizard starts,
 * and the identity fields come off that record. Two properties are worth
 * pinning down, and both are about trust rather than convenience:
 *
 *  1. The client cannot influence whose name lands on the appointment.
 *  2. The client cannot reach a record that is not on their own account.
 */
beforeEach(function () {
    $this->guarantor = userWithRole('user');
    $this->stranger = userWithRole('user');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Maria Reyes',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    $this->date = Carbon::parse('next monday');

    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $this->child = Patient::factory()->forGuarantor($this->guarantor)->aged(8)->create([
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'email' => 'juan@example.com',
        'contact_number' => '09171234567',
        'gender' => 'male',
        'relationship_to_guarantor' => 'child',
    ]);

    $this->payload = fn (array $overrides = []) => array_merge([
        'patientId' => $this->child->id,
        'service' => 'general',
        'appointmentDate' => $this->date->toDateString(),
        'appointmentTime' => '9:00 AM',
        'coverage' => 'cash',
        'doctorId' => $this->doctor->id,
    ], $overrides);
});

// ── Identity comes from the record ────────────────────────────────────────────

it('copies the patient’s identity off their record', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)())
        ->assertSessionHasNoErrors();

    expect(Appointment::sole())
        ->patient_id->toBe($this->child->id)
        ->first_name->toBe('Juan')
        ->last_name->toBe('Dela Cruz')
        ->email->toBe('juan@example.com')
        ->contact_number->toBe('09171234567')
        ->age->toBe(8)
        ->gender->toBe('male');
});

it('ignores identity fields the client sends', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'firstName' => 'Somebody',
            'lastName' => 'Else',
            'email' => 'attacker@example.com',
            'contactNumber' => '09990000000',
            'age' => 44,
            'gender' => 'female',
        ]))
        ->assertSessionHasNoErrors();

    expect(Appointment::sole())
        ->first_name->toBe('Juan')
        ->email->toBe('juan@example.com')
        ->age->toBe(8)
        ->gender->toBe('male');
});

it('books against the named patient rather than forking a near-duplicate record', function () {
    // The old flow matched on name + phone, so one mistyped character created a
    // second Patient row and split the medical record in half.
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)(['firstName' => 'Jaun']))
        ->assertSessionHasNoErrors();

    expect(Patient::count())->toBe(1)
        ->and(Appointment::sole()->patient_id)->toBe($this->child->id);
});

// ── Ownership ─────────────────────────────────────────────────────────────────

it('refuses a patient id belonging to another account', function () {
    $theirs = Patient::factory()->forGuarantor($this->stranger)->create();

    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)(['patientId' => $theirs->id]))
        ->assertSessionHasErrors('patient_id');

    expect(Appointment::count())->toBe(0);
});

it('refuses an archived patient', function () {
    $this->child->delete();

    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)())
        ->assertSessionHasErrors('patient_id');

    expect(Appointment::count())->toBe(0);
});

it('requires a patient to be chosen at all', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)(['patientId' => null]))
        ->assertSessionHasErrors('patient_id');

    expect(Appointment::count())->toBe(0);
});

// ── Records too thin to book ──────────────────────────────────────────────────

it('refuses a patient whose record has no age or sex, with a fixable message', function (array $missing) {
    // patients.birthdate, .age and .gender are all nullable — staff-created and
    // pre-migration records often have none of them — but the appointment
    // columns they feed are NOT NULL, so this used to blow up at the insert with
    // a generic "something went wrong".
    $thin = Patient::factory()->forGuarantor($this->guarantor)->create($missing);

    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)(['patientId' => $thin->id]))
        ->assertSessionHasErrors('patient_id');

    expect(Appointment::count())->toBe(0);
})->with([
    'no age' => [['age' => null, 'birthdate' => null]],
    'no sex' => [['gender' => null]],
    'neither' => [['age' => null, 'birthdate' => null, 'gender' => null]],
]);

it('will not let a record with no age slip past the Pediatrics limit', function () {
    // `(int) null > 18` is false, so an ageless adult used to sail through.
    $thin = Patient::factory()->forGuarantor($this->guarantor)->create(['age' => null, 'birthdate' => null]);

    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'patientId' => $thin->id,
            'service' => 'pediatrics',
        ]))
        ->assertSessionHasErrors('patient_id');

    expect(Appointment::count())->toBe(0);
});

it('flags an incomplete record so the gate can offer to complete it', function () {
    Patient::factory()->forGuarantor($this->guarantor)->create(['age' => null, 'birthdate' => null]);

    $this->actingAs($this->guarantor)
        ->get('/book')
        ->assertInertia(fn ($page) => $page
            ->where('patients.0.needsDetails', false)
            ->where('patients.1.needsDetails', true)
        );
});

it('carries an edited patient straight back into booking', function () {
    $thin = Patient::factory()->forGuarantor($this->guarantor)->create(['age' => null, 'birthdate' => null]);

    $this->actingAs($this->guarantor)
        ->patch("/user/patients/{$thin->id}", [
            'firstName' => $thin->first_name,
            'lastName' => $thin->last_name,
            'email' => $thin->email,
            'contactNumber' => '09171234567',
            'birthdate' => now()->subYears(30)->subMonth()->toDateString(),
            'gender' => 'female',
            'relationship' => 'parent',
            'bookAfterSave' => true,
        ])
        ->assertRedirect('/book?patient='.$thin->id);

    expect($thin->fresh()->age)->toBe(30);
});

// ── Eligibility reads the record, not the request ─────────────────────────────

it('refuses OB-Gyne for a male patient even when the client claims otherwise', function () {
    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'service' => 'ob-gyne',
            'gender' => 'female',
        ]))
        ->assertSessionHasErrors('service');

    expect(Appointment::count())->toBe(0);
});

it('refuses Pediatrics for an adult even when the client claims a child’s age', function () {
    $adult = Patient::factory()->forGuarantor($this->guarantor)->aged(40)->create();

    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'patientId' => $adult->id,
            'service' => 'pediatrics',
            'age' => 8,
        ]))
        ->assertSessionHasErrors('service');

    expect(Appointment::count())->toBe(0);
});

// ── Page props ────────────────────────────────────────────────────────────────

it('offers only the signed-in account’s own patients on the booking page', function () {
    Patient::factory()->forGuarantor($this->stranger)->create();

    $this->actingAs($this->guarantor)
        ->get('/book')
        ->assertInertia(fn ($page) => $page
            ->component('user/book-appointment/book-appointment')
            ->has('patients', 1)
            ->where('patients.0.id', $this->child->id)
        );
});

it('ignores a ?patient= pointing at someone else’s record', function () {
    $theirs = Patient::factory()->forGuarantor($this->stranger)->create();

    $this->actingAs($this->guarantor)
        ->get('/book?patient='.$theirs->id)
        ->assertInertia(fn ($page) => $page->where('selectedPatientId', null));
});

it('opens straight onto a patient the account does own', function () {
    $this->actingAs($this->guarantor)
        ->get('/book?patient='.$this->child->id)
        ->assertInertia(fn ($page) => $page
            ->where('selectedPatientId', $this->child->id)
        );
});

// ── "Myself" ──────────────────────────────────────────────────────────────────

it('promotes the account holder’s own profile into a patient record', function () {
    $fresh = userWithRole('user');
    PatientProfile::create([
        'user_id' => $fresh->id,
        'first_name' => 'Ana',
        'last_name' => 'Santos',
        'contact_number' => '09181112222',
        'gender' => 'F',
        'birthdate' => now()->subYears(35)->toDateString(),
    ]);

    $this->actingAs($fresh)->get('/book');

    $self = Patient::where('guarantor_id', $fresh->id)->sole();

    expect($self->relationship_to_guarantor)->toBe('self')
        ->and($self->first_name)->toBe('Ana')
        // patient_profiles stores M/F; patients uses male/female/other.
        ->and($self->gender)->toBe('female')
        ->and($self->age)->toBe(35);
});

it('adopts the record the account holder already has instead of duplicating it', function () {
    // Every patient predating `relationship_to_guarantor` has it null, including
    // the one the account holder has been seen under. A second "self" row beside
    // it would strand their entire history on the record the gate never offers.
    $fresh = userWithRole('user');
    PatientProfile::create([
        'user_id' => $fresh->id,
        'first_name' => 'Ana',
        'last_name' => 'Santos',
        'contact_number' => '09181112222',
    ]);

    $existing = Patient::factory()->forGuarantor($fresh)->create([
        'first_name' => 'Ana',
        'last_name' => 'Santos',
        'relationship_to_guarantor' => null,
    ]);
    Appointment::factory()->create([
        'patient_id' => $existing->id,
        'status' => 'completed',
    ]);

    $this->actingAs($fresh)->get('/book');

    expect(Patient::where('guarantor_id', $fresh->id)->count())->toBe(1)
        ->and($existing->fresh()->relationship_to_guarantor)->toBe('self')
        // The history has to come with it — that is the whole point.
        ->and($existing->appointments()->count())->toBe(1);
});

it('does not adopt a different person under the same account', function () {
    $fresh = userWithRole('user');
    PatientProfile::create([
        'user_id' => $fresh->id,
        'first_name' => 'Ana',
        'last_name' => 'Santos',
        'contact_number' => '09181112222',
    ]);

    $child = Patient::factory()->forGuarantor($fresh)->create([
        'first_name' => 'Miguel',
        'last_name' => 'Santos',
        'relationship_to_guarantor' => null,
    ]);

    $this->actingAs($fresh)->get('/book');

    expect($child->fresh()->relationship_to_guarantor)->toBeNull()
        ->and(Patient::where('guarantor_id', $fresh->id)->count())->toBe(2);
});

it('does not create a self patient twice', function () {
    $fresh = userWithRole('user');
    PatientProfile::create([
        'user_id' => $fresh->id,
        'first_name' => 'Ana',
        'last_name' => 'Santos',
        'contact_number' => '09181112222',
    ]);

    $this->actingAs($fresh)->get('/book');
    $this->actingAs($fresh)->get('/book');
    $this->actingAs($fresh)->get('/user/patients');

    expect(Patient::where('guarantor_id', $fresh->id)->count())->toBe(1);
});

it('leaves an account with an unpromotable profile empty rather than half-creating one', function () {
    // patients.contact_number is NOT NULL but patient_profiles.contact_number is
    // not, so a half-filled profile cannot become a valid record. The gate then
    // simply has no patients and the guarantor adds themselves the ordinary way.
    $fresh = userWithRole('user');
    PatientProfile::create([
        'user_id' => $fresh->id,
        'first_name' => 'Ana',
        'last_name' => 'Santos',
    ]);

    $this->actingAs($fresh)
        ->get('/book')
        ->assertInertia(fn ($page) => $page->has('patients', 0));

    expect(Patient::where('guarantor_id', $fresh->id)->count())->toBe(0);
});

// ── Coverage prefill ──────────────────────────────────────────────────────────

it('remembers how a visit was covered so the next booking arrives prefilled', function () {
    $adult = Patient::factory()->forGuarantor($this->guarantor)->aged(40)->create();

    $this->actingAs($this->guarantor)
        ->post('/appointments', ($this->payload)([
            'patientId' => $adult->id,
            'coverage' => 'hmo',
            'hmo' => 'maxicare',
            'hmoId' => 'MC-123456',
        ]))
        ->assertSessionHasNoErrors();

    expect($adult->fresh())
        ->default_coverage->toBe('hmo')
        ->hmo_provider->toBe('maxicare')
        ->hmo_id->toBe('MC-123456');
});

it('does not erase a stored member number when a later visit is paid in cash', function () {
    $adult = Patient::factory()->forGuarantor($this->guarantor)->aged(40)->create([
        'default_coverage' => 'hmo',
        'hmo_provider' => 'maxicare',
        'hmo_id' => 'MC-123456',
    ]);

    app(BookingService::class)->bookSlot([
        'user_id' => $this->guarantor->id,
        'patient_id' => $adult->id,
        'service' => 'general',
        'appointment_date' => $this->date->toDateString(),
        'appointment_time' => '9:00 AM',
        'coverage' => 'cash',
        'doctor_id' => $this->doctor->id,
    ]);

    expect($adult->fresh())
        ->default_coverage->toBe('cash')
        ->hmo_id->toBe('MC-123456');
});
