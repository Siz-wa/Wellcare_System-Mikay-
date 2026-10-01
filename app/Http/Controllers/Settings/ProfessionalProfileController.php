<?php

namespace App\Http\Controllers\Settings;

use App\Enums\Specialty;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfessionalProfileUpdateRequest;
use App\Http\Resources\DoctorResource;
use App\Models\DoctorProfile;
use App\Models\StaffCredential;
use App\Models\User;
use App\Services\DoctorPhotoStorage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The doctor's own professional profile — the page that did not exist.
 *
 * `/doctor/settings` redirects to `/settings/profile`, which is a patient's
 * form: first name, civil status, birthdate, company. A doctor opening their
 * settings saw nothing about their practice and nothing about the credentials
 * the clinic holds on them — not their PRC registration, not its expiry date,
 * not whether an administrator had verified it, not even whether they were
 * currently published to patients. The credentialing module recorded all of it
 * and showed the subject of the record none of it.
 *
 * ## The split this class enforces
 *
 * Two things live on a doctor's roster entry and they have different owners:
 *
 *   • CONFERRED — display name, specialty, publication, and every credential.
 *     An administrator decides these through CredentialingService, which is
 *     their only writer. Here they are strictly read-only: rendered, explained,
 *     never accepted back. A doctor who could type their own specialty would
 *     defeat the module that exists to stop exactly that.
 *
 *   • THE DOCTOR'S OWN — photograph, practice statement, languages, the year
 *     they began. Nobody else can supply these, and none of them is a claim of
 *     privilege.
 *
 * ProfessionalProfileUpdateRequest is the boundary: the conferred fields are
 * absent from its rules, so they cannot arrive through mass assignment even if
 * a form posts them.
 */
class ProfessionalProfileController extends Controller
{
    public function __construct(private DoctorPhotoStorage $photos) {}

    public function edit(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $profile = $this->profileFor($user);
        $profile->load(['user', 'availabilityBlocks', 'credential.verifier.profile']);

        return Inertia::render('settings/professional/index', [
            'profile' => [
                'displayName' => $profile->display_name,
                'specialty' => $profile->specialty,
                'specialtyLabel' => Specialty::tryFrom($profile->specialty)?->label()
                    ?? $profile->specialty,
                'specialization' => $profile->specialization,
                'bio' => $profile->bio ?? '',
                'languages' => $profile->languages ?? '',
                'practisingSince' => $profile->practising_since,
                'isPublished' => $profile->is_active,
                'hasPhoto' => filled($profile->photo_path),
                'publishPhoto' => $profile->photo_consent_at !== null,
                // Bypasses hasPublishablePhoto() on purpose: this is the doctor
                // looking at their own uploaded file, which they must be able
                // to see in order to decide whether to publish it.
                'photoUrl' => filled($profile->photo_path)
                    ? route('settings.professional.photo', ['v' => $profile->photoVersion()])
                    : null,
                'publicUrl' => route('doctors.show', ['doctor' => $profile->user_id]),
            ],
            // Sent rather than written into the copy, because the real ceiling
            // is whatever PHP on this host allows — the hint a doctor reads and
            // the rule that refuses their file have to be the same number.
            'photoLimits' => [
                'maxLabel' => DoctorPhotoStorage::maxLabel(),
                'minEdge' => DoctorPhotoStorage::MIN_EDGE_PIXELS,
                'types' => 'JPG, PNG or WebP',
            ],
            // The doctor's own credentialing file, in full — including the PTR
            // and S2 numbers that never reach a patient. This is their own
            // professional data, and the expiry dates are the half they are
            // expected to act on: a lapsed PRC unpublishes them automatically
            // (credentials:sweep), and until now nothing told them it was
            // coming.
            'credential' => $this->mapCredential($profile->credential),
            // Exactly what a patient sees, rendered from the same resource the
            // public page uses. A preview assembled independently would be a
            // second definition of "published", and the two would drift.
            'publicPreview' => (new DoctorResource($profile))->resolve(),
            'bioMaxLength' => DoctorProfile::BIO_MAX_LENGTH,
        ]);
    }

    public function update(ProfessionalProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $profile = $this->profileFor($request->user());

        $publishPhoto = $request->boolean('publish_photo');

        $profile->update([
            'bio' => $validated['bio'] ?? null,
            'languages' => $validated['languages'] ?? null,
            'practising_since' => $validated['practising_since'] ?? null,
            // Consent is a moment, not a flag: the timestamp is what a later
            // question about "when did this doctor agree to this" is answered
            // with. Re-ticking an already-granted box must not move it, or the
            // record says the doctor consented on the day they last edited
            // their languages.
            'photo_consent_at' => $publishPhoto
                ? ($profile->photo_consent_at ?? now())
                : null,
        ]);

        return back()->with('success', 'Your professional profile has been updated.');
    }

