<?php

use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\AvailabilityBlock;
use App\Models\Consent;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\User;
use App\Services\ConsentService;
use Carbon\Carbon;

/**
 * SC-4 — consent capture, versioning and withdrawal.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §2.1, C-1 through C-6. All six were Missing:
 * there was no table, no column and no checkbox anywhere, so a patient could
 * register, book and be diagnosed with no record of consent to any of it.
 *
 * The wording itself is ND-1 and lives in config/consent.php behind an
 * `approved` flag; these tests assert the mechanism, not the copy.
 */
function registrationPayload(array $overrides = []): array
{
    return array_merge([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'maria.santos@example.com',
        'password' => 'Str0ng-Passw0rd!',
        'password_confirmation' => 'Str0ng-Passw0rd!',
        'contact_number' => '09171234567',
        'gender' => 'F',
        'birthdate' => now()->subYears(30)->toDateString(),
        'consent_data_processing' => '1',
        'consent_treatment' => '1',
    ], $overrides);
}

// ── C-1: unbundled, and genuinely required ───────────────────────────────────

test('registration records a separate consent row per purpose', function () {
    $this->post('/register', registrationPayload())
        ->assertSessionHasNoErrors();

    $user = User::where('email', 'maria.santos@example.com')->firstOrFail();

    // One row per purpose, not one "I agree to the terms" flag — the specific
    // failure C-1 records.
    expect($user->consents()->count())->toBe(2);

    foreach ([Consent::DATA_PROCESSING, Consent::TREATMENT] as $type) {
        $this->assertDatabaseHas('consents', [
            'granted_by_user_id' => $user->id,
            'type' => $type,
            'withdrawn_at' => null,
        ]);
    }
});

test('registration is refused without consent to data processing', function () {
    $this->post('/register', registrationPayload(['consent_data_processing' => '0']))
        ->assertSessionHasErrors('consent_data_processing');

    $this->assertDatabaseMissing('users', ['email' => 'maria.santos@example.com']);
});

test('registration is refused without consent to treatment', function () {
    $payload = registrationPayload();
    unset($payload['consent_treatment']);

    $this->post('/register', $payload)->assertSessionHasErrors('consent_treatment');

    $this->assertDatabaseMissing('users', ['email' => 'maria.santos@example.com']);
});

test('marketing consent is no longer asked for and cannot be granted by posting it', function () {
    // The clinic dropped the purpose. A form field the application no longer
    // renders is still a field anyone can post, so this asserts the removal is
    // in the action rather than only in the TSX.
    $this->post('/register', registrationPayload(['consent_marketing' => '1']))
        ->assertSessionHasNoErrors();

    $user = User::where('email', 'maria.santos@example.com')->firstOrFail();

    expect($user->consents()->count())->toBe(2);
    $this->assertDatabaseMissing('consents', [
        'granted_by_user_id' => $user->id,
        'type' => Consent::MARKETING,
    ]);
});

// ── C-2: versioned and timestamped ───────────────────────────────────────────

test('a consent records the version of the wording that was on screen', function () {
    $this->post('/register', registrationPayload());

    $consent = Consent::where('type', Consent::DATA_PROCESSING)->firstOrFail();

    expect($consent->document_version)
        ->toBe(config('consent.purposes.data_processing.version'))
        ->and($consent->granted_at)->not->toBeNull()
        ->and($consent->ip_address)->not->toBeNull()
        ->and($consent->isStale())->toBeFalse();
});

test('changing the wording makes existing consent stale without rewriting it', function () {
    $this->post('/register', registrationPayload());
    $consent = Consent::where('type', Consent::DATA_PROCESSING)->firstOrFail();
    $originalVersion = $consent->document_version;

    config(['consent.purposes.data_processing.version' => '2027-01-01.1']);

    // The stored row is untouched — it still says what they actually agreed to.
    expect($consent->fresh()->document_version)->toBe($originalVersion)
        ->and($consent->fresh()->isStale())->toBeTrue();

    $user = User::where('email', 'maria.santos@example.com')->firstOrFail();
    expect(app(ConsentService::class)->has(Consent::DATA_PROCESSING, $user))->toBeFalse()
        ->and(app(ConsentService::class)->outstandingFor($user))
        ->toContain(Consent::DATA_PROCESSING);
});

