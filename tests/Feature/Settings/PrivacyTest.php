<?php

use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\LabTestResult;
use App\Models\Patient;
use App\Models\PaymentVerification;
use App\Models\User;

test('the privacy page summarises what the clinic holds', function () {
    $user = User::factory()->create();

    Patient::factory()->count(2)->create(['guarantor_id' => $user->id]);
    Appointment::factory()->count(3)->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('settings.privacy'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.patients', 2)
            ->where('summary.appointments', 3)
        );
});

test('a data export downloads the account\'s own data', function () {
    $user = User::factory()->create();
    $user->profile()->create(['first_name' => 'Maria', 'last_name' => 'Santos']);

    Patient::factory()->create([
        'guarantor_id' => $user->id,
        'first_name' => 'Maria',
        'last_name' => 'Santos',
    ]);

    $response = $this->actingAs($user)->get(route('settings.privacy.export'));

    $response->assertOk()
        ->assertHeader('content-type', 'application/json')
        ->assertDownload();

    $payload = json_decode($response->streamedContent(), true);

    expect($payload['account']['email'])->toBe($user->email)
        ->and($payload['profile']['first_name'])->toBe('Maria')
        ->and($payload['patients'])->toHaveCount(1);
});

/**
 * The scoping rule that matters. Patients belong to a guarantor, NOT to a
 * user_id — reading them the wrong way puts another family's record in this
 * person's download.
 */
test('a data export never contains another account\'s patients', function () {
    $user = User::factory()->create();
    $stranger = User::factory()->create();

    Patient::factory()->create([
        'guarantor_id' => $stranger->id,
        'first_name' => 'Someone',
        'last_name' => 'Else',
    ]);

    $response = $this->actingAs($user)->get(route('settings.privacy.export'));

    expect($response->streamedContent())->not->toContain('Someone');
});

/**
 * A storage path in an exported file is a path someone will eventually try.
 */
test('a data export omits document storage paths', function () {
    $user = User::factory()->create();

    $user->patientDocuments()->create([
        // `uploaded_by` is a required FK — a document always has a member of
        // staff who filed it.
        'uploaded_by' => User::factory()->role('nurse')->create()->id,
        'title' => 'Chest X-ray',
        'type' => 'imaging',
        'file_path' => 'patient-documents/secret-location.pdf',
        'file_name' => 'xray.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1024,
    ]);

    $response = $this->actingAs($user)->get(route('settings.privacy.export'));

    expect($response->streamedContent())
        ->toContain('xray.pdf')
        ->not->toContain('secret-location.pdf');
});

test('the export is closed to guests', function () {
    $this->get(route('settings.privacy.export'))->assertRedirect(route('login'));
});

// ── Account deletion ─────────────────────────────────────────────────────────

test('a patient can close their own account', function () {
    $user = User::factory()->role('user')->create();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect('/');

    expect(User::find($user->id))->toBeNull();
});

/**
 * A doctor account IS `appointments.doctor_id`. Self-deleting it would cascade
 * through consultation sessions, availability blocks and validated lab results
 * — offboarding staff is an administrator's deactivation, which keeps the
 * clinical record intact.
 */
test('staff cannot self-delete their account', function (string $role) {
    $user = User::factory()->role($role)->create();

    $this->actingAs($user)
        ->from(route('settings.privacy'))
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasErrors('password');

    expect(User::find($user->id))->not->toBeNull();
})->with(['doctor', 'nurse', 'hr', 'admin']);

test('a data export includes payments, lab results and prescriptions', function () {
    $user = userWithRole('user');
    $record = Patient::factory()->forGuarantor($user)->create();
    $appointment = Appointment::factory()->forPatient($record)->virtual()->create();

    PaymentVerification::factory()->forAppointment($appointment)->create([
        'status' => 'verified', 'amount_paid' => 750, 'verified_at' => now(),
    ]);
    $lab = LabTestResult::create([
        'patient_id' => $record->id, 'user_id' => $user->id, 'appointment_id' => $appointment->id,
        'requested_by' => userWithRole('doctor')->id, 'test_name' => 'Lipid Profile',
        'status' => 'requested', 'requested_at' => now(),
    ]);
    $session = ConsultationSession::factory()->create(['appointment_id' => $appointment->id]);
    $session->prescriptions()->create(['name' => 'Atorvastatin 20mg', 'instructions' => 'Once daily']);

    $payload = json_decode($this->actingAs($user)->get(route('settings.privacy.export'))->streamedContent(), true);

    expect($payload['payments'])->toHaveCount(1)
        ->and($payload['payments'][0])->not->toHaveKey('proof_path')
        ->and($payload['lab_results'][0]['test_name'])->toBe('Lipid Profile')
        ->and($payload['prescriptions'][0]['name'])->toBe('Atorvastatin 20mg');
});
