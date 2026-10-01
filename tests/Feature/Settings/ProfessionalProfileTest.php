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
 * The doctor's own professional profile.
 *
 * Two boundaries are under test, and they pull in opposite directions:
 *
 *   • The doctor SEES everything the clinic holds on them, PTR and S2 numbers
 *     included. It is their own professional data, and the expiry dates are the
 *     half they have to act on — a lapsed PRC unpublishes them automatically.
 *
 *   • The doctor CHANGES almost none of it. Specialty, display name and
 *     publication are conferred by an administrator through
 *     CredentialingService; a doctor who could type their own specialty would
 *     defeat the module that exists to prevent exactly that.
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

// ── Access ────────────────────────────────────────────────────────────────────

it('is reachable by a doctor', function () {
    $this->actingAs($this->doctor)
        ->get('/settings/professional')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/professional/index')
            ->where('profile.displayName', 'Dr. Maria Santos')
            ->where('profile.specialtyLabel', 'Pediatrics')
        );
});

it('is closed to every other role', function (string $role) {
    $this->actingAs(userWithRole($role))
        ->get('/settings/professional')
        ->assertForbidden();
})->with(['user', 'nurse', 'hr', 'admin']);

// ── What the doctor sees ──────────────────────────────────────────────────────

it('shows the doctor their own full credentialing file', function () {
    StaffCredential::create([
        'user_id' => $this->doctor->id,
        'prc_license_no' => '0123456',
        'prc_expires_on' => now()->addYear(),
        'ptr_no' => 'PTR-2026-0001',
        's2_license_no' => 'S2-000111',
        'specialty_board' => 'Philippine Pediatric Society',
        'board_status' => BoardStatus::Diplomate,
        'status' => CredentialStatus::Verified,
        'verified_at' => now(),
    ]);

    $this->actingAs($this->doctor)
        ->get('/settings/professional')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('credential.prcLicenseNo', '0123456')
            // Their own PTR and S2 — visible here, never on a public page.
            ->where('credential.ptrNo', 'PTR-2026-0001')
            ->where('credential.s2LicenseNo', 'S2-000111')
            ->where('credential.statusLabel', 'Verified')
        );
});

it('says so plainly when no credentialing file exists yet', function () {
    $this->actingAs($this->doctor)
        ->get('/settings/professional')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('credential', null));
});

it('previews exactly what a patient would see', function () {
    $this->actingAs($this->doctor)
        ->get('/settings/professional')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('publicPreview.name', 'Dr. Maria Santos')
            // No verified credential on file, so the preview shows none —
            // the same answer the public page gives.
            ->where('publicPreview.credentials', null)
        );
});

// ── What the doctor may change ────────────────────────────────────────────────

it('saves the practice details the doctor owns', function () {
    $this->actingAs($this->doctor)
        ->patch('/settings/professional', [
            'bio' => 'General paediatric consultations and newborn follow-up.',
            'languages' => 'Filipino, English',
            'practising_since' => 2015,
        ])
        ->assertSessionHasNoErrors();

    expect($this->profile->fresh())
        ->bio->toBe('General paediatric consultations and newborn follow-up.')
        ->languages->toBe('Filipino, English')
        ->practising_since->toBe(2015);
});

it('refuses a practice statement longer than the cap', function () {
    $this->actingAs($this->doctor)
        ->patch('/settings/professional', [
            'bio' => str_repeat('a', DoctorProfile::BIO_MAX_LENGTH + 1),
        ])
        ->assertSessionHasErrors('bio');
});

it('refuses a year in the future for practising since', function () {
    $this->actingAs($this->doctor)
        ->patch('/settings/professional', [
            'practising_since' => (int) date('Y') + 1,
        ])
        ->assertSessionHasErrors('practising_since');
});

it('ignores conferred fields even when they are posted', function () {
    $this->actingAs($this->doctor)
        ->patch('/settings/professional', [
            'bio' => 'Anything.',
            // Every one of these is an administrator's decision.
            'specialty' => Specialty::Cardiology->value,
            'display_name' => 'Dr. Maria Santos, Cardiologist',
            'specialization' => 'Interventional Cardiology',
            'is_active' => true,
        ])
        ->assertSessionHasNoErrors();

    expect($this->profile->fresh())
        ->specialty->toBe(Specialty::Pediatrics->value)
        ->display_name->toBe('Dr. Maria Santos')
        ->specialization->toBeNull();
});

// ── The photograph ────────────────────────────────────────────────────────────

it('stores an uploaded photo without publishing it', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('headshot.jpg', 400, 400),
        ])
        ->assertSessionHasNoErrors();

    $profile = $this->profile->fresh();

    expect($profile->photo_path)->not->toBeNull()
        // Uploading is not consenting. Nothing is public until the box is
        // ticked and saved.
        ->and($profile->photo_consent_at)->toBeNull()
        ->and($profile->hasPublishablePhoto())->toBeFalse();

    Storage::disk('local')->assertExists($profile->photo_path);
});