test('granting twice at the same version does not create a second row', function () {
    $user = userWithRole('user');
    $service = app(ConsentService::class);

    $first = $service->grant(Consent::TREATMENT, $user);
    $second = $service->grant(Consent::TREATMENT, $user);

    expect($second->id)->toBe($first->id)
        ->and(Consent::where('granted_by_user_id', $user->id)->count())->toBe(1);
});

// ── C-3: the patient can see what they agreed to ─────────────────────────────

test('the privacy page shows every purpose and where the account stands on it', function () {
    $this->post('/register', registrationPayload());
    $user = User::where('email', 'maria.santos@example.com')->firstOrFail();
    $user->markEmailAsVerified();

    $this->actingAs($user)
        ->get(route('settings.privacy'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('consents', 3)
            ->where('consents.0.type', Consent::DATA_PROCESSING)
            ->where('consents.0.granted', true)
            ->where('consents.0.withdrawable', false)
            ->has('consents.0.body')
        );
});

test('the consent history is included in a data export', function () {
    $this->post('/register', registrationPayload());
    $user = User::where('email', 'maria.santos@example.com')->firstOrFail();
    $user->markEmailAsVerified();

    $response = $this->actingAs($user)->get(route('settings.privacy.export'));
    $payload = json_decode($response->streamedContent(), true);

    expect($payload['consents'])->toHaveCount(2)
        ->and($payload['consents'][0])->toHaveKeys([
            'purpose', 'document_version', 'granted_at', 'withdrawn_at',
        ]);
});

// ── C-4 / DS-5: withdrawal ───────────────────────────────────────────────────

test('a withdrawable consent can be withdrawn and is closed rather than deleted', function () {
    $this->post('/register', registrationPayload());
    $user = User::where('email', 'maria.santos@example.com')->firstOrFail();
    $user->markEmailAsVerified();

    $this->actingAs($user)
        ->delete(route('settings.privacy.consents.withdraw', Consent::TREATMENT))
        ->assertRedirect();

    $consent = Consent::where('type', Consent::TREATMENT)->firstOrFail();

    // The row survives with a second timestamp: "they agreed on the 3rd and
    // withdrew on the 9th" is the fact, and a deleted row cannot state it.
    expect($consent->withdrawn_at)->not->toBeNull()
        ->and($consent->isActive())->toBeFalse();
});

test('data processing consent cannot be withdrawn through self-service', function () {
    $this->post('/register', registrationPayload());
    $user = User::where('email', 'maria.santos@example.com')->firstOrFail();
    $user->markEmailAsVerified();

    $this->actingAs($user)
        ->delete(route('settings.privacy.consents.withdraw', Consent::DATA_PROCESSING))
        ->assertSessionHasErrors('consent');

    expect(Consent::where('type', Consent::DATA_PROCESSING)->first()->isActive())->toBeTrue();
});

test('an unknown consent type is a 404, not a silent no-op', function () {
    $user = userWithRole('user');

    $this->actingAs($user)
        ->delete(route('settings.privacy.consents.withdraw', 'not-a-purpose'))
        ->assertNotFound();
});

// ── C-5: telemedicine consent at the point of booking ────────────────────────

/**
 * Booking fixture, matching BookingConsultationTypeTest — a weekly availability
 * block on the DAYOFWEEK convention, an active doctor profile, and the camelCase
 * payload keys the wizard actually posts.
 */
function bookingFixture(): array
{
    $user = userWithRole('user');
    $doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $doctor->id,
        'display_name' => 'Dr. Maria Reyes',
        'specialty' => 'general',
        'is_active' => true,
    ]);

    $date = Carbon::parse('next monday');

    AvailabilityBlock::create([
        'doctor_id' => $doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
    ]);

    $patient = Patient::factory()->forGuarantor($user)->create([
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'email' => 'juan.delacruz@gmail.com',
        'contact_number' => '09171234567',
        'age' => 34,
        'gender' => 'male',
    ]);

    $payload = fn (array $overrides = []) => array_merge([
        'patientId' => $patient->id,
        'service' => 'general',
        'branch' => 'Wellcare Dasmarinas',
        'appointmentDate' => $date->toDateString(),
        'appointmentTime' => '9:00 AM',
        'coverage' => 'cash',
        'doctorId' => $doctor->id,
    ], $overrides);

    return compact('user', 'doctor', 'patient', 'payload');
}

