<?php

namespace App\Concerns;

use App\Models\Patient;
use App\Models\RecordAccessLog;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Writes the read half of the audit trail — SC-3 in WELLCARE-COMPLIANCE-PLAN.md.
 *
 * Used by every controller that renders or streams a patient's clinical record:
 * the doctor, nurse and patient record screens, the three document download
 * routes, and the two export endpoints.
 *
 * ## Why a concern rather than middleware
 *
 * Middleware sees a route and a request; it does not know *whose* record the
 * response turned out to contain. `patient_id` is the column that makes this
 * table useful — it is what answers "show me everyone who looked at this
 * person's chart" during a breach investigation — and only the controller,
 * after route-model binding has resolved, actually knows it. A middleware
 * implementation would have had to re-derive it from route parameters and would
 * have recorded nothing at all for the export endpoints.
 *
 * ## Why failures are swallowed
 *
 * A logging failure must never deny a clinician access to a record. If the
 * insert throws — a full disk, a migration mid-flight — the read proceeds and
 * the failure goes to the application log instead. That is a deliberate
 * trade in the direction of patient care: the alternative is a system where a
 * broken audit table stops a doctor seeing an allergy note.
 *
 * The trade is only defensible because the failure is loud somewhere. Do not
 * quieten the Log::error() call.
 */
trait LogsRecordAccess
{
    /**
     * Record that the current actor read something.
     *
     * @param  'viewed'|'downloaded'|'exported'|'searched'  $action
     * @param  Patient|int|null  $patient  whose record; null for unscoped
     *                                     surfaces (an index, an aggregate export)
     * @param  Model|null  $subject  the specific row, when there is one
     */
    protected function logRecordAccess(
        string $action,
        Patient|int|null $patient = null,
        ?Model $subject = null,
    ): void {
        try {
            $actor = Auth::user();
            $request = request();

            $patientModel = $patient instanceof Patient
                ? $patient
                : ($patient !== null ? Patient::find($patient) : null);

            RecordAccessLog::create([
                'actor_id' => $actor?->id,
                'had_care_relationship' => $this->resolveCareRelationship($actor, $patientModel),
                // Captured at access time, not read back off the user later:
                // roles get reassigned, and the fact an investigation needs is
                // what this person was WHEN they looked.
                'actor_role' => $actor?->getRoleNames()->first(),
                'patient_id' => $patientModel?->id ?? ($patient instanceof Patient ? $patient->id : $patient),
                'subject_type' => $subject ? $subject::class : null,
                'subject_id' => $subject?->getKey(),
                'action' => $action,
                'route' => $request?->route()?->getName() ?? $request?->path(),
                'ip_address' => $request?->ip(),
                // Truncated: some scanners send kilobyte-long agents, and this
                // column is for recognising a device, not archiving a header.
                'user_agent' => mb_substr((string) $request?->userAgent(), 0, 500) ?: null,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to write record access log', [
                'action' => $action,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Was this a read of a chart the actor is actually involved in?
     *
     * Returns null — "the question does not apply" — rather than false when
     * there is no patient in view (a roster search, an aggregate export) or when
     * the reader is the guarantor rather than clinic staff. An audit column
     * where "not asked" and "asked, and no" look identical cannot support the
     * review query it exists for.
     *
     * A false here is the break-glass case: clinical staff read a record they
     * have no appointment with. See PatientPolicy for why that is recorded
     * rather than refused.
     */
    private function resolveCareRelationship(?Authenticatable $actor, ?Patient $patient): ?bool
    {
        if (! $actor instanceof User || $patient === null) {
            return null;
        }

        if (! $actor->hasAnyRole(['doctor', 'nurse'])) {
            return null;
        }

        return $patient->isUnderCareOf($actor);
    }
}
