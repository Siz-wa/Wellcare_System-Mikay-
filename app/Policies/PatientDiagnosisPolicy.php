<?php

namespace App\Policies;

use App\Models\PatientDiagnosis;
use App\Models\User;

/**
 * SC-2 / QW-2 — finding A-3 in WELLCARE-COMPLIANCE-PLAN.md.
 *
 * `updateDiagnosis()` and `destroyDiagnosis()` took a route-bound
 * PatientDiagnosis and applied no check of any kind beyond `role:doctor`, so
 * any doctor could amend or delete any diagnosis on any patient in the clinic
 * by id — and, until QW-3, leave no audit trail of having done it.
 */
class PatientDiagnosisPolicy
{
    /**
     * Amend or withdraw a diagnosis.
     *
     * The author may always correct their own work. Another doctor may act only
     * where they have a care relationship with the patient — which is what
     * makes taking over a colleague's list possible without also making every
     * chart in the clinic writable from a guessed id.
     *
     * This is stricter than `PatientPolicy::view()`, and deliberately so:
     * reading the wrong chart is a disclosure, but silently deleting someone
     * else's clinical finding changes what the next clinician believes about a
     * patient. Break-glass is a defensible answer for a read and not for a
     * destructive write.
     */
    public function update(User $user, PatientDiagnosis $diagnosis): bool
    {
        if (! $user->hasRole('doctor')) {
            return false;
        }

        if ($diagnosis->recorded_by !== null && $diagnosis->recorded_by === $user->id) {
            return true;
        }

        $diagnosis->loadMissing('patient');

        return $diagnosis->patient !== null
            && $diagnosis->patient->isUnderCareOf($user);
    }

    public function delete(User $user, PatientDiagnosis $diagnosis): bool
    {
        return $this->update($user, $diagnosis);
    }
}
