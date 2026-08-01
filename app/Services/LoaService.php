<?php

namespace App\Services;

use App\Exceptions\InvalidLoaTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\LoaRequest;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * All Letter of Authorization transitions live here, not in controllers — the
 * same split BookingService and LabResultService use.
 *
 * The three steps implement Figure 6's processes 3 (SUBMIT LOA) and 4
 * (APPROVE LOA):
 *
 *   submit()  → status 'submitted', HR notified
 *   approve() → status 'approved',  appointment released to the doctor's queue
 *   reject()  → status 'rejected',  appointment cancelled with the reason
 *
 * The appointment status is *derived* from the LOA, never set independently.
 * That is the whole point of the module: before it existed,
 * `pending_hmo_approval` was the only record that an authorization was in
 * flight, so there was nothing for a patient to check and no history to audit.
 *
 * Each step stamps its own *_at column, giving the row a full trail of who
 * decided what and when.
 */
class LoaService
{
    /**
     * A patient books with HMO coverage. Called from BookingService inside the
     * booking transaction, so an HMO appointment and its LOA are created
     * together or not at all.
     */
    public function submit(Appointment $appointment): LoaRequest
    {
        $loa = LoaRequest::create([
            'patient_id' => $appointment->patient_id,
            'user_id' => $appointment->user_id,
            'appointment_id' => $appointment->id,
            'hmo_provider' => $appointment->hmo,
            'hmo_id' => $appointment->hmo_id,
            'status' => 'submitted',
            'requested_at' => now(),
        ]);

        $this->notifyHr($loa, $appointment);

        return $loa;
    }

    /**
     * HR verifies the coverage. The appointment moves to `requested`, which is
     * where a cash booking would have started — from here the doctor confirms
     * it like any other.
     */
    public function approve(
        LoaRequest $loa,
        User $approver,
        ?string $remarks = null,
        ?Carbon $validUntil = null,
    ): LoaRequest {
        $this->guardDecidable($loa);

        // Two tables move together. A half-applied approval would leave the
        // appointment stuck at pending_hmo_approval with an approved LOA
        // against it, which reads as a system error on every surface.
        return DB::transaction(function () use ($loa, $approver, $remarks, $validUntil) {
            $loa->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'remarks' => $remarks,
                'valid_until' => $validUntil,
            ]);

            $loa->appointment?->update(['status' => 'requested']);

            $this->notifyPatient($loa, 'approved');

            return $loa->fresh();
        });
    }

    /**
     * HR declines the coverage. The appointment cannot proceed, so it is
     * cancelled carrying the HMO's reason — the patient sees why rather than a
     * bare "cancelled".
     */
    public function reject(LoaRequest $loa, User $approver, string $remarks): LoaRequest
    {
        $this->guardDecidable($loa);

        return DB::transaction(function () use ($loa, $approver, $remarks) {
            $loa->update([
                'status' => 'rejected',
                'approved_by' => $approver->id,
                'rejected_at' => now(),
                'remarks' => $remarks,
            ]);

            $loa->appointment?->update([
                'status' => 'cancelled',
                'cancellation_reason' => $remarks,
                'cancelled_at' => now(),
            ]);

            $this->notifyPatient($loa, 'rejected');

            return $loa->fresh();
        });
    }

    /**
     * @throws InvalidLoaTransitionException
     */
    private function guardDecidable(LoaRequest $loa): void
    {
        if ($loa->status === 'submitted') {
            return;
        }

        throw new InvalidLoaTransitionException(match ($loa->status) {
            'approved' => 'This LOA has already been approved.',
            'rejected' => 'This LOA has already been rejected.',
            default => 'This LOA has expired and can no longer be decided.',
        });
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    //
    // The bell UI reads appointment_notifications (see CLAUDE.md), so these
    // write there directly rather than going through NotificationService.
    // appointment_id is NOT NULL on that table, so every write is guarded on an
    // LOA that actually belongs to a visit. The hmo_* types already exist in
    // that table's enum and are already mapped in HandleInertiaRequests.

    private function notifyHr(LoaRequest $loa, Appointment $appointment): void
    {
        if (! $loa->appointment_id) {
            return;
        }

        $patientName = trim("{$appointment->first_name} {$appointment->last_name}");
        $provider = $loa->hmo_provider ?? 'an HMO';

        foreach (User::role('hr')->get() as $officer) {
            AppointmentNotification::create([
                'appointment_id' => $loa->appointment_id,
                'user_id' => $officer->id,
                'type' => 'hmo_submitted',
                'subject' => 'New LOA Request',
                'body' => "{$loa->loa_number} — {$patientName} booked under {$provider} and is waiting on coverage verification.",
                'read' => false,
            ]);
        }
    }

    private function notifyPatient(LoaRequest $loa, string $outcome): void
    {
        if (! $loa->appointment_id || ! $loa->user_id) {
            return;
        }

        $approved = $outcome === 'approved';

        AppointmentNotification::create([
            'appointment_id' => $loa->appointment_id,
            'user_id' => $loa->user_id,
            'type' => $approved ? 'hmo_approved' : 'hmo_rejected',
            'subject' => $approved
                ? 'LOA Approved — Appointment Pending'
                : 'LOA Rejected',
            'body' => $approved
                ? "Your Letter of Authorization {$loa->loa_number} has been approved. Your appointment is now pending doctor confirmation."
                : "Your Letter of Authorization {$loa->loa_number} was not approved. Reason: {$loa->remarks}",
            'read' => false,
        ]);
    }
}
