<?php

use App\Models\Patient;
use App\Models\User;
use App\Services\StaffAccountService;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::registration());

    // Contact number, sex and birthdate are required. The form has always
    // marked all three with an asterisk; the rules now agree, because a profile
    // missing any of them cannot become the account holder's Patient record.
    $this->registration = fn (array $overrides = []) => array_merge([
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'contact_number' => '09171234567',
        'gender' => 'F',
        'birthdate' => now()->subYears(30)->subMonth()->toDateString(),
        // SC-4 / C-1. Registration requires explicit, unbundled consent to data
        // processing and to treatment. Added to the shared payload rather than
        // to each test: every one of these is asserting something else, and a
        // registration that cannot complete without consent is the contract now.
        // Consent behaviour itself is covered in tests/Feature/Compliance.
        'consent_data_processing' => '1',
        'consent_treatment' => '1',
    ], $overrides);
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

// CreateNewUser takes first_name/last_name — there is no `name` column on
// users; names live on patient_profiles. It also assigns the "user" role and
// creates the profile + medical records.
test('new users can register', function () {
    $response = $this->post(route('register.store'), ($this->registration)());

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::where('email', 'test@example.com')->firstOrFail();

    expect($user->hasRole('user'))->toBeTrue()
        ->and($user->profile->first_name)->toBe('Test')
        ->and($user->profile->last_name)->toBe('User')
        ->and($user->profile->medical)->not->toBeNull();
});

// A patient account holder is themselves a patient. Registering has to produce
// the record, or the booking gate opens empty for a brand-new account and the
// guarantor is asked to add themselves as if they were a third party.
test('registering creates the account holder’s own patient record', function () {
    $this->post(route('register.store'), ($this->registration)());

    $user = User::where('email', 'test@example.com')->firstOrFail();
    $self = Patient::where('guarantor_id', $user->id)->sole();

    expect($self->relationship_to_guarantor)->toBe('self')
        ->and($self->first_name)->toBe('Test')
        ->and($self->last_name)->toBe('User')
        ->and($self->email)->toBe('test@example.com')
        ->and($self->contact_number)->toBe('09171234567')
        // patient_profiles stores M/F; patients uses male/female/other.
        ->and($self->gender)->toBe('female')
        ->and($self->current_age)->toBe(30)
        // Bookable straight away — nothing left for the gate to ask for.
        ->and($self->clinic_id)->toStartWith('WC-');
});

test('a new account confirms its email before it can book', function () {
    $this->post(route('register.store'), ($this->registration)());

    $this->get('/book')->assertRedirect(route('verification.notice'));
});

test('the booking gate is ready to use as soon as the email is confirmed', function () {
    $this->post(route('register.store'), ($this->registration)());
    auth()->user()->markEmailAsVerified();

    $this->get('/book')->assertInertia(fn ($page) => $page
        ->has('patients', 1)
        ->where('patients.0.relationship', 'self')
        ->where('patients.0.needsDetails', false)
    );
});

test('registration requires a first and last name', function () {
    $this->post(route('register.store'), ($this->registration)([
        'first_name' => '',
        'last_name' => '',
    ]))->assertSessionHasErrors(['first_name', 'last_name']);

    $this->assertGuest();
});

test('registration requires the details the patient record needs', function (string $field) {
    $this->post(route('register.store'), ($this->registration)([$field => '']))
        ->assertSessionHasErrors($field);

    $this->assertGuest();
    expect(Patient::count())->toBe(0);
})->with(['contact_number', 'gender', 'birthdate']);

test('registration rejects a contact number that is not a PH mobile', function () {
    $this->post(route('register.store'), ($this->registration)([
        'contact_number' => '12345',
    ]))->assertSessionHasErrors('contact_number');

    $this->assertGuest();
});

// Staff are not patients: a doctor appearing in patient lists and searches is a
// data-integrity problem, not a convenience.
test('creating a staff account does not create a patient record', function (string $role) {
    app(StaffAccountService::class)->create([
        'first_name' => 'Dr',
        'last_name' => 'Reyes',
        'email' => "{$role}@example.com",
        'password' => 'password',
        'contact_number' => '09171234567',
        'gender' => 'F',
        'birthdate' => now()->subYears(40)->toDateString(),
    ], $role);

    expect(Patient::count())->toBe(0);
})->with(['doctor', 'nurse', 'hr', 'admin']);

test('registration records blood type and self-reported allergies on the patient record', function () {
    $this->post(route('register.store'), ($this->registration)([
        'blood_type' => 'O+',
        'known_allergies' => 'Penicillin, shrimp, penicillin, none',
        'civil_status' => 'separated',
    ]))->assertSessionHasNoErrors();

    $self = Patient::where('relationship_to_guarantor', 'self')->sole();

    expect($self->blood_type)->toBe('O+')
        ->and($self->civil_status)->toBe('separated')
        ->and($self->allergies()->pluck('allergen')->all())->toBe(['Penicillin', 'shrimp'])
        ->and($self->allergies()->first()->notes)->toContain('Self-reported');
});

test('registration rejects a blood type that does not exist', function () {
    $this->post(route('register.store'), ($this->registration)(['blood_type' => 'C+']))
        ->assertSessionHasErrors('blood_type');
});

test('registration accepts annulled as a civil status', function () {
    $this->post(route('register.store'), ($this->registration)(['civil_status' => 'annulled']))
        ->assertSessionHasNoErrors();
});
