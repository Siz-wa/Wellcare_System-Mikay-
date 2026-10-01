<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SC-6 — encrypted document bodies, and the flag that makes the change safe.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §1.3 and §2.4 (E-4). Uploaded lab scans, imaging
 * and referrals sat in `storage/app/private/patient-documents/` as plaintext
 * files, so a backup tarball was a plaintext archive of the clinic's imaging.
 *
 * ## Why a per-row flag rather than "encrypt everything and assume"
 *
 * Files already on disk are not encrypted. Flipping the download path to always
 * decrypt would break every existing document at once — and break it in the
 * worst way, since the failure surfaces as a corrupt file rather than an error.
 *
 * The flag lets both live at the same time: existing rows stay `false` and
 * stream as they always did, new uploads are written encrypted and marked
 * `true`, and `wellcare:documents:encrypt` migrates the backlog one file at a
 * time, flipping each row only after its file is safely rewritten.
 *
 * Defaulting to FALSE is deliberate and is the safe direction: a row that
 * somehow escapes the backfill is served as-is (correct, if unencrypted),
 * whereas defaulting true would hand the browser ciphertext and call it a PDF.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_documents', function (Blueprint $table) {
            $table->boolean('is_encrypted')->default(false)->after('file_size');
        });
    }

    public function down(): void
    {
        Schema::table('patient_documents', function (Blueprint $table) {
            $table->dropColumn('is_encrypted');
        });
    }
};
