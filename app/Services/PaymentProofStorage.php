<?php

namespace App\Services;

use App\Models\PaymentVerification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Where a payment screenshot lives, and who is allowed to see it.
 *
 * ## Why this is separate from PatientDocumentStorage
 *
 * A GCash receipt is not a clinical document. Filing it as a PatientDocument
 * would put a billing artefact inside the medical record — it would appear in
 * the patient's documents list beside their lab scans, be carried into every
 * clinical export, and fall under the retention rules written for health
 * information. The two have different owners, different lifetimes and different
 * audiences, so they get different stores.
 *
 * ## Why encrypted, when a doctor's headshot is not
 *
 * The same reasoning PatientDocumentStorage sets out. A payment receipt names a
 * patient, names the clinic, and carries a transaction reference and an amount.
 * A backup tarball should not be a plaintext ledger of who consulted this
 * clinic and what they paid. DoctorPhotoStorage skips encryption because a
 * published headshot is meant to be seen; this is the opposite case.
 *
 * Whole-file, in memory, for the reason given on PatientDocumentStorage:
 * `Crypt` is not a streaming cipher. The 5 MB cap the controller enforces is
 * far below the 20 MB one that class reasons about, and a phone screenshot is
 * a few hundred kilobytes.
 */
class PaymentProofStorage
{
    public const DISK = 'local';

    /**
     * Store an uploaded proof encrypted, returning its storage path.
     *
     * Keyed by appointment rather than by patient: a receipt belongs to one
     * visit, and grouping by patient would put a directory of a family's
     * payment history behind one path prefix.
     */
    public function store(UploadedFile $file, int $appointmentId): string
    {
        $path = sprintf(
            'payment-proofs/%d/%s.%s',
            $appointmentId,
            bin2hex(random_bytes(20)),
            $file->getClientOriginalExtension() ?: 'bin',
        );

        Storage::disk(self::DISK)->put($path, Crypt::encryptString($file->get()));

        return $path;
    }

    /**
     * Stream a proof to the browser.
     *
     * Returns null when the row carries no file or the file is missing from
     * disk, so callers keep their own `abort(404)` rather than this class
     * deciding how to fail — the same contract PatientDocumentStorage uses.
     */
    public function download(PaymentVerification $payment): ?StreamedResponse
    {
        $disk = Storage::disk(self::DISK);

        if ($payment->proof_path === null || ! $disk->exists($payment->proof_path)) {
            return null;
        }

        $contents = Crypt::decryptString($disk->get($payment->proof_path));

        return response()->streamDownload(
            fn () => print ($contents),
            $payment->proof_name ?: 'payment-proof',
            [
                'Content-Type' => $payment->proof_mime ?: 'application/octet-stream',
                'Content-Length' => (string) strlen($contents),
            ],
        );
    }

    /**
     * Drop a superseded proof.
     *
     * Called when a patient re-submits after a rejection: keeping the file they
     * replaced serves nobody and leaves a wrong receipt attached to a record
     * that has since been corrected.
     */
    public function delete(PaymentVerification $payment): void
    {
        if ($payment->proof_path !== null) {
            Storage::disk(self::DISK)->delete($payment->proof_path);
        }
    }
}
