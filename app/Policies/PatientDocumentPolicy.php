<?php

namespace App\Policies;

use App\Models\PatientDocument;
use App\Models\User;

/**
 * SC-2 / QW-2 — the check that was missing entirely on the staff download
 * routes (finding A-2 in WELLCARE-COMPLIANCE-PLAN.md).
 *
 * `Doctor\PatientRecordController::downloadDocument()` and its nurse twin
 * verified only that the file existed on disk. Route-model binding resolves any
 * `{document}` id, so walking
 * `/doctor/patient-records/documents/{1..n}/download` streamed back every lab
 * scan and every piece of imaging in the clinic, one id at a time, with nothing
 * recorded. The patient-facing controller had the correct check all along —
 * this is that check, generalised and applied to the staff side too.
 */
class PatientDocumentPolicy
{
    public function view(User $user, PatientDocument $document): bool
    {
        if ($this->isGuarantorOf($user, $document)) {
            return true;
        }

        // A document with no patient is unreachable by anyone. These exist only
        // as pre-migration rows keyed on the old `user_id` shape; a file nobody
        // can attribute to a patient is a file nobody should be streaming.
        if ($document->patient_id === null) {
            return false;
        }

        return $user->hasAnyRole(['doctor', 'nurse']);
    }

    /**
     * Removing a document is narrower than reading one.
     *
     * The uploader may withdraw what they attached; otherwise it takes a doctor.
     * A nurse mis-filing a scan can undo it, but cannot clear another
     * clinician's attachments off a chart.
     */
    public function delete(User $user, PatientDocument $document): bool
    {
        if ($document->uploaded_by !== null && $document->uploaded_by === $user->id) {
            return true;
        }

        return $user->hasRole('doctor');
    }

    private function isGuarantorOf(User $user, PatientDocument $document): bool
    {
        $document->loadMissing('patient');

        return $document->patient !== null
            && $document->patient->guarantor_id === $user->id;
    }
}
