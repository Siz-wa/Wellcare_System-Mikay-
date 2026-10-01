<?php

namespace App\Services;

use App\Models\PatientDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * SC-6 — patient documents encrypted on disk.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §1.3 and §2.4 (E-4). Lab scans, imaging and
 * referrals were written straight to `storage/app/private/patient-documents/`
 * in the clear, which made a routine backup tarball a plaintext archive of the
 * clinic's imaging. The per-request authorization added in SC-2 governs the
 * application path; it does nothing about anyone holding the disk.
 *
 * Every upload and every download goes through here, rather than each of the
 * five controllers calling Storage directly as they used to. That is the point:
 * a controller that wrote its own `$file->store(...)` would produce a plaintext
 * file with an `is_encrypted = true` row beside it, and the resulting download
 * would be garbage that looks like a corrupt scan.
 *
 * ## Whole-file, in memory, and why that is acceptable here
 *
 * `Crypt` is not a streaming cipher, so a document is encrypted and decrypted in
 * one piece. Uploads are capped at 20 MB by the controllers' validation rules,
 * and the base64 layer inside Laravel's envelope inflates that to roughly 27 MB
 * of peak memory per request.
 *
 * That is a real constraint rather than a hidden one: if the upload cap is ever
 * raised, `memory_limit` has to move with it, and past a certain size this
 * design has to be replaced with envelope encryption over a streamed body.
 * A clinic exchanging occasional PDFs and JPEGs is comfortably inside it.
 *
 * ## Mixed state is expected, not exceptional
 *
 * Files predating this class are plaintext and their rows carry
 * `is_encrypted = false`. `stream()` honours the flag per document, so both
 * kinds serve correctly while `wellcare:documents:encrypt` works through the
 * backlog.
 */
class PatientDocumentStorage
{
    public const DISK = 'local';

    /**
     * Store an uploaded file encrypted, returning its storage path.
     *
     * The path keeps the same shape the controllers used before
     * (`patient-documents/{patientId}/{hash}.{ext}`) so nothing that reasons
     * about the directory layout has to change.
     */
    public function store(UploadedFile $file, int $patientId): string
    {
        $path = sprintf(
            'patient-documents/%d/%s.%s',
            $patientId,
            bin2hex(random_bytes(20)),
            $file->getClientOriginalExtension() ?: 'bin',
        );

        Storage::disk(self::DISK)->put($path, Crypt::encryptString($file->get()));

        return $path;
    }

    /**
     * Send a document to the browser as a download.
     *
     * Returns null when the file is missing from disk, so callers keep their
     * existing `abort(404)` rather than this class deciding how to fail.
     */
    public function download(PatientDocument $document): ?StreamedResponse
    {
        $disk = Storage::disk(self::DISK);

        if (! $disk->exists($document->file_path)) {
            return null;
        }

        // A pre-SC-6 file: still plaintext on disk, so hand it over untouched.
        // Decrypting it would fail, and "helpfully" falling back after a failed
        // decrypt would mean a genuinely corrupt file gets served as if fine.
        if (! $document->is_encrypted) {
            return $disk->download($document->file_path, $document->file_name);
        }

        $contents = Crypt::decryptString($disk->get($document->file_path));

        return response()->streamDownload(
            fn () => print ($contents),
            $document->file_name,
            [
                'Content-Type' => $document->mime_type ?: 'application/octet-stream',
                'Content-Length' => (string) strlen($contents),
            ],
        );
    }

    public function delete(PatientDocument $document): void
    {
        Storage::disk(self::DISK)->delete($document->file_path);
    }
}
