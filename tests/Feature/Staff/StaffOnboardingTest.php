<?php

use App\Enums\CredentialStatus;
use App\Models\DoctorProfile;
use App\Models\User;

/**
 * Phase 9 — an admin-created doctor must be a real, complete doctor.
 *
 * This file exists because of a defect that produced no error anywhere. Before
 * Phase 9, StaffAccountService wrote `users` + `patient_profiles` + a role and
 * stopped. A doctor created through the admin UI therefore had no
 * `doctor_profiles` row, which meant they never appeared in
 * DoctorProfile::active(), could not be booked, had no specialty to be searched
 * by, and rendered a blank name everywhere `doctorProfile.display_name` is
 * read. The account logged in perfectly. It was invisible to everyone else.
 *
 * The second half of the file asserts the gate that replaced it: creating an
 * account is not the same as clearing someone to practise.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
});

function doctorPayload(array $overrides = []): array
{
    return array_merge([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'maria.santos@wellcare.com',
        'password' => 'Str0ng-Passw0rd!',
        'password_confirmation' => 'Str0ng-Passw0rd!',
        'role' => 'doctor',
        'contact_number' => '09171234567',
        'specialty' => 'pediatrics',
    ], $overrides);
}

// ── The profile row ───────────────────────────────────────────────────────────

it('creates the doctor_profiles row alongside the account', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', doctorPayload())
        ->assertRedirect();

    $doctor = User::where('email', 'maria.santos@wellcare.com')->firstOrFail();

    // The whole point: without this row the doctor does not exist to patients.
    expect($doctor->doctorProfile)->not->toBeNull()
        ->and($doctor->doctorProfile->specialty)->toBe('pediatrics')
        ->and($doctor->doctorProfile->display_name)->toBe('Dr. Maria Santos')
        ->and($doctor->doctorProfile->initials)->toBe('MS')
        ->and($doctor->doctorProfile->max_patients_per_day)
        ->toBe(DoctorProfile::DEFAULT_DAILY_PATIENT_CAP);
});

it('defaults a doctor with no stated specialty to general practice', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', doctorPayload(['specialty' => null]))
        ->assertRedirect();

    $doctor = User::where('email', 'maria.santos@wellcare.com')->firstOrFail();

    // General practice is the one specialty needing no board certificate, so it
    // is the only safe default — see Specialty::requiresBoardCertificate().
    expect($doctor->doctorProfile->specialty)->toBe('general');
});

it('does not create a doctor profile for a nurse account', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', doctorPayload(['role' => 'nurse', 'specialty' => null]))
        ->assertRedirect();

    $nurse = User::where('email', 'maria.santos@wellcare.com')->firstOrFail();

    expect($nurse->doctorProfile)->toBeNull();
});

it('rejects a specialty the clinic does not offer', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', doctorPayload(['specialty' => 'astrology']))
        ->assertSessionHasErrors('specialty');

    expect(User::where('email', 'maria.santos@wellcare.com')->exists())->toBeFalse();
});

// ── The gate ──────────────────────────────────────────────────────────────────

it('does not publish a newly created doctor to patients', function () {
    $this->actingAs($this->admin)
        ->post('/admin/users', doctorPayload())
        ->assertRedirect();

    $doctor = User::where('email', 'maria.santos@wellcare.com')->firstOrFail();

    // Creating the account is not clearing them to practise. Until an
    // administrator verifies a PRC licence they are not bookable, which is the
    // behaviour this whole phase exists to introduce.
    expect($doctor->doctorProfile->is_active)->toBeFalse()
        ->and(DoctorProfile::active()->where('user_id', $doctor->id)->exists())->toBeFalse()
        ->and($doctor->isCredentialed())->toBeFalse();
});

it('publishes the doctor only once their credentials are verified', function () {
    $this->actingAs($this->admin)->post('/admin/users', doctorPayload());
    $doctor = User::where('email', 'maria.santos@wellcare.com')->firstOrFail();

    $this->actingAs($this->admin)->put("/admin/staff/{$doctor->id}/credentials", [
        'prc_license_no' => '0123456',
        'prc_expires_on' => now()->addYear()->toDateString(),
    ]);

    // Filed but unverified — still not bookable.
    expect($doctor->fresh()->doctorProfile->is_active)->toBeFalse();

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$doctor->id}/verify")
        ->assertRedirect();

    $doctor->refresh();

    expect($doctor->credential->status)->toBe(CredentialStatus::Verified)
        ->and($doctor->doctorProfile->is_active)->toBeTrue()
        ->and(DoctorProfile::active()->where('user_id', $doctor->id)->exists())->toBeTrue()
        ->and($doctor->isCredentialed())->toBeTrue();
});

it('keeps the profile and medical rows the account module already guaranteed', function () {
    $this->actingAs($this->admin)->post('/admin/users', doctorPayload());

    $doctor = User::where('email', 'maria.santos@wellcare.com')->firstOrFail();

    // A User row alone renders a blank name — see StaffAccountService.
    expect($doctor->profile)->not->toBeNull()
        ->and($doctor->name)->toBe('Maria Santos')
        ->and($doctor->hasRole('doctor'))->toBeTrue()
        ->and($doctor->hasVerifiedEmail())->toBeTrue();
});
