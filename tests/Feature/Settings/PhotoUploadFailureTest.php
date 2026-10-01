<?php

use App\Enums\Specialty;
use App\Models\DoctorProfile;
use App\Services\DoctorPhotoStorage;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * The upload failure that fails at the PHP layer, before any rule runs.
 *
 * Found live on 2026-09-10: every photo upload was refused under `composer dev`
 * on Windows with "The photo failed to upload." — a message that reads like a
 * bad file and was nothing of the kind. `artisan serve` hands the `php -S`
 * child a filtered environment (`ServeCommand::$passthroughVariables`) which
 * does not carry TMP or TEMP, so PHP could not create the upload temp file and
 * discarded `$_FILES` entirely:
 *
 *     PHP Request Startup: File upload error - unable to create a temporary
 *     file in Unknown on line 0
 *
 * A bare `php -S` from the same shell, same php.ini, same file, accepted the
 * identical upload with `error: 0` — which is what identified the environment
 * rather than the endpoint as the cause.
 *
 * ## Why an ordinary upload test cannot catch this
 *
 * `UploadedFile::fake()` sets Symfony's `$test` flag, which is exactly the flag
 * that skips `is_uploaded_file()` — the check that fails here. So every test in
 * ProfessionalProfileTest passed throughout, and always would have. The two
 * tests below attack it from the only two angles a test can reach: the
 * environment list that has to carry the temp directory, and the message the
 * doctor is shown when PHP refuses a file anyway.
 */
beforeEach(function () {
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Upload Test',
        'specialty' => Specialty::General->value,
        'is_active' => true,
    ]);
});

it('passes a temporary directory through to the artisan serve subprocess', function (string $variable) {
    // AppServiceProvider::allowServeSubprocessUploads() runs at boot. Without
    // it the served application cannot accept a file upload anywhere — this is
    // not specific to photos, it is every upload in the app, including patient
    // documents and lab result scans.
    expect(ServeCommand::$passthroughVariables)->toContain($variable);
})->with(['TMP', 'TEMP', 'TMPDIR', 'USERPROFILE']);

it('never advertises a cap larger than PHP will accept', function () {
    $cap = DoctorPhotoStorage::maxKilobytes();

    $phpCeiling = collect(['upload_max_filesize', 'post_max_size'])
        ->map(function (string $directive) {
            $raw = (string) ini_get($directive);
            $number = (float) $raw;

            // Shorthand values — "24M", "128M". A plain cast reads "24M" as 24.
            $bytes = match (strtolower(substr($raw, -1))) {
                'g' => $number * 1024 ** 3,
                'm' => $number * 1024 ** 2,
                'k' => $number * 1024,
                default => $number,
            };

            return (int) floor($bytes / 1024);
        })
        ->filter()
        ->min();

    // The whole point of deriving the cap rather than hardcoding it. Above
    // PHP's own limit an oversized file is discarded before any rule runs, and
    // the doctor gets the opaque "the server refused it" path instead of a
    // plain sentence naming the size.
    expect($cap)->toBeLessThanOrEqual($phpCeiling)
        ->and($cap)->toBeLessThanOrEqual(DoctorPhotoStorage::PREFERRED_MAX_KILOBYTES)
        ->and($cap)->toBeGreaterThan(0);
});

it('states the same size limit in the rule and in the hint the doctor reads', function () {
    $this->actingAs($this->doctor)
        ->get('/settings/professional')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('photoLimits.maxLabel', DoctorPhotoStorage::maxLabel())
            ->where('photoLimits.minEdge', DoctorPhotoStorage::MIN_EDGE_PIXELS)
        );

    // And the rule refuses at that same figure, rather than at a constant that
    // has drifted away from the copy beside it.
    $overCap = UploadedFile::fake()->create(
        'huge.jpg',
        DoctorPhotoStorage::maxKilobytes() + 1,
        'image/jpeg',
    );

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', ['photo' => $overCap])
        ->assertSessionHasErrors('photo');

    expect(session('errors')->first('photo'))
        ->toContain(DoctorPhotoStorage::maxLabel());
});

it('accepts an ordinary phone-sized photo', function () {
    Storage::fake('local');

    // 6 MB at 3000×4000 is a plain picture off a phone, and the first cap here
    // (4 MB) refused it. That rejection had no clinical reason behind it.
    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('phone.jpg', 3000, 4000)->size(6144),
        ])
        ->assertSessionHasNoErrors();

    expect($this->doctor->fresh()->doctorProfile->photo_path)->not->toBeNull();
});

it('tells the doctor a refused upload is not their file', function () {
    Storage::fake('local');

    // A real UploadedFile carrying a PHP upload error code, which is what the
    // browser produced. `fake()` cannot express this — it always reports
    // UPLOAD_ERR_OK.
    $failed = new UploadedFile(
        __FILE__,
        'headshot.jpg',
        'image/jpeg',
        UPLOAD_ERR_INI_SIZE,
        true,
    );

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', ['photo' => $failed])
        ->assertSessionHasErrors('photo');

    $message = session('errors')->first('photo');

    // The wording matters more than usual here. Laravel's default ("The photo
    // failed to upload.") sent the doctor off to try smaller and smaller files
    // against a problem that was not theirs, which is how this went unexplained
    // for a whole session.
    expect($message)
        ->toContain('server')
        ->not->toBe('The photo failed to upload.');
});

it('leaves the stored photo untouched when an upload is refused', function () {
    Storage::fake('local');

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => UploadedFile::fake()->image('good.jpg', 400, 400),
        ]);

    $stored = $this->doctor->fresh()->doctorProfile->photo_path;

    $this->actingAs($this->doctor)
        ->post('/settings/professional/photo', [
            'photo' => new UploadedFile(__FILE__, 'bad.jpg', 'image/jpeg', UPLOAD_ERR_PARTIAL, true),
        ])
        ->assertSessionHasErrors('photo');

    // A refused replacement must not delete the photograph already published.
    expect($this->doctor->fresh()->doctorProfile->photo_path)->toBe($stored);
    Storage::disk('local')->assertExists($stored);
});