it('refuses an image below the minimum size', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('tiny.jpg', 40, 40),
        ])
        ->assertSessionHasErrors('photo');
});

it('refuses a file that is not an image', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->create('scan.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors('photo');
});

it('deletes the previous file when a photo is replaced', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('first.jpg', 400, 400),
        ]);

    $first = $this->profile->fresh()->photo_path;

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('second.jpg', 400, 400),
        ]);

    $second = $this->profile->fresh()->photo_path;

    expect($second)->not->toBe($first);
    Storage::disk('local')->assertMissing($first);
    Storage::disk('local')->assertExists($second);
});

it('publishes the photo only once consent is given, and withdraws it on request', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('headshot.jpg', 400, 400),
        ]);

    $this->actingAs($this->doctor)
        ->patch('/settings/professional', ['publish_photo' => '1']);

    $granted = $this->profile->fresh()->photo_consent_at;

    expect($granted)->not->toBeNull()
        ->and($this->profile->fresh()->hasPublishablePhoto())->toBeTrue();

    // An unticked checkbox posts nothing at all, which is the withdrawal.
    $this->actingAs($this->doctor)
        ->patch('/settings/professional', ['bio' => 'Unchanged.']);

    expect($this->profile->fresh()->photo_consent_at)->toBeNull();
});

it('does not move the consent timestamp on an unrelated save', function () {
    Storage::fake('local');

    $this->profile->update([
        'photo_path' => 'doctor-photos/x/headshot.jpg',
        'photo_consent_at' => now()->subMonths(3),
    ]);

    $granted = $this->profile->fresh()->photo_consent_at;

    $this->actingAs($this->doctor)
        ->patch('/settings/professional', [
            'publish_photo' => '1',
            'languages' => 'Filipino',
        ]);

    // The record has to keep saying when the doctor actually agreed, not when
    // they last edited their languages.
    expect($this->profile->fresh()->photo_consent_at->toDateTimeString())
        ->toBe($granted->toDateTimeString());
});

it('removes the file and the consent together', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('headshot.jpg', 400, 400),
        ]);

    $this->actingAs($this->doctor)
        ->patch('/settings/professional', ['publish_photo' => '1']);

    $path = $this->profile->fresh()->photo_path;

    $this->actingAs($this->doctor)
        ->delete('/settings/professional/photo')
        ->assertSessionHasNoErrors();

    $profile = $this->profile->fresh();

    expect($profile->photo_path)->toBeNull()
        // Consent was given to publish a specific likeness; it must not survive
        // the file and pre-authorise the next upload.
        ->and($profile->photo_consent_at)->toBeNull();

    Storage::disk('local')->assertMissing($path);
});

it('serves the doctor their own photo before it is published', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('headshot.jpg', 400, 400),
        ]);

    // Public route refuses it — no consent yet.
    $this->get("/doctors/{$this->doctor->id}/photo")->assertNotFound();

    // The doctor still has to be able to look at what they uploaded.
    $this->actingAs($this->doctor)
        ->get('/settings/professional/photo')
        ->assertOk();
});

// ── The dashboard header ──────────────────────────────────────────────────────
//
// The photograph reached the public directory, the profile page, the booking
// picker and the settings preview, and stopped there: a doctor who had uploaded
// one still saw their initials in the corner of their own dashboard on every
// page of the app. `auth.user.photo_url` is shared by HandleInertiaRequests, so
// these assert against a real dashboard page rather than the settings form.

it('shares the doctor photo with every page so the dashboard header can show it', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('headshot.jpg', 400, 400),
        ]);

    $version = $this->profile->fresh()->photoVersion();

    // `fresh()`, because the upload above already made this instance load its
    // doctorProfile relation — back when the row had no photo. Every real
    // request resolves the user from the session anew; only a test reuses one
    // model across two of them.
    $this->actingAs($this->doctor->fresh())
        ->get(route('doctor.appointments'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            // The doctor's own route, not the public one: the header is the
            // doctor looking at their own account, and nothing was published
            // here — the upload above never granted consent.
            ->where('auth.user.photo_url', route('settings.professional.photo', ['v' => $version]))
        );
});

it('shares no photo for a doctor who has not uploaded one', function () {
    $this->actingAs($this->doctor)
        ->get(route('doctor.appointments'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('auth.user.photo_url', null));
});

it('shares no photo for a role that cannot have one', function () {
    // The route behind the URL is gated `role:doctor`; handing it to anyone
    // else would render a broken image where initials belong.
    $this->actingAs(userWithRole('user'))
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('auth.user.photo_url', null));
});
