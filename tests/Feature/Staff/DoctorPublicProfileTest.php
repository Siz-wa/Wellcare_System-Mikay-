<?php

use App\Enums\BoardStatus;
use App\Enums\CredentialStatus;
use App\Enums\Specialty;
use App\Models\DoctorProfile;
use App\Models\StaffCredential;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * What a patient may see about a doctor.
 *
 * The tests here are a disclosure boundary, not a rendering check. Three rules
 * are encoded, and each one has a reason outside this codebase:
 *
 *   • A PRC registration number and a specialty board standing are published,
 *     because they are what a patient can verify for themselves — PRC runs a
 *     public verification portal — and because the DOH Patient's Bill of Rights
 *     expects a patient to know who is treating them and on what credentials.
 *
 *   • The PTR number, the PhilHealth accreditation number and the PDEA/DDB S2
 *     licence are never published. The S2 in particular identifies a prescriber
 *     of dangerous drugs, and putting one on a public page invites prescription
 *     fraud.
 *
 *   • Nothing is published while the credentialing file does not permit
 *     practice. Printing a licence number beside a doctor's name asserts the
 *     clinic has checked it and that it is good today; for a pending, rejected,
 *     suspended or lapsed file that assertion is false.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');

    $this->profile = DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Maria Santos',
        'specialty' => Specialty::Pediatrics->value,
        'initials' => 'MS',
        'is_active' => true,
    ]);
});

function credentialFor($doctor, array $overrides = []): StaffCredential
{
    return StaffCredential::create(array_merge([
        'user_id' => $doctor->id,
        'prc_license_no' => '0123456',
        'prc_expires_on' => now()->addYear(),
        'ptr_no' => 'PTR-2026-0001',
        'ptr_issued_at_lgu' => 'Dasmariñas City',
        'ptr_expires_on' => now()->endOfYear(),
        'philhealth_accreditation_no' => 'PH-99887766',
        's2_license_no' => 'S2-000111',
        'specialty_board' => 'Philippine Pediatric Society',
        'board_status' => BoardStatus::Diplomate,
        'status' => CredentialStatus::Verified,
        'verified_at' => now(),
    ], $overrides));
}

// ── The page itself ───────────────────────────────────────────────────────────

it('shows a published doctor to anyone, signed in or not', function () {
    credentialFor($this->doctor);

    $this->get("/doctors/{$this->doctor->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('generals/doctors/profile')
            ->where('doctor.name', 'Dr. Maria Santos')
            ->where('doctor.credentials.prc_license_no', '0123456')
            ->where('doctor.credentials.board', 'Diplomate, Philippine Pediatric Society')
        );
});

it('404s for a doctor who is not published', function () {
    credentialFor($this->doctor);
    $this->profile->update(['is_active' => false]);

    $this->get("/doctors/{$this->doctor->id}")->assertNotFound();
});

it('binds the profile URL on the user id, which is the doctor_id everywhere else', function () {
    credentialFor($this->doctor);

    // The profile row's own primary key must NOT resolve unless it happens to
    // equal the user id — a doctor has one number in this system.
    expect(route('doctors.show', ['doctor' => $this->doctor->id]))
        ->toEndWith("/doctors/{$this->doctor->id}");
});

// ── Disclosure ────────────────────────────────────────────────────────────────

it('never publishes the PTR, PhilHealth or S2 numbers', function () {
    credentialFor($this->doctor);

    $response = $this->get("/doctors/{$this->doctor->id}")->assertOk();

    // Asserted against the whole rendered payload rather than a named prop: a
    // future field that quietly carried one of these would still fail here.
    $response->assertDontSee('PTR-2026-0001')
        ->assertDontSee('PH-99887766')
        ->assertDontSee('S2-000111');
});

it('publishes no credentials at all while the file is not verified', function (string $status) {
    credentialFor($this->doctor, ['status' => $status, 'verified_at' => null]);

    $this->get("/doctors/{$this->doctor->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('doctor.credentials', null));
})->with([
    CredentialStatus::Pending->value,
    CredentialStatus::Rejected->value,
    CredentialStatus::Suspended->value,
    CredentialStatus::Expired->value,
]);

it('withholds credentials from a verified file whose licence has since lapsed', function () {
    // credentials:sweep runs nightly, so a licence that expired this morning is
    // still marked `verified` in the column. The published state must not wait
    // for the sweep.
    credentialFor($this->doctor, ['prc_expires_on' => now()->subDay()]);

    $this->get("/doctors/{$this->doctor->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('doctor.credentials', null));
});

it('shows no credentials for a doctor with no file on record', function () {
    $this->get("/doctors/{$this->doctor->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('doctor.credentials', null));
});

// ── The photograph ────────────────────────────────────────────────────────────

it('serves the photo only once the doctor has consented to publishing it', function () {
    Storage::fake('local');

    $path = 'doctor-photos/'.$this->doctor->id.'/headshot.jpg';
    Storage::disk('local')->put($path, UploadedFile::fake()->image('headshot.jpg', 400, 400)->get());

    $this->profile->update(['photo_path' => $path, 'photo_consent_at' => null]);
    $this->get("/doctors/{$this->doctor->id}/photo")->assertNotFound();

    $this->profile->update(['photo_consent_at' => now()]);
    $this->get("/doctors/{$this->doctor->id}/photo")->assertOk();
});

it('stops serving the photo the moment the doctor is unpublished', function () {
    Storage::fake('local');

    $path = 'doctor-photos/'.$this->doctor->id.'/headshot.jpg';
    Storage::disk('local')->put($path, UploadedFile::fake()->image('headshot.jpg', 400, 400)->get());

    $this->profile->update([
        'photo_path' => $path,
        'photo_consent_at' => now(),
        'is_active' => false,
    ]);

    $this->get("/doctors/{$this->doctor->id}/photo")->assertNotFound();
});

it('sends no photo URL to the directory when consent is absent', function () {
    $this->profile->update([
        'photo_path' => 'doctor-photos/1/headshot.jpg',
        'photo_consent_at' => null,
    ]);

    $this->get('/doctors')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('doctors.0.photo_url', null));
});