test('booking a video consultation without consent is refused', function () {
    ['user' => $user, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)
        ->post(route('appointments.store'), $payload(['consultationType' => 'virtual']))
        ->assertSessionHasErrors('consent_telemedicine');

    $this->assertDatabaseCount('appointments', 0);
});

test('a booked video consultation records telemedicine consent against the patient', function () {
    ['user' => $user, 'patient' => $patient, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)->post(route('appointments.store'), $payload([
        'consultationType' => 'virtual',
        'consent_telemedicine' => '1',
    ]))->assertSessionHasNoErrors();

    expect(Appointment::count())->toBe(1);

    // C-6: keyed to the PATIENT, so a guarantor consenting for a child is
    // recorded against that child rather than smeared across the account.
    $this->assertDatabaseHas('consents', [
        'type' => Consent::TELEMEDICINE,
        'patient_id' => $patient->id,
        'granted_by_user_id' => $user->id,
        'withdrawn_at' => null,
    ]);
});

/**
 * The regression these two guard.
 *
 * The consent rule was added with tests that posted `consent_telemedicine`
 * directly, while the wizard's useForm sends camelCase like every other field
 * it owns — and prepareForValidation() mapped every key EXCEPT this one. So the
 * rule saw nothing, every virtual booking made through the UI was rejected, and
 * the review screen rendered only `errors.appointmentTime`, so the rejection
 * was silent: the patient pressed Submit and the page did not move.
 *
 * Posting the key the browser actually sends is the whole point of the test.
 */
test('the camelCase consent key the wizard posts is what books a video consultation', function () {
    ['user' => $user, 'patient' => $patient, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)->post(route('appointments.store'), $payload([
        'consultationType' => 'virtual',
        'consentTelemedicine' => true,
    ]))->assertSessionHasNoErrors();

    expect(Appointment::latest('id')->first()->consultation_type)->toBe('virtual');

    $this->assertDatabaseHas('consents', [
        'type' => Consent::TELEMEDICINE,
        'patient_id' => $patient->id,
        'granted_by_user_id' => $user->id,
        'withdrawn_at' => null,
    ]);
});

test('an unticked box is a refusal, not an omission', function () {
    ['user' => $user, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)
        ->post(route('appointments.store'), $payload([
            'consultationType' => 'virtual',
            'consentTelemedicine' => false,
        ]))
        ->assertSessionHasErrors('consent_telemedicine');

    $this->assertDatabaseCount('appointments', 0);
});

