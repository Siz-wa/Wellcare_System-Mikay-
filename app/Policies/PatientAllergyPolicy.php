<?php

namespace App\Policies;

use App\Models\PatientAllergy;
use App\Models\User;

/**
 * SC-2 / QW-2 — finding A-3 in WELLCARE-COMPLIANCE-PLAN.md.
 *
 * `destroyAllergy()` on both the doctor and the nurse controller took a
 * route-bound PatientAllergy and deleted it with no ownership check.
 *
 * Allergies are treated slightly more permissively than diagnoses on purpose.
 * Both clinical roles record them, an allergy is corrected at intake far more
 * often than a diagnosis is, and a stale allergy note is itself a safety
 * problem — so a nurse re-taking a history must be able to fix one without
 * finding the doctor who typed it. The care-relationship requirement still
 * stops it being reachable for an arbitrary id.
 */
class PatientAllergyPolicy
{
    public function delete(User $user, PatientAllergy $allergy): bool
    {
        if (! $user->hasAnyRole(['doctor', 'nurse'])) {
            return false;
        }

        if ($allergy->recorded_by !== null && $allergy->recorded_by === $user->id) {
            return true;
        }

        $allergy->loadMissing('patient');

        return $allergy->patient !== null
            && $allergy->patient->isUnderCareOf($user);
    }
}
