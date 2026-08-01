<?php

namespace App\Services;

use App\Exceptions\InvalidLabTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\LabTestResult;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * All lab workflow state transitions live here, not in controllers — the same
 * split BookingService uses for slot rules.
 *
 * The three steps implement DFD processes 5 (lab test request), 6 (record lab
 * results) and the doctor-review half that feeds process 7:
 *
 *   request() → status 'requested', nurses notified
 *   record()  → status 'recorded',  requesting doctor notified
 *   review()  → status 'reviewed',  patient notified
 *
 * Each step stamps its own *_at column, so the row carries a full audit trail
 * of who did what and when.
 */
class LabResultService
{
    /**
     * A doctor orders a test during consultation.
     */
    public function request(
        Patient $patient,
        User $doctor,
        string $testName,
        ?Appointment $appointment = null,
    ): LabTestResult {
        $result = LabTestResult::create([
            'patient_id' => $patient->id,
            'user_id' => $appointment?->user_id ?? $patient->guarantor_id,
            'appointment_id' => $appointment?->id,
            'requested_by' => $doctor->id,
            'test_name' => $testName,
            'status' => 'requested',
            'requested_at' => now(),
        ]);

        $this->notifyNurses($result, $patient);

        return $result;
    }

    /**
     * A nurse encodes the measured values and flags the overall severity.
     *
     * @param  array<int, array{name: string, result: string, unit?: ?string, ref_range?: ?string, status?: string}>  $parameters
     */
    public function record(
        LabTestResult $result,
        User $nurse,
        array $parameters,
        string $severity,
        ?string $notes = null,
    ): LabTestResult {
        if ($result->status !== 'requested') {
            throw new InvalidLabTransitionException(
                'Results have already been recorded for this test.'
            );
        }

        // Two tables are written together — a half-recorded test would show up
        // in the doctor's review queue with no values in it.
        return DB::transaction(function () use ($result, $nurse, $parameters, $severity, $notes) {
            $result->update([
                'recorded_by' => $nurse->id,
                'status' => 'recorded',
                'severity' => $severity,
                'notes' => $notes,
                'recorded_at' => now(),
            ]);

            foreach (array_values($parameters) as $index => $parameter) {
                $result->parameters()->create([
                    'name' => $parameter['name'],
                    'result' => $parameter['result'],
                    'unit' => $parameter['unit'] ?? null,
                    'ref_range' => $parameter['ref_range'] ?? null,
                    'status' => $parameter['status'] ?? 'normal',
                    'sort_order' => $index,
                ]);
            }

            $this->notifyRequestingDoctor($result);

            return $result->fresh(['parameters']);
        });
    }

    /**
     * The requesting doctor validates the results and writes the final reading.
     */
    public function review(LabTestResult $result, User $doctor, string $interpretation): LabTestResult
    {
        if ($result->status !== 'recorded') {
            throw new InvalidLabTransitionException(
                $result->status === 'requested'
                    ? 'The nurse has not recorded results for this test yet.'
                    : 'This test has already been reviewed.'
            );
        }

        $result->update([
            'reviewed_by' => $doctor->id,
            'status' => 'reviewed',
            'interpretation' => $interpretation,
            'reviewed_at' => now(),
        ]);

        $this->notifyPatient($result);

        return $result->fresh();
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    //
    // The bell UI reads appointment_notifications (see CLAUDE.md), so these
    // write there directly rather than going through NotificationService.
    // appointment_id is NOT NULL on that table, so every write is guarded on a
    // test that actually belongs to a visit.

    private function notifyNurses(LabTestResult $result, Patient $patient): void
    {
        if (! $result->appointment_id) {
            return;
        }

        foreach (User::role('nurse')->get() as $nurse) {
            AppointmentNotification::create([
                'appointment_id' => $result->appointment_id,
                'user_id' => $nurse->id,
                'type' => 'lab_requested',
                'subject' => 'New Lab Test Requested',
                'body' => "{$result->test_name} was ordered for {$patient->full_name}. Please encode the results once available.",
                'read' => false,
            ]);
        }
    }

    private function notifyRequestingDoctor(LabTestResult $result): void
    {
        if (! $result->appointment_id) {
            return;
        }

        $isCritical = $result->severity === 'critical';
        $patientName = $result->patient?->full_name ?? 'A patient';

        AppointmentNotification::create([
            'appointment_id' => $result->appointment_id,
            'user_id' => $result->requested_by,
            'type' => $isCritical ? 'lab_critical' : 'lab_recorded',
            'subject' => $isCritical
                ? 'Critical Lab Result — Needs Review'
                : 'Lab Results Ready for Review',
            'body' => $isCritical
                ? "{$result->test_name} for {$patientName} came back with critical values. Please review immediately."
                : "{$result->test_name} for {$patientName} has been recorded and is ready for your review.",
            'read' => false,
        ]);
    }

    private function notifyPatient(LabTestResult $result): void
    {
        if (! $result->appointment_id || ! $result->user_id) {
            return;
        }

        AppointmentNotification::create([
            'appointment_id' => $result->appointment_id,
            'user_id' => $result->user_id,
            'type' => 'lab_reviewed',
            'subject' => 'Lab Results Available',
            'body' => "Your {$result->test_name} results have been reviewed by your doctor and added to your medical record.",
            'read' => false,
        ]);
    }
}