    /**
     * Upload or replace the photograph.
     *
     * Uploading is not publishing. The file is stored and shown back to the
     * doctor, but `photo_consent_at` is untouched — the tick-box on the form is
     * where the decision to show it to patients is made and withdrawn.
     */
    public function updatePhoto(Request $request): RedirectResponse
    {
        /*
         * Name the environment failure before validation gets the chance to
         * blame the doctor's file.
         *
         * When the server has no writable temporary directory, PHP discards the
         * upload before any of this code runs — so the `uploaded` rule fires and
         * every photo is refused, whatever the doctor chooses. The generic
         * message that produces sends them off shrinking pictures against a
         * problem that no picture can solve; it was reported here twice on
         * 2026-09-10 as "it's just rejecting everything".
         *
         * This is the exact signal for it. `sys_get_temp_dir()` falls back to
         * the Windows directory when TMP and TEMP are missing from the
         * environment, and that directory is not writable by a normal account —
         * so an unwritable temp dir IS the diagnosis, and it can be stated
         * instead of guessed at.
         *
         * The fix is in AppServiceProvider::allowServeSubprocessUploads(), and
         * it only reaches a running dev server when that server is restarted —
         * which is what the message says, because otherwise the code is correct,
         * the page still refuses every upload, and nothing on screen explains
         * why.
         */
        $temp = sys_get_temp_dir();

        if (! is_writable($temp)) {
            return back()->withErrors([
                'photo' => "This server has no writable temporary folder ({$temp}), so PHP "
                    .'discards every upload before the application sees it. No photo will '
                    .'work until that is fixed. If you are running `composer dev`, stop it '
                    .'and start it again — the fix that passes TMP and TEMP to the server '
                    .'only applies when it restarts.',
            ]);
        }

        $request->validate([
            'photo' => [
                'required',
                'image',
                'mimes:'.implode(',', DoctorPhotoStorage::MIME_TYPES),
                // Never a hardcoded number: it is the clinic's preferred cap
                // clamped by what PHP will actually take, so this rule can
                // never promise more than the server can accept. See
                // DoctorPhotoStorage::maxKilobytes().
                'max:'.DoctorPhotoStorage::maxKilobytes(),
                // Rejects thumbnails and favicons, and nothing else. A
                // 40-pixel image published as a headshot looks like a broken
                // page rather than a doctor.
                'dimensions:min_width='.DoctorPhotoStorage::MIN_EDGE_PIXELS
                    .',min_height='.DoctorPhotoStorage::MIN_EDGE_PIXELS,
            ],
        ], [
            'photo.dimensions' => 'Use a photo at least '
                .DoctorPhotoStorage::MIN_EDGE_PIXELS.' by '
                .DoctorPhotoStorage::MIN_EDGE_PIXELS.' pixels.',
            'photo.max' => 'Photos must be '.DoctorPhotoStorage::maxLabel().' or smaller.',
            /*
             * The `uploaded` rule fires when PHP itself refused the file, so
             * this never means "your photo is wrong" — by the time validation
             * runs the upload is already gone and `max` never even sees it.
             * Laravel's default wording ("The photo failed to upload.") sends
             * the doctor off to try smaller and smaller files against a problem
             * that is not theirs.
             *
             * Two real causes, and the message names both: a file over PHP's
             * own `upload_max_filesize`, or no writable temporary directory —
             * which is what `artisan serve` on Windows produced until
             * AppServiceProvider::allowServeSubprocessUploads() passed TMP and
             * TEMP through to the subprocess.
             */
            'photo.uploaded' => 'The server refused the upload before it could be checked. '
                .'That usually means the file is larger than this server accepts, or the '
                .'server has no writable temporary folder. Try a smaller photo, and if it '
                .'keeps happening this is a server problem rather than your file.',
        ]);

        $profile = $this->profileFor($request->user());

        $profile->update([
            'photo_path' => $this->photos->store($request->file('photo'), $profile),
        ]);

        return back()->with('success', 'Photo uploaded. Tick "Show my photo to patients" to publish it.');
    }

    /** Delete the file and, with it, the consent to publish it. */
    public function destroyPhoto(Request $request): RedirectResponse
    {
        $this->photos->remove($this->profileFor($request->user()));

        return back()->with('success', 'Your photo has been removed.');
    }

    /**
     * The doctor's own photograph, published or not.
     *
     * Separate from the public route because the two answer different
     * questions. GenController::doctorPhoto asks "may a patient see this?";
     * this one asks "is this the file you uploaded?", and the answer has to be
     * yes while the doctor is still deciding whether to publish it.
     */
    public function photo(Request $request): StreamedResponse
    {
        $stream = $this->photos->stream($this->profileFor($request->user()));

        abort_if($stream === null, 404);

        return $stream;
    }

    /**
     * This doctor's roster entry, created if the account somehow has none.
     *
     * StaffAccountService writes one in the same transaction as every doctor
     * account, so in practice it exists. The fallback covers accounts that
     * predate that guarantee, and it is deliberately UNPUBLISHED with the
     * clinic's default specialty: manufacturing a profile must never
     * manufacture a privilege. An administrator confers the real specialty and
     * publishes it after seeing the PRC registration.
     */
    private function profileFor(User $user): DoctorProfile
    {
        return DoctorProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'display_name' => trim($user->name) !== '' ? 'Dr. '.$user->name : $user->email,
                'specialty' => Specialty::General->value,
                'is_active' => false,
            ],
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function mapCredential(?StaffCredential $credential): ?array
    {
        if ($credential === null) {
            return null;
        }

        return [
            'status' => $credential->status->value,
            'statusLabel' => $credential->status->label(),
            'statusTone' => $credential->status->tone(),
            'prcLicenseNo' => $credential->prc_license_no,
            'prcExpiresOn' => $credential->prc_expires_on?->format('d M Y'),
            'ptrNo' => $credential->ptr_no,
            'ptrIssuedAtLgu' => $credential->ptr_issued_at_lgu,
            'ptrExpiresOn' => $credential->ptr_expires_on?->format('d M Y'),
            'philhealthAccreditationNo' => $credential->philhealth_accreditation_no,
            's2LicenseNo' => $credential->s2_license_no,
            'specialtyBoard' => $credential->specialty_board,
            'boardStatusLabel' => $credential->board_status->label(),
            'medicalCertificateOn' => $credential->medical_certificate_on?->format('d M Y'),
            'verifiedBy' => $credential->verifier?->name,
            'verifiedAt' => $credential->verified_at?->format('d M Y'),
            'daysUntilExpiry' => $credential->daysUntilExpiry(),
            'hasLapsed' => $credential->hasLapsed(),
            'remarks' => $credential->remarks,
        ];
    }
}