test('the booking page is served the telemedicine wording its tick-box renders', function () {
    ['user' => $user] = bookingFixture();

    $this->actingAs($user)
        ->get(route('book'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('telemedicineConsent.type', Consent::TELEMEDICINE)
            ->where('telemedicineConsent.version', config('consent.purposes.telemedicine.version'))
            ->has('telemedicineConsent.title')
            ->has('telemedicineConsent.summary')
            ->has('telemedicineConsent.body')
        );
});

test('an in-person booking needs no telemedicine consent', function () {
    ['user' => $user, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)
        ->post(route('appointments.store'), $payload(['consultationType' => 'in_person']))
        ->assertSessionHasNoErrors();

    $this->assertDatabaseMissing('consents', ['type' => Consent::TELEMEDICINE]);
});

test('the privacy page shows a telemedicine consent given at booking, and who it covers', function () {
    ['user' => $user, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)->post(route('appointments.store'), $payload([
        'consultationType' => 'virtual',
        'consentTelemedicine' => true,
    ]))->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->get(route('settings.privacy'))
        ->assertInertia(fn ($page) => $page
            ->where('consents', fn ($consents) => collect($consents)
                ->firstWhere('type', Consent::TELEMEDICINE)['granted'] === true
                && collect($consents)->firstWhere('type', Consent::TELEMEDICINE)['forPatients'] === ['Juan Dela Cruz'])
        );
});

test('withdrawing telemedicine closes the consent recorded against the patient', function () {
    ['user' => $user, 'patient' => $patient, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)->post(route('appointments.store'), $payload([
        'consultationType' => 'virtual',
        'consentTelemedicine' => true,
    ]));

    $this->actingAs($user)->delete(route('settings.privacy.consents.withdraw', Consent::TELEMEDICINE));

    expect(Consent::where('type', Consent::TELEMEDICINE)->where('patient_id', $patient->id)->active()->exists())
        ->toBeFalse();
});

test('a withdrawn treatment consent stops new bookings until it is given again', function () {
    ['user' => $user, 'payload' => $payload] = bookingFixture();
    app(ConsentService::class)->grant(Consent::TREATMENT, $user);

    $this->actingAs($user)->delete(route('settings.privacy.consents.withdraw', Consent::TREATMENT));

    $this->actingAs($user)
        ->post(route('appointments.store'), $payload(['consultationType' => 'in_person']))
        ->assertSessionHasErrors('consent_treatment');

    $this->actingAs($user)->post(route('settings.privacy.consents.grant', Consent::TREATMENT))
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->post(route('appointments.store'), $payload(['consultationType' => 'in_person']))
        ->assertSessionHasNoErrors();
});

test('an account with no consent history is not treated as having withdrawn', function () {
    // Accounts created before consent capture have no rows at all.
    ['user' => $user, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)
        ->post(route('appointments.store'), $payload(['consultationType' => 'in_person']))
        ->assertSessionHasNoErrors();
});

// ── The registration form is actually served the wording ─────────────────────

test('the register page is served the consent documents it must render', function () {
    $this->get('/register')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('consents', 2)
            ->where('consents.0.field', 'consent_data_processing')
            ->where('consents.0.required', true)
            ->where('consents.1.field', 'consent_treatment')
            ->where('consents.1.required', true)
        );
});

test('a new booking reaches the doctor as a request, not a confirmation', function () {
    ['user' => $user, 'doctor' => $doctor, 'payload' => $payload] = bookingFixture();

    $this->actingAs($user)->post(route('appointments.store'), $payload(['consultationType' => 'in_person']));

    expect(AppointmentNotification::where('user_id', $doctor->id)->value('type'))->toBe('requested');
});

test('the finalized-notes notice speaks to the account holder about themselves', function () {
    $patient = userWithRole('user');
    $self = Patient::factory()->forGuarantor($patient)->create(['relationship_to_guarantor' => 'self']);
    $doctor = userWithRole('doctor');
    $appointment = Appointment::factory()->forPatient($self)->forDoctor($doctor)->checkedIn()->create([
        'appointment_date' => today()->toDateString(),
    ]);

    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/start");
    $this->actingAs($doctor)->post("/doctor/consultations/{$appointment->id}/save", [
        'soap[subjective]' => 'Cough',
        'finalize' => '1',
    ]);

    expect(AppointmentNotification::where('user_id', $patient->id)->where('type', 'consultation_done')->value('body'))
        ->toStartWith('Your doctor has finished the notes');
});

test('booking from a doctor profile opens the wizard with that doctor and a service they take', function () {
    ['user' => $user, 'doctor' => $doctor] = bookingFixture();

    $this->actingAs($user)
        ->get(route('book', ['doctor' => $doctor->id]))
        ->assertInertia(fn ($page) => $page
            ->where('prefill.doctorId', $doctor->id)
            ->where('prefill.service', 'general'));
});

test('an unknown or unpublished doctor in the link is ignored', function () {
    ['user' => $user] = bookingFixture();

    $this->actingAs($user)
        ->get(route('book', ['doctor' => 999999]))
        ->assertInertia(fn ($page) => $page->where('prefill.doctorId', null));
});
