<?php

use App\Models\Patient;
use App\Models\PatientDocument;
use App\Services\PatientDocumentStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

/**
 * SC-6 — patient document bodies encrypted on disk.
 *
 * WELLCARE-COMPLIANCE-PLAN.md §1.3 and §2.4 (E-4). Lab scans and imaging were
 * written to `storage/app/private/patient-documents/` in the clear, so a routine
 * backup tarball was a plaintext archive of the clinic's imaging. SC-2's
 * per-request authorization governs the application path and does nothing at all
 * about anyone holding the disk.
 */
beforeEach(function () {
    Storage::fake(PatientDocumentStorage::DISK);

    $this->doctor = userWithRole('doctor');
    $this->guarantor = userWithRole('user');
    $this->patient = Patient::factory()->create(['guarantor_id' => $this->guarantor->id]);
});

test('an uploaded document is unreadable on disk', function () {
    $this->actingAs($this->doctor)->post(
        route('doctor.patient-records.documents.store', $this->patient),
        [
            'title' => 'Chest X-ray',
            'type' => 'imaging',
            'file' => UploadedFile::fake()->createWithContent('xray.pdf', 'SECRET-RADIOLOGY-REPORT'),
        ],
    )->assertRedirect();

    $document = PatientDocument::latest('id')->firstOrFail();
    $raw = Storage::disk(PatientDocumentStorage::DISK)->get($document->file_path);

    expect($document->is_encrypted)->toBeTrue()
        ->and($raw)->not->toContain('SECRET-RADIOLOGY-REPORT')
        // ...and it is genuinely recoverable, not merely mangled.
        ->and(Crypt::decryptString($raw))->toBe('SECRET-RADIOLOGY-REPORT');
});

test('an encrypted document downloads as its original content', function () {
    $this->actingAs($this->doctor)->post(
        route('doctor.patient-records.documents.store', $this->patient),
        [
            'title' => 'Chest X-ray',
            'type' => 'imaging',
            'file' => UploadedFile::fake()->createWithContent('xray.pdf', 'SECRET-RADIOLOGY-REPORT'),
        ],
    );

    $document = PatientDocument::latest('id')->firstOrFail();

    $response = $this->actingAs($this->doctor)
        ->get(route('doctor.patient-records.documents.download', $document->id))
        ->assertOk();

    expect($response->streamedContent())->toBe('SECRET-RADIOLOGY-REPORT');
});

test('the patient portal decrypts the same document for its guarantor', function () {
    $this->actingAs($this->doctor)->post(
        route('doctor.patient-records.documents.store', $this->patient),
        [
            'title' => 'Lab result',
            'type' => 'lab',
            'file' => UploadedFile::fake()->createWithContent('cbc.pdf', 'CBC-VALUES'),
        ],
    );

    $document = PatientDocument::latest('id')->firstOrFail();

    $response = $this->actingAs($this->guarantor)
        ->get(route('user.records.documents.download', $document->id))
        ->assertOk();

    expect($response->streamedContent())->toBe('CBC-VALUES');
});

// ── Mixed state: files that predate SC-6 must keep working ───────────────────

test('a plaintext document uploaded before SC-6 still downloads correctly', function () {
    Storage::disk(PatientDocumentStorage::DISK)
        ->put("patient-documents/{$this->patient->id}/legacy.pdf", 'LEGACY-PLAINTEXT');

    $document = PatientDocument::create([
        'patient_id' => $this->patient->id,
        'user_id' => $this->guarantor->id,
        'uploaded_by' => $this->doctor->id,
        'title' => 'Old scan',
        'type' => 'imaging',
        'file_path' => "patient-documents/{$this->patient->id}/legacy.pdf",
        'file_name' => 'legacy.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 16,
        'is_encrypted' => false,
    ]);

    $response = $this->actingAs($this->doctor)
        ->get(route('doctor.patient-records.documents.download', $document->id))
        ->assertOk();

    // The flag is per-document precisely so both kinds serve correctly while
    // the backfill works through them.
    expect($response->streamedContent())->toBe('LEGACY-PLAINTEXT');
});

test('the backfill encrypts legacy files and flips the flag', function () {
    Storage::disk(PatientDocumentStorage::DISK)
        ->put("patient-documents/{$this->patient->id}/legacy.pdf", 'LEGACY-PLAINTEXT');

    $document = PatientDocument::create([
        'patient_id' => $this->patient->id,
        'user_id' => $this->guarantor->id,
        'uploaded_by' => $this->doctor->id,
        'title' => 'Old scan',
        'type' => 'imaging',
        'file_path' => "patient-documents/{$this->patient->id}/legacy.pdf",
        'file_name' => 'legacy.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 16,
        'is_encrypted' => false,
    ]);

    $this->artisan('wellcare:documents:encrypt')->assertSuccessful();

    $raw = Storage::disk(PatientDocumentStorage::DISK)->get($document->file_path);

    expect($document->fresh()->is_encrypted)->toBeTrue()
        ->and($raw)->not->toContain('LEGACY-PLAINTEXT');

    // And it still downloads as what it was.
    $response = $this->actingAs($this->doctor)
        ->get(route('doctor.patient-records.documents.download', $document->id));

    expect($response->streamedContent())->toBe('LEGACY-PLAINTEXT');
});

test('the backfill refuses to flag a document whose file is missing', function () {
    $document = PatientDocument::create([
        'patient_id' => $this->patient->id,
        'user_id' => $this->guarantor->id,
        'uploaded_by' => $this->doctor->id,
        'title' => 'Ghost',
        'type' => 'other',
        'file_path' => 'patient-documents/999/missing.pdf',
        'file_name' => 'missing.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1,
        'is_encrypted' => false,
    ]);

    // Reports failure rather than quietly marking a row encrypted when there is
    // nothing on disk to have encrypted. A false flag would make the download
    // path try to decrypt a plaintext file later.
    $this->artisan('wellcare:documents:encrypt')->assertFailed();

    expect($document->fresh()->is_encrypted)->toBeFalse();
});

test('the backfill is re-runnable and skips work already done', function () {
    Storage::disk(PatientDocumentStorage::DISK)
        ->put("patient-documents/{$this->patient->id}/legacy.pdf", 'LEGACY-PLAINTEXT');

    PatientDocument::create([
        'patient_id' => $this->patient->id,
        'user_id' => $this->guarantor->id,
        'uploaded_by' => $this->doctor->id,
        'title' => 'Old scan',
        'type' => 'imaging',
        'file_path' => "patient-documents/{$this->patient->id}/legacy.pdf",
        'file_name' => 'legacy.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 16,
        'is_encrypted' => false,
    ]);

    $this->artisan('wellcare:documents:encrypt')->assertSuccessful();

    // Double-encrypting would be unrecoverable, so the second run must be a
    // no-op rather than another pass.
    $this->artisan('wellcare:documents:encrypt')
        ->expectsOutputToContain('already encrypted')
        ->assertSuccessful();

    $document = PatientDocument::latest('id')->firstOrFail();
    $response = $this->actingAs($this->doctor)
        ->get(route('doctor.patient-records.documents.download', $document->id));

    expect($response->streamedContent())->toBe('LEGACY-PLAINTEXT');
});
