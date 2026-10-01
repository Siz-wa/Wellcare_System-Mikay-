<?php

namespace App\Policies;

use App\Models\Patient;
use App\Models\User;

/**
 * Who may reach a patient's record — SC-2 in WELLCARE-COMPLIANCE-PLAN.md.
 *
 * ## Why this file exists
 *
 * Before it, `app/Policies/` did not exist and `grep -rn "Gate::" app/` returned
 * nothing. Authorization was route middleware (`role:doctor`) plus five
 * hand-rolled private `authorize*()` methods spread across four controllers,
 * each with a slightly different rule, and several endpoints with no check at
 * all. There was no single place that said who may see what, which is finding
 * A-10 — and the reason A-1 and A-3 went unnoticed.
 *
 * The matrix now lives here and is asserted by
 * tests/Feature/Compliance/RecordAccessPolicyTest.php.
 *
 * ## Break-glass, and the line this policy will not cross on its own
 *
 * `view()` admits clinical staff whether or not they have a care relationship
 * with the patient, and `Patient::isUnderCareOf()` explains why at length: a
 * hard denial is a clinical-workflow decision (ND-2), and one that fires on a
 * doctor covering a colleague's list gets switched off within a week.
 *
 * What has changed is that the distinction is now *recorded*. Access without a
 * care relationship writes `record_access_log.had_care_relationship = false`,
 * so out-of-relationship reads are countable, reviewable, and alertable — which
 * is what minimum-necessary actually needs to be enforceable later.
 *
 * To turn break-glass into refusal, change `view()` to return
 * `$patient->isUnderCareOf($user)` and run the policy test — it will tell you
 * exactly which surfaces tighten.
 */
class PatientPolicy
{
    /**
     * Read the clinical record: allergies, diagnoses, documents, visit history.
     */
    public function view(User $user, Patient $patient): bool
    {
        if ($this->isGuarantorOf($user, $patient)) {
            return true;
        }

        // Clinic-wide by default; restricted to the doctor's own patients when
        // the clinic turns on security.records_care_team_only.
        if ($user->hasRole('doctor') && config('security.records_care_team_only')) {
            return $patient->isUnderCareOf($user);
        }

        return $user->hasAnyRole(['doctor', 'nurse']);
    }

    /**
     * Browse the clinic-wide roster.
     *
     * Genuinely clinic-wide and defensible as such: a doctor has to be able to
     * find a walk-in who has never been on their list. The index exposes
     * summaries, not the record — and every visit to it is logged as a
     * `searched` action precisely so that bulk enumeration is visible.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['doctor', 'nurse', 'admin']);
    }

    /**
     * Demographics only — name, contact, address, coverage.
     *
     * `admin` is included because Fig. 3's "Manage Patient" makes an
     * administrator a records clerk. That role's exclusion from *clinical* data
     * is enforced by having no route to it, and by `view()` above.
     */
    public function updateDemographics(User $user, Patient $patient): bool
    {
        if ($this->isGuarantorOf($user, $patient)) {
            return true;
        }

        return $user->hasAnyRole(['nurse', 'admin']);
    }

    /**
     * Author clinical findings against this record.
     *
     * Doctors only. The nurse's exclusion from diagnosis authoring is the
     * capability split documented on Nurse\PatientRecordController and is
     * repeated here rather than left implicit in the absence of a route,
     * because "there is no route" is not an authorization rule.
     */
    public function recordDiagnosis(User $user, Patient $patient): bool
    {
        return $user->hasRole('doctor');
    }

    /**
     * Record an allergy or attach a document. Both clinical roles may.
     */
    public function recordObservation(User $user, Patient $patient): bool
    {
        return $user->hasAnyRole(['doctor', 'nurse']);
    }

    /**
     * The patient portal's own surfaces — "My Records" and "My Patients".
     *
     * Deliberately NOT `view` or `updateDemographics`, even though the guarantor
     * branch of either would pass. Both of those also admit clinical roles, and
     * an account holding both `user` and a staff role — Spatie permits it, and
     * nothing in this application forbids it — could then reach *any* patient
     * through the portal's own routes, sidestepping the invariant
     * Patient\PatientRecordController's docblock states outright.
     *
     * A guarantor-only surface deserves a guarantor-only ability. The
     * `role:user` middleware on those routes is not a substitute: it says which
     * door someone came through, not whose record they are holding.
     */
    public function accessAsGuarantor(User $user, Patient $patient): bool
    {
        return $this->isGuarantorOf($user, $patient);
    }

    /**
     * The guarantor gate the patient portal already enforced, moved here so
     * there is one definition rather than one per controller.
     */
    private function isGuarantorOf(User $user, Patient $patient): bool
    {
        return $patient->guarantor_id !== null
            && $patient->guarantor_id === $user->id;
    }
}
