<?php

use App\Enums\CredentialStatus;
use App\Enums\Specialty;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\StaffCredential;
use App\Services\BookingService;
use App\Services\CredentialingService;
use Carbon\Carbon;

/**
 * The nightly sweep — what makes the expiry dates mean something.
 *
 * A PRC registration is valid for three years and expires on the holder's
 * birthday; a PTR is annual. Practising on a lapsed licence is illegal, so the
 * system withdraws the clearance and stops offering that doctor to patients
 * rather than showing a warning somebody has to notice.
 *
 * The assertion that matters is the last one in each case: not merely that the
 * status column changed, but that the doctor stopped generating bookable slots.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Lapsing',
        'specialty' => Specialty::General->value,
        'is_active' => false,
    ]);

    $this->credentialing = app(CredentialingService::class);

    // A published Monday, so "is this doctor bookable" is a real question.
    AvailabilityBlock::create([
        'doctor_id' => $this->doctor->id,
        'day_of_week' => AvailabilityBlock::isoToStoredDay(1),
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
        'slot_duration_minutes' => 30,
        'is_available' => true,
        'approval_status' => AvailabilityBlock::APPROVAL_PUBLISHED,
    ]);
});

function verifiedCredential($doctor, $admin, array $overrides = []): StaffCredential
{
    $credentialing = app(CredentialingService::class);

    $credentialing->submit($doctor, array_merge([
        'prc_license_no' => '0123456',
        'prc_expires_on' => now()->addYear()->toDateString(),
    ], $overrides));

    $credentialing->verify($doctor, $admin);

    return $doctor->fresh()->credential;
}

function nextMonday(): string
{
    return Carbon::parse('next monday')->toDateString();
}

it('leaves a current credential alone', function () {
    verifiedCredential($this->doctor, $this->admin);

    $withdrawn = $this->credentialing->sweepExpired();

    expect($withdrawn)->toBeEmpty()
        ->and($this->doctor->fresh()->credential->status)->toBe(CredentialStatus::Verified);
});

it('expires a lapsed PRC and stops the doctor generating slots', function () {
    verifiedCredential($this->doctor, $this->admin);

    // Bookable while the licence is current.
    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, nextMonday()))
        ->not->toBeEmpty();

    // The licence lapses overnight. Written directly rather than through the
    // service, because verify() refuses an already-expired date by design.
    $this->doctor->credential->update(['prc_expires_on' => now()->subDay()]);

    $withdrawn = $this->credentialing->sweepExpired();

    $doctor = $this->doctor->fresh();

    expect($withdrawn)->toContain($doctor->name)
        ->and($doctor->credential->status)->toBe(CredentialStatus::Expired)
        ->and($doctor->credential->remarks)->toContain('PRC licence expired')
        ->and($doctor->doctorProfile->is_active)->toBeFalse();

    // The point of the whole exercise: nobody can book them any more, and the
    // 60-second slot cache did not keep them bookable past the sweep.
    expect(app(BookingService::class)->getAvailableSlots($doctor->id, nextMonday()))
        ->toBeEmpty();
});

it('expires a lapsed PTR as well as a lapsed PRC', function () {
    verifiedCredential($this->doctor, $this->admin, [
        'ptr_no' => 'PTR-2026-0001',
        'ptr_expires_on' => now()->addMonth()->toDateString(),
    ]);

    $this->doctor->credential->update(['ptr_expires_on' => now()->subDay()]);

    $this->credentialing->sweepExpired();

    expect($this->doctor->fresh()->credential->status)->toBe(CredentialStatus::Expired)
        ->and($this->doctor->fresh()->credential->remarks)->toContain('PTR expired');
});

it('is safe to run twice in the same day', function () {
    verifiedCredential($this->doctor, $this->admin);
    $this->doctor->credential->update(['prc_expires_on' => now()->subDay()]);

    expect($this->credentialing->sweepExpired())->toHaveCount(1);

    // Already expired, so no longer matched by the lapsed() scope.
    expect($this->credentialing->sweepExpired())->toBeEmpty();
});

it('does not touch a credential that was never verified', function () {
    $this->credentialing->submit($this->doctor, [
        'prc_license_no' => '0123456',
        'prc_expires_on' => now()->subYear()->toDateString(),
    ]);

    // Pending, not verified — there is no clearance to withdraw.
    expect($this->credentialing->sweepExpired())->toBeEmpty()
        ->and($this->doctor->fresh()->credential->status)->toBe(CredentialStatus::Pending);
});

it('runs from the console command', function () {
    verifiedCredential($this->doctor, $this->admin);
    $this->doctor->credential->update(['prc_expires_on' => now()->subDay()]);

    $this->artisan('credentials:sweep')
        ->expectsOutputToContain('Withdrew clearance from 1 staff member(s):')
        ->assertSuccessful();

    expect($this->doctor->fresh()->doctorProfile->is_active)->toBeFalse();
});

it('reports a credential that has not lapsed yet on the renewal watchlist', function () {
    verifiedCredential($this->doctor, $this->admin, [
        'prc_expires_on' => now()->addDays(30)->toDateString(),
    ]);

    $this->artisan('credentials:sweep')
        ->expectsOutputToContain('No lapsed credentials.')
        ->expectsOutputToContain('lapse within')
        ->assertSuccessful();

    // Warned about, but still practising — the warning is the whole value.
    expect($this->doctor->fresh()->doctorProfile->is_active)->toBeTrue()
        ->and(StaffCredential::expiringWithin()->count())->toBe(1);
});

it('reports days remaining until the earliest expiry', function () {
    $credential = verifiedCredential($this->doctor, $this->admin, [
        'prc_expires_on' => now()->addDays(45)->toDateString(),
        'ptr_no' => 'PTR-2026-0001',
        'ptr_expires_on' => now()->addDays(10)->toDateString(),
    ]);

    // The PTR lapses first, so that is the date that matters.
    expect($credential->daysUntilExpiry())->toBe(10);
});
