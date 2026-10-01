<?php

use App\Enums\BoardStatus;
use App\Enums\CredentialStatus;
use App\Enums\Specialty;
use App\Exceptions\AccountActionNotAllowedException;
use App\Models\DoctorProfile;
use App\Models\StaffCredential;
use App\Services\CredentialingService;

/**
 * Credentialing and privileging — the administrator acting as medical director.
 *
 * The refusals are the substance of this file. Each one encodes a real
 * Philippine requirement rather than a UI preference:
 *
 *   • No PRC registration on file → cannot practise at all.
 *   • A lapsed PRC or PTR → cannot be cleared until renewed.
 *   • A specialist specialty with no Diplomate/Fellow certificate → cannot be
 *     conferred, because a specialty is not self-declared.
 *
 * Asserted at the service layer as well as over HTTP, for the same reason
 * AdminDeactivationTest does: a console command or future bulk action can reach
 * the service with no session behind it.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Test Doctor',
        'specialty' => Specialty::General->value,
        'is_active' => false,
    ]);

    $this->credentialing = app(CredentialingService::class);
});

function fileCredentials($doctor, array $overrides = []): StaffCredential
{
    return app(CredentialingService::class)->submit($doctor, array_merge([
        'prc_license_no' => '0123456',
        'prc_expires_on' => now()->addYear()->toDateString(),
        'ptr_no' => 'PTR-2026-0001',
        'ptr_issued_at_lgu' => 'Dasmariñas City',
        'ptr_expires_on' => now()->endOfYear()->toDateString(),
    ], $overrides));
}

// ── Filing ────────────────────────────────────────────────────────────────────

it('files a credential as pending and leaves the doctor unpublished', function () {
    $credential = fileCredentials($this->doctor);

    expect($credential->status)->toBe(CredentialStatus::Pending)
        ->and($credential->prc_license_no)->toBe('0123456')
        ->and($this->doctor->fresh()->doctorProfile->is_active)->toBeFalse();
});

it('sends a verified credential back to pending when the documents change', function () {
    fileCredentials($this->doctor);
    $this->credentialing->verify($this->doctor, $this->admin);

    expect($this->doctor->fresh()->doctorProfile->is_active)->toBeTrue();

    // A changed licence number invalidates the previous clearance: whatever was
    // checked is no longer what is on file.
    fileCredentials($this->doctor, ['prc_license_no' => '9999999']);

    expect($this->doctor->fresh()->credential->status)->toBe(CredentialStatus::Pending)
        ->and($this->doctor->fresh()->doctorProfile->is_active)->toBeFalse();
});

// ── Verification guards ───────────────────────────────────────────────────────

it('refuses to verify a credential with no PRC licence on file', function () {
    fileCredentials($this->doctor, ['prc_license_no' => null, 'prc_expires_on' => null]);

    expect(fn () => $this->credentialing->verify($this->doctor, $this->admin))
        ->toThrow(AccountActionNotAllowedException::class, 'PRC licence number');

    expect($this->doctor->fresh()->doctorProfile->is_active)->toBeFalse();
});

it('refuses to verify an expired PRC licence', function () {
    fileCredentials($this->doctor, ['prc_expires_on' => now()->subDay()->toDateString()]);

    expect(fn () => $this->credentialing->verify($this->doctor, $this->admin))
        ->toThrow(AccountActionNotAllowedException::class, 'PRC licence expired');
});

it('refuses to verify an expired PTR', function () {
    fileCredentials($this->doctor, ['ptr_expires_on' => now()->subDay()->toDateString()]);

    expect(fn () => $this->credentialing->verify($this->doctor, $this->admin))
        ->toThrow(AccountActionNotAllowedException::class, 'Professional Tax Receipt expired');
});

it('surfaces a verification refusal as a flash error rather than a crash', function () {
    fileCredentials($this->doctor, ['prc_license_no' => null, 'prc_expires_on' => null]);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/verify")
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($this->doctor->fresh()->credential->status)->toBe(CredentialStatus::Pending);
});

it('records who verified the credential and when', function () {
    fileCredentials($this->doctor);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/verify")
        ->assertRedirect()
        ->assertSessionHas('success');

    $credential = $this->doctor->fresh()->credential;

    expect($credential->status)->toBe(CredentialStatus::Verified)
        ->and($credential->verified_by)->toBe($this->admin->id)
        ->and($credential->verified_at)->not->toBeNull();
});

// ── Rejection and suspension ──────────────────────────────────────────────────

it('unpublishes a doctor whose credentials are rejected', function () {
    fileCredentials($this->doctor);
    $this->credentialing->verify($this->doctor, $this->admin);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/reject", ['remarks' => 'PRC ID could not be verified.'])
        ->assertRedirect();

    $doctor = $this->doctor->fresh();

    expect($doctor->credential->status)->toBe(CredentialStatus::Rejected)
        ->and($doctor->credential->remarks)->toBe('PRC ID could not be verified.')
        ->and($doctor->doctorProfile->is_active)->toBeFalse();
});

it('requires a reason when rejecting or suspending', function () {
    fileCredentials($this->doctor);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/reject", ['remarks' => ''])
        ->assertSessionHasErrors('remarks');

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/suspend", ['remarks' => ''])
        ->assertSessionHasErrors('remarks');
});

it('withdraws a suspended doctor from booking', function () {
    fileCredentials($this->doctor);
    $this->credentialing->verify($this->doctor, $this->admin);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/suspend", ['remarks' => 'Under review.'])
        ->assertRedirect();

    expect($this->doctor->fresh()->credential->status)->toBe(CredentialStatus::Suspended)
        ->and(DoctorProfile::active()->where('user_id', $this->doctor->id)->exists())->toBeFalse();
});

it('stops an administrator suspending their own credentials', function () {
    $adminCredential = fileCredentials($this->admin);

    expect(fn () => $this->credentialing->suspend($this->admin, $this->admin, 'x'))
        ->toThrow(AccountActionNotAllowedException::class, 'your own credentials');

    expect($adminCredential->fresh()->status)->toBe(CredentialStatus::Pending);
});

// ── Conferring a specialty ────────────────────────────────────────────────────

it('refuses a specialist specialty with no board certificate on file', function () {
    fileCredentials($this->doctor);

    expect(fn () => $this->credentialing->conferSpecialty($this->doctor, Specialty::Cardiology, $this->admin))
        ->toThrow(AccountActionNotAllowedException::class, 'Philippine College of Cardiology');

    expect($this->doctor->fresh()->doctorProfile->specialty)->toBe(Specialty::General->value);
});

it('confers a specialist specialty once the board certificate is recorded', function () {
    fileCredentials($this->doctor, [
        'specialty_board' => 'Philippine College of Cardiology',
        'board_status' => BoardStatus::Diplomate->value,
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/specialty", ['specialty' => 'cardiology'])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->doctor->fresh()->doctorProfile->specialty)->toBe('cardiology');
});

it('allows general practice without any board certificate', function () {
    fileCredentials($this->doctor);

    $this->credentialing->conferSpecialty($this->doctor, Specialty::General, $this->admin);

    expect($this->doctor->fresh()->doctorProfile->specialty)->toBe('general');
});

it('refuses to confer a specialty on an account that is not a doctor', function () {
    $nurse = userWithRole('nurse');

    expect(fn () => $this->credentialing->conferSpecialty($nurse, Specialty::General, $this->admin))
        ->toThrow(AccountActionNotAllowedException::class, 'not a doctor account');
});

it('treats a board rank with no named board as no certificate at all', function () {
    // Half a record is not a record. hasBoardCertificate() requires both.
    fileCredentials($this->doctor, [
        'board_status' => BoardStatus::Fellow->value,
        'specialty_board' => null,
    ]);

    expect($this->doctor->fresh()->credential->hasBoardCertificate())->toBeFalse();
});

// ── The shape of the numbers themselves ───────────────────────────────────────

/**
 * A PRC registration number is seven digits, and `string|max:40` accepted a
 * name. This one matters beyond tidiness: it is the number the clinic files
 * PhilHealth claims against, so a wrong one surfaces at the claim rather than
 * at the form.
 */
it('refuses a PRC licence number that is not seven digits', function (string $typed) {
    $this->actingAs($this->admin)
        ->put("/admin/staff/{$this->doctor->id}/credentials", [
            'prcLicenseNo' => $typed,
            'prcExpiresOn' => now()->addYear()->toDateString(),
        ])
        ->assertSessionHasErrors('prc_license_no');
})->with([
    'a name' => 'Dr Reyes',
    'too short' => '12345',
    'too long' => '012345678',
    'digits with a dash' => '012-3456',
]);

it('accepts a seven-digit PRC licence number', function () {
    $this->actingAs($this->admin)
        ->put("/admin/staff/{$this->doctor->id}/credentials", [
            'prcLicenseNo' => '0123456',
            'prcExpiresOn' => now()->addYear()->toDateString(),
        ])
        ->assertSessionHasNoErrors();

    expect($this->doctor->fresh()->credential->prc_license_no)->toBe('0123456');
});
