<?php

namespace App\Console\Commands;

use App\Models\PatientDocument;
use App\Services\PatientDocumentStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

/**
 * SC-6 backfill — encrypt the documents that were uploaded before it landed.
 *
 * New uploads go through PatientDocumentStorage and are encrypted on the way
 * in. Everything already on disk is plaintext, and this is what moves it.
 *
 * ## Order of operations, which is the whole safety argument
 *
 * For each document: read, encrypt, write, verify the round trip, and only then
 * flip `is_encrypted`. The flag is what the download path trusts, so it must
 * never say "encrypted" about a file that is not — that failure serves
 * ciphertext to a browser as a PDF, and it presents as a corrupt scan rather
 * than as an error anyone can act on.
 *
 * Verifying before flipping is not belt-and-braces; it is the step that makes
 * the operation safe to run against real records. A file that fails to verify
 * is left exactly as it was, with its flag untouched, and reported.
 *
 * Re-runnable: rows already marked encrypted are skipped, so an interrupted run
 * simply continues.
 */
class EncryptPatientDocuments extends Command
{
    protected $signature = 'wellcare:documents:encrypt {--dry-run : Report what would be encrypted and stop}';

    protected $description = 'Encrypt patient document files that predate SC-6 encrypted storage';

    public function handle(PatientDocumentStorage $storage): int
    {
        $pending = PatientDocument::withTrashed()->where('is_encrypted', false)->get();

        if ($pending->isEmpty()) {
            $this->info('Every patient document is already encrypted at rest.');

            return self::SUCCESS;
        }

        $this->info("{$pending->count()} document(s) are still stored in plaintext.");

        if ($this->option('dry-run')) {
            $this->table(
                ['ID', 'Patient', 'File'],
                $pending->map(fn (PatientDocument $d) => [$d->id, $d->patient_id, $d->file_name])->all(),
            );
            $this->comment('Dry run — nothing was changed.');

            return self::SUCCESS;
        }

        $disk = Storage::disk(PatientDocumentStorage::DISK);
        $encrypted = 0;
        $skipped = 0;

        foreach ($pending as $document) {
            if (! $disk->exists($document->file_path)) {
                $this->warn("Skipped #{$document->id}: file missing from disk ({$document->file_path}).");
                $skipped++;

                continue;
            }

            $plaintext = $disk->get($document->file_path);
            $ciphertext = Crypt::encryptString($plaintext);

            $disk->put($document->file_path, $ciphertext);

            // Read back and compare before trusting the write. If this fails the
            // flag stays false, so the document keeps serving as plaintext
            // rather than becoming unreadable.
            if (Crypt::decryptString($disk->get($document->file_path)) !== $plaintext) {
                $disk->put($document->file_path, $plaintext);
                $this->error("Failed #{$document->id}: round trip did not verify. File restored, flag unchanged.");
                $skipped++;

                continue;
            }

            $document->forceFill(['is_encrypted' => true])->saveQuietly();
            $encrypted++;
        }

        $this->newLine();
        $this->info("Encrypted {$encrypted} document(s)."
            .($skipped > 0 ? " {$skipped} skipped — see above." : ''));

        return $skipped > 0 ? self::FAILURE : self::SUCCESS;
    }
}
