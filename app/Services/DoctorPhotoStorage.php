<?php

namespace App\Services;

use App\Models\DoctorProfile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Where a doctor's photograph lives, and who is allowed to see it.
 *
 * ## Why the private disk, and not `public/storage`
 *
 * The obvious implementation is the `public` disk plus `storage:link`, and it
 * is the wrong one here. A file under a symlinked public directory is served by
 * the web server with no application code in the path, so it stays readable by
 * anyone holding the URL after the doctor withdraws consent, after an
 * administrator suspends them, and after their PRC licence lapses. Publication
 * of a likeness is revocable (see the photo_consent_at note on the
 * add_public_profile_to_doctor_profiles migration), which means every read has
 * to pass a check — so every read goes through a controller, exactly as patient
 * documents do.
 *
 * The cost is one PHP request per photograph. At a roster of a few dozen
 * doctors on a clinic site that is nothing, and the response carries a long
 * `Cache-Control` so a browser re-fetches rarely.
 *
 * ## Why these are NOT encrypted, when patient documents are
 *
 * PatientDocumentStorage encrypts because a lab scan is health information
 * about a patient and a backup tarball should not be a plaintext archive of the
 * clinic's imaging. A staff headshot published on the clinic's own doctors page
 * is the opposite: it is intended to be seen. Encrypting it would buy nothing
 * and cost a decrypt on every avatar in the directory.
 */
class DoctorPhotoStorage
{
    public const DISK = 'local';

    /** Accepted upload types. Kept here so the validator and the streamer agree. */
    public const MIME_TYPES = ['jpg', 'jpeg', 'png', 'webp'];

    /**
     * What the clinic would like to accept, in kilobytes.
     *
     * 12 MB, because a photo straight off a phone is routinely 4–10 MB and the
     * first cap here (4 MB) rejected ordinary pictures for no clinical reason.
     * The file is stored as uploaded — there is no resize pipeline — so this is
     * also the most disk a single headshot can occupy.
     *
     * Read maxKilobytes() rather than this constant. What PHP will accept is
     * the real ceiling, and it is usually lower.
     */
    public const PREFERRED_MAX_KILOBYTES = 12288;

    /** Shortest accepted edge, in pixels. Rejects thumbnails and favicons. */
    public const MIN_EDGE_PIXELS = 150;

    /**
     * The largest upload this installation can actually take, in kilobytes.
     *
     * The clinic's preference, clamped by PHP's own two limits. This is not
     * defensive tidiness — it is the difference between two error messages:
     *
     *   • Under this number, an oversized file fails Laravel's `max` rule and
     *     the doctor is told the size limit in plain words.
     *   • Over it, PHP discards the upload before any rule runs and the only
     *     thing left to say is that the server refused it. That is the failure
     *     that cost a whole session to diagnose on 2026-09-10, and a cap set
     *     above `upload_max_filesize` would manufacture it on purpose.
     *
     * So the number the validator enforces and the number the UI promises are
     * both derived from here, and on a host with a stock 2 MB
     * `upload_max_filesize` they honestly say 2 MB rather than promising 12.
     *
     * `post_max_size` bounds the whole request, not just the file, so it is
     * included too — a file exactly at that size still cannot fit inside a
     * multipart body with headers and a CSRF token beside it.
     */
    public static function maxKilobytes(): int
    {
        $limits = array_filter([
            self::PREFERRED_MAX_KILOBYTES,
            self::iniKilobytes('upload_max_filesize'),
            self::iniKilobytes('post_max_size'),
        ]);

        return (int) min($limits);
    }

    /** The same figure as a label for the UI — "12 MB", "2 MB", "512 KB". */
    public static function maxLabel(): string
    {
        $kilobytes = self::maxKilobytes();

        return $kilobytes >= 1024
            ? round($kilobytes / 1024, $kilobytes % 1024 === 0 ? 0 : 1).' MB'
            : $kilobytes.' KB';
    }

    /**
     * One php.ini size directive in kilobytes, or null when it is unlimited.
     *
     * These are shorthand values ("24M", "128M", "512K"), which is why this
     * cannot just be cast to an int: `(int) '24M'` is 24. A value of 0 means no
     * limit, and returning null for it drops the entry from the min() above
     * rather than clamping every upload to zero.
     */
    private static function iniKilobytes(string $directive): ?int
    {
        $value = trim((string) ini_get($directive));

        if ($value === '' || $value === '0') {
            return null;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        $bytes = match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };

        return (int) floor($bytes / 1024);
    }

    /**
     * Replace this doctor's photograph, returning the stored path.
     *
     * The previous file is deleted rather than orphaned: a doctor who re-uploads
     * four times should not leave four copies of their face on the clinic's
     * disk with nothing pointing at them.
     */
    public function store(UploadedFile $file, DoctorProfile $profile): string
    {
        $this->deleteFile($profile->photo_path);

        $path = sprintf(
            'doctor-photos/%d/%s.%s',
            $profile->user_id,
            bin2hex(random_bytes(20)),
            strtolower($file->getClientOriginalExtension() ?: 'jpg'),
        );

        Storage::disk(self::DISK)->put($path, $file->get());

        return $path;
    }

    /**
     * Remove the file and forget the path.
     *
     * Deliberately clears `photo_consent_at` too. Consent was given to publish
     * a specific likeness; keeping the timestamp alive across a deletion would
     * mean the next upload was published the moment it landed, without anybody
     * agreeing to that one.
     */
    public function remove(DoctorProfile $profile): void
    {
        $this->deleteFile($profile->photo_path);

        $profile->update([
            'photo_path' => null,
            'photo_consent_at' => null,
        ]);
    }

    /**
     * Stream a photograph to the browser.
     *
     * Returns null when the row points at a file that is not on disk, so the
     * caller keeps its own 404 rather than this class deciding how to fail —
     * the same contract PatientDocumentStorage::download() uses.
     */
    public function stream(DoctorProfile $profile): ?StreamedResponse
    {
        $disk = Storage::disk(self::DISK);
        $path = (string) $profile->photo_path;

        if ($path === '' || ! $disk->exists($path)) {
            return null;
        }

        return $disk->response($path, null, [
            'Content-Type' => $disk->mimeType($path) ?: 'image/jpeg',
            // Long, and private to the one browser that fetched it. Safe to
            // be this long only because every photo URL carries a `?v=` token
            // derived from the stored file (DoctorProfile::photoVersion), so a
            // replacement is a different URL and nothing has to expire for it
            // to appear. `private` keeps a shared cache from holding a copy
            // that outlives a withdrawal of consent.
            'Cache-Control' => 'private, max-age=86400',
            // A headshot rendered in an <img>, never a download prompt.
            'Content-Disposition' => 'inline',
        ]);
    }

    private function deleteFile(?string $path): void
    {
        if (filled($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }
}
