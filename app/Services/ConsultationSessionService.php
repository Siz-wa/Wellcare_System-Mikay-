<?php

namespace App\Services;

use App\Events\WebRtcSignal;
use App\Exceptions\AllergyContraindicationException;
use App\Exceptions\InvalidConsultationTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Every consultation transition lives here, not in controllers — the same split
 * LoaService, BookingService and LabResultService already use.
 *
 * Two independent state machines run on one row, and keeping them apart is the
 * point of this class:
 *
 *     consultation_status (the CALL)
 *         null --openVirtualRoom--> waiting --markActive--> active
 *                     |                                       |
 *                     +---------------endCall-----------------+--> ended
 *                                                                    |
 *                                     openVirtualRoom <--------------+  (new room_id)
 *
 *     status (the NOTE)
 *         draft --finalize--> finalized       (terminal, no path back)
 *
 * The asymmetry is deliberate. **Ending a call does not finalize the note** —
 * §12 risk 7 says connections drop (the 2026-08-03 two-device run held 4m 5s
 * and then dropped), and a dropped connection must never close a clinical
 * record. **Finalizing the note does end the call** — a signed record must not
 * leave a live authorized channel behind for either party to rejoin.
 *
 * Before this class existed, DoctorConsultationController had two live defects
 * that no test covered:
 *
 *   1. `saveSession()` set `appointments.status = 'completed'` unconditionally
 *      from ANY state, so a cancelled or not-yet-confirmed visit could be
 *      marked complete. BookingService::cancelAppointment() guards that
 *      transition; the doctor path did not.
 *   2. A draft save after a finalize silently flipped the session back to
 *      'draft'. A finalized SOAP note is the clinical record, and
 *      ConsultationSession carries no activity log, so the reversal left no
 *      trace at all.
 *
 * G5 and G6 below close both.
 */
class ConsultationSessionService
{
    public function __construct(
        private readonly DrugAllergyChecker $allergyChecker,
        private readonly PaymentVerificationService $payments,
    ) {}

    /**
     * Replace this session's prescriptions, refusing any that contradict a
     * recorded allergy unless the prescriber has acknowledged it.
     *
     * ## Why this is here and not in the controller
     *
     * The check has to run on the same path as the write, inside the same
     * transaction. A check in the controller is a check that the next caller —
     * a queued job, a seeder, an import, a second controller — does not
     * perform, and the whole finding this task closes was a safety rule that
     * existed on the chart but not on the path that could violate it.
     *
     * ## Replace rather than append
     *
     * The editor sends the whole medication list on every save, because that is
     * what the UI holds. Diffing it would leave the two representations able to
     * disagree; replacing cannot. The rows are soft-deleted, so a removed
     * prescription remains recoverable and remains in `activity_log`.
     *
     * @param  array<int, array{name?: string|null, instructions?: string|null}>  $medications
     *
     * @throws AllergyContraindicationException when a conflict is not acknowledged
     */
    public function syncPrescriptions(
        ConsultationSession $session,
        ?Patient $patient,
        array $medications,
        ?string $allergyOverrideReason = null,
    ): void {
        $medications = $this->cleanMedications($medications);

        if ($patient !== null) {
            $this->guardAllergies($session, $patient, $medications, $allergyOverrideReason);
        }

        $session->prescriptions()->delete();

        foreach ($medications as $medication) {
            $session->prescriptions()->create([
                'name' => $medication['name'],
                'instructions' => $medication['instructions'],
            ]);
        }
    }

    /**
     * @param  array<int, array{name: string, instructions: string}>  $medications
     *
     * @throws AllergyContraindicationException
     */
    private function guardAllergies(
        ConsultationSession $session,
        Patient $patient,
        array $medications,
        ?string $allergyOverrideReason,
    ): void {
        $conflicts = $this->allergyChecker->checkAll($patient->loadMissing('allergies'), $medications);

        if ($conflicts === []) {
            return;
        }

        // No acknowledgement — refuse the whole save and hand the conflicts
        // back so the doctor sees WHAT matched rather than that something did.
        if (blank($allergyOverrideReason)) {
            throw new AllergyContraindicationException($conflicts);
        }

        $this->recordOverride($session, $patient, $conflicts, $allergyOverrideReason);
    }

    /**
     * Write the override to the audit trail.
     *
     * A prescriber may always overrule this check — the checker is name
     * matching over a short table, not a clinical authority, and a system that
     * cannot be overridden is one that gets worked around. What must not happen
     * is an override leaving no trace.
     *
     * The drug and allergen names are deliberately NOT written to
     * `activity_log`. ConsultationPrescription excludes `name` from its audited
     * attributes for a stated reason — a drug name is a diagnosis by inference,
     * and activity_log is admin-readable. The same reasoning applies with more
     * force to an allergen. The log records that an override happened, by whom,
     * on which session, and how many conflicts; the reason text and the clinical
     * detail stay in the encrypted record and the application log.
     *
     * @param  array<int, array{name: string, conflicts: array<int, array<string, mixed>>}>  $conflicts
     */
    private function recordOverride(
        ConsultationSession $session,
        Patient $patient,
        array $conflicts,
        string $reason,
    ): void {
        activity('consultationsession')
            ->performedOn($session)
            ->causedBy($session->doctor)
            ->withProperties([
                'conflict_count' => count($conflicts),
                'patient_id' => $patient->id,
            ])
            ->log('Allergy warning overridden on a prescription');

        // The detail an incident review would need, kept out of the
        // admin-readable audit table.
        Log::warning('Drug-allergy warning overridden', [
            'session_id' => $session->id,
            'patient_id' => $patient->id,
            'doctor_id' => $session->doctor_id,
            'reason' => $reason,
            'conflicts' => $conflicts,
        ]);
    }

    /**
     * Drop blank rows and normalise the shape the editor posts.
     *
     * @param  array<int, array{name?: string|null, instructions?: string|null}>  $medications
     * @return array<int, array{name: string, instructions: string}>
     */
    private function cleanMedications(array $medications): array
    {
        $cleaned = [];

        foreach ($medications as $medication) {
            $name = trim((string) ($medication['name'] ?? ''));

            if ($name === '') {
                continue;
            }

            $cleaned[] = [
                'name' => $name,
                'instructions' => trim((string) ($medication['instructions'] ?? '')),
            ];
        }

        return $cleaned;
    }

    /**
     * Return the session for this appointment, creating it if the doctor has
     * not saved a note yet.
     *
     * `consultation_sessions.appointment_id` is UNIQUE, which is exactly what
     * firstOrCreate is for — but two clicks landing together still race past
     * the SELECT and collide on the INSERT.
     */
    public function ensureSession(Appointment $appointment, User $doctor): ConsultationSession
    {
        try {
            return ConsultationSession::firstOrCreate(
                ['appointment_id' => $appointment->id],
                ['doctor_id' => $doctor->id, 'mode' => 'in_person', 'status' => 'draft'],
            );
        } catch (UniqueConstraintViolationException) {
            // Lost the insert race. The winner's row is the one that counts —
            // returning a second row is impossible here, so re-read it.
            return ConsultationSession::where('appointment_id', $appointment->id)->firstOrFail();
        }
    }

    /**
     * Open — or return — the video room for this appointment.
     *
     * Idempotency is load-bearing, not a nicety. If a room is already `waiting`
     * or `active` this returns it untouched. Minting a fresh room_id while the
     * patient is connected would leave them subscribed to a channel nobody
     * broadcasts on: no error on either screen, just a call that never
     * connects, which is the worst possible failure mode to debug live.
     *
     * @throws InvalidConsultationTransitionException
     */
    public function openVirtualRoom(Appointment $appointment, User $doctor): ConsultationSession
    {
        // G2 — the patient asked to be seen in person. Opening a video room for
        // them would strand the doctor waiting for someone walking to the clinic.
        if (! $appointment->isVirtual()) {
            throw new InvalidConsultationTransitionException(
                'This appointment was booked as an in-person visit, so it has no video room.'
            );
        }

        // G3 — a room before check-in has nobody to admit, and a room after the
        // visit closed has nothing to discuss.
        if (! $appointment->isInConsultation()) {
            throw new InvalidConsultationTransitionException(
                'The video room opens once the patient has checked in, and closes when the consultation is completed.'
            );
        }

        // G5 — the clinic has not been paid for a visit it agreed to charge
        // for. Checked BEFORE ensureSession() so an unsettled appointment does
        // not leave a consultation row behind it.
        //
        // This is the gate the whole payment module exists to hold. An
        // in-person patient passes a cashier on the way to the consulting room;
        // a video patient passes nothing, so the software has to stand where the
        // cashier stands. It reads `verified`/`waived` only — a payment the
        // patient has merely CLAIMED is not payment, or the reference field
        // would be a password anyone could guess.
        //
        // Silent on every other kind of booking: isSettledForConsultation()
        // returns true when there is no payment record, which is every
        // in-person, HMO, PhilHealth and corporate visit.
        //
        // A self-paid video visit with NO record (booked before the payment
        // module existed) is refused too, and gets its bill raised here, so the
        // patient is told what they owe and HR has a record to verify or waive.
        // Without it the room would stay shut with nothing anyone could do.
        if ($appointment->paymentVerification === null && $this->payments->raise($appointment)) {
            $appointment->unsetRelation('paymentVerification');
        }

        if (! $appointment->isSettledForConsultation()) {
            throw new InvalidConsultationTransitionException(
                'This video consultation has not been paid for yet. The room opens once the clinic confirms the payment.'
            );
        }

        $session = $this->ensureSession($appointment, $doctor);

        // G4 — a signed record is closed. Reopening a room against it would let
        // two people back into a consultation that is already documented.
        if ($session->isFinalized()) {
            throw new InvalidConsultationTransitionException(
                'This consultation has been finalized and its video room cannot be reopened.'
            );
        }

        return DB::transaction(function () use ($session, $appointment, $doctor) {
            // Re-read under a row lock before deciding. The idempotency check
            // below is the whole point of this method (see the docblock), and a
            // plain SELECT under REPEATABLE READ takes no lock — so two clicks
            // landing together both saw "not live", both minted a UUID, and the
            // second overwrote the first. The doctor's tab then held room A
            // while the patient's link resolved to room B: two rooms, one
            // subscriber each, both sides waiting forever, nothing logged.
            $session = ConsultationSession::whereKey($session->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($session->isLive()) {
                return $session;
            }

            $session->update([
                'doctor_id' => $doctor->id,
                'mode' => 'virtual',
                'room_id' => (string) Str::uuid(),
                'consultation_status' => 'waiting',
                'started_at' => now(),
                'ended_at' => null,
            ]);

            // Mirrors the in-person `start()`: the visit is underway the moment
            // the doctor opens the room. Only this one transition, never any
            // other — a confirmed or completed appointment is filtered out by
            // G3 above and never reaches here.
            if ($appointment->status === 'checked_in') {
                $appointment->update(['status' => 'in_progress']);
            }

            $this->notifyPatientRoomOpen($appointment);

            return $session->fresh();
        });
    }

    /**
     * Both peers are connected. Called once the ICE connection establishes.
     *
     * Idempotent from `active` so a reconnect (see §12 risk 7 — ICE restart)
     * does not error. Throws from `ended`/NULL because there is no room to be
     * active in.
     *
     * @throws InvalidConsultationTransitionException
     */
    public function markActive(ConsultationSession $session): ConsultationSession
    {
        if ($session->consultation_status === 'active') {
            return $session;
        }

        if ($session->consultation_status !== 'waiting') {
            throw new InvalidConsultationTransitionException(
                'This consultation room is not open.'
            );
        }

        // Conditional update, not a bare one. The guard above reads an instance
        // loaded earlier in the request, so between the read and the write the
        // other peer can end the call — and a bare UPDATE would then resurrect
        // it, leaving a row that is simultaneously `active` and carries an
        // `ended_at`. mayJoinRoom() would start returning true again and the
        // hang-up would be silently lost.
        $updated = ConsultationSession::whereKey($session->getKey())
            ->where('consultation_status', 'waiting')
            ->update(['consultation_status' => 'active']);

        if ($updated === 0) {
            throw new InvalidConsultationTransitionException(
                'This consultation room is not open.'
            );
        }

        return $session->fresh();
    }

    /**
     * Close the call.
     *
     * Deliberately does NOT touch `appointments.status` and does NOT touch the
     * note. A dropped connection, a browser refresh and a deliberate hang-up
     * all land here, and none of them is evidence the consultation is over.
     * The doctor reopens the room or finalizes the note as they see fit.
     *
     * Idempotent from `ended` — a hang-up racing a disconnect must not error.
     *
     * **The `bye` broadcast belongs here, not in the controller.** It used to
     * live in ConsultationRoomController::leave, which meant `finalize()` —
     * which also ends the call — told the other peer nothing at all: the doctor
     * signed the note and navigated away, and the patient was left watching a
     * frozen last frame with a running timer, believing the consultation was
     * still live. Owning the broadcast here makes every close path notify by
     * construction, including the stale-session sweep.
     */
    public function endCall(ConsultationSession $session): ConsultationSession
    {
        if (! $session->isLive()) {
            return $session;
        }

        $session->update([
            'consultation_status' => 'ended',
            'ended_at' => now(),
        ]);

        // fromUserId 0 — nobody. Real ids start at 1, and the client drops
        // signals whose sender is itself, so a participant id here would make
        // the peer who triggered the close the one peer never told about it.
        $this->broadcastToRoom($session, 'bye', 0);

        return $session->fresh();
    }

    /**
     * One participant left the room.
     *
     * Deliberately asymmetric, and this is a product decision rather than an
     * implementation detail: **only the doctor can end a consultation.** A
     * patient is on a phone, on mobile data, in a waiting room — they drop, they
     * background the app, they tap the wrong thing. None of that is a decision
     * to end a medical consultation, and treating it as one destroyed the room
     * for both parties over a stray tap, with no way back for the patient.
     *
     * So a patient leaving returns the room to `waiting`: the same `room_id`
     * stays valid, the doctor is told they left, and the patient can rejoin from
     * their consultations list.
     */
    public function leaveRoom(ConsultationSession $session, User $user): ConsultationSession
    {
        if ((int) $session->doctor_id === (int) $user->id) {
            return $this->endCall($session);
        }

        if (! $session->isLive()) {
            return $session;
        }

        if ($session->consultation_status !== 'waiting') {
            $session->update(['consultation_status' => 'waiting']);
        }

        // Addressed from the patient, so their own client filters it out and
        // only the doctor sees "the patient left".
        $this->broadcastToRoom($session, 'peer-left', (int) $user->id);

        return $session->fresh();
    }

    /**
     * Announce something to both peers on the room's channel.
     *
     * Broadcast immediately rather than through `DB::afterCommit`, which would
     * be the textbook choice for "don't tell anyone until the write lands".
     * The suite runs under `RefreshDatabase`, so every test executes inside a
     * wrapping transaction — `afterCommit` callbacks would be queued against it
     * and rolled back, never firing. That would make every close notification in
     * this feature invisible to the entire test suite, which is the precise
     * failure mode that already cost this feature three debugging cycles.
     *
     * The ordering risk that afterCommit would have solved is handled instead by
     * keeping `endCall()` outside `finalize()`'s transaction — see finalize().
     */
    private function broadcastToRoom(ConsultationSession $session, string $type, int $fromUserId): void
    {
        $roomId = (string) $session->room_id;

        if ($roomId === '') {
            return;
        }

        broadcast(new WebRtcSignal(
            roomId: $roomId,
            type: $type,
            payload: [],
            fromUserId: $fromUserId,
        ));
    }

    /**
     * Save the SOAP note and vitals as a draft.
     *
     * @param  array<string, mixed>  $soap
     * @param  array<string, mixed>  $vitals
     *
     * @throws InvalidConsultationTransitionException
     */
    public function saveNotes(
        Appointment $appointment,
        User $doctor,
        array $soap,
        array $vitals,
        array $medications = [],
        ?string $allergyOverrideReason = null,
    ): ConsultationSession {
        $session = $this->ensureSession($appointment, $doctor);

        $this->guardNotFinalized($session);

        // One transaction: a prescription refused for a contraindication must
        // take the note and vitals back with it, or the doctor is left with a
        // saved note and silently discarded medications.
        DB::transaction(function () use ($session, $appointment, $doctor, $soap, $vitals, $medications, $allergyOverrideReason) {
            $session->update($this->noteAttributes($session, $doctor, $soap, $vitals) + ['status' => 'draft']);

            $this->syncPrescriptions(
                $session,
                $appointment->patientRecord,
                $medications,
                $allergyOverrideReason,
            );

            // The in-person equivalent of "the doctor has started". Preserved
            // from the original saveSession(), which flipped checked_in ->
            // in_progress on the first draft save.
            if ($appointment->status === 'checked_in') {
                $appointment->update(['status' => 'in_progress']);
            }
        });

        return $session->fresh();
    }

    /**
     * Sign the note and complete the visit.
     *
     * @param  array<string, mixed>  $soap
     * @param  array<string, mixed>  $vitals
     *
     * @throws InvalidConsultationTransitionException
     */
    public function finalize(
        Appointment $appointment,
        User $doctor,
        array $soap,
        array $vitals,
        array $medications = [],
        ?string $allergyOverrideReason = null,
    ): ConsultationSession {
        $session = $this->ensureSession($appointment, $doctor);

        $this->guardNotFinalized($session);

        // G6 — the guard the original code did not have. Without it a
        // cancelled, no-show or still-`requested` appointment could be marked
        // completed by anyone who could reach the save route.
        if (! $appointment->isInConsultation()) {
            throw new InvalidConsultationTransitionException(
                'Only a checked-in or in-progress appointment can be completed.'
            );
        }

        $signed = DB::transaction(function () use ($session, $appointment, $doctor, $soap, $vitals, $medications, $allergyOverrideReason) {
            $session->update($this->noteAttributes($session, $doctor, $soap, $vitals) + ['status' => 'finalized']);

            // Before the note is sealed, not after: once `status` is finalized
            // guardNotFinalized() refuses further edits, so a prescription that
            // failed to save here could never be added afterwards.
            $this->syncPrescriptions(
                $session,
                $appointment->patientRecord,
                $medications,
                $allergyOverrideReason,
            );

            $appointment->update(['status' => 'completed']);

            if ($appointment->user_id) {
                $name = trim($appointment->first_name.' '.$appointment->last_name);
                $date = $appointment->appointment_date->format('F j, Y');

                // The recipient is the booking account. Speak to them about
                // themselves, and name the patient only when it is someone
                // they book for (a child, a parent).
                $isSelf = $appointment->patientRecord?->relationship_to_guarantor === 'self';

                AppointmentNotification::create([
                    'appointment_id' => $appointment->id,
                    'user_id' => $appointment->user_id,
                    'type' => 'consultation_done',
                    'subject' => 'Consultation Complete',
                    'body' => $isSelf
                        ? "Your doctor has finished the notes from your consultation on {$date}. You can read them in My Records."
                        : "The doctor has finished {$name}'s consultation notes from {$date}. You can read them in My Records.",
                    'read' => false,
                ]);
            }

            return $session->fresh();
        });

        // Deliberately AFTER the transaction, so the `bye` it broadcasts can
        // never announce a close that then rolls back.
        //
        // Safe to sit outside: the room is already unjoinable the moment the
        // note is finalized — mayJoinRoom() refuses a finalized session by its
        // own gate 3, independently of call state. Ending the call here is what
        // tidies `consultation_status` and, crucially, tells the patient. Before
        // this, finalizing ended the call and notified nobody: the doctor signed
        // off and navigated away, and the patient sat watching a frozen frame
        // with a running timer, believing the visit was still in progress.
        if ($signed->isLive()) {
            $this->endCall($signed);
        }

        return $signed->fresh();
    }

    /**
     * May this account join this room? **The security boundary for the whole
     * virtual-consultation feature.**
     *
     * One implementation, two call sites — routes/channels.php (the WebSocket
     * subscribe) and ConsultationRoomController (the HTTP signal relay). A
     * second copy would be a second thing to forget to patch, and the failure
     * mode is a live audio and video leak of a medical consultation.
     *
     * Five gates, each of which has to hold on its own:
     *   1. the room exists and is a real virtual room
     *   2. the call is still open      — an ended call is not a room
     *   3. the note is not finalized   — a closed record has no room
     *   4. the visit is still open     — a cancelled/completed visit has no room
     *   5. the caller is one of exactly two named accounts
     *
     * Note what is deliberately absent: any role check. `role:doctor` would
     * admit every doctor in the clinic to every consultation, which is precisely
     * the leak this method exists to prevent. Identity, never role.
     *
     * `room_id` is an unguessable UUID, which is convenient — but it is a lookup
     * key, never a secret, and nothing here relies on it staying private.
     */
    public function mayJoinRoom(User $user, string $roomId): bool
    {
        $session = ConsultationSession::query()
            ->where('room_id', $roomId)
            ->where('mode', 'virtual')
            ->with('appointment')
            ->first();

        if ($session === null || ! $session->isLive() || $session->isFinalized()) {
            return false;
        }

        // belongsTo(Appointment) respects SoftDeletes, so a trashed appointment
        // resolves to null and is refused by the same branch.
        $appointment = $session->appointment;

        if ($appointment === null || $appointment->isTerminal()) {
            return false;
        }

        // The two participants, named.
        //
        // `appointments.user_id` — the account that booked THIS visit — and NOT
        // `patients.guarantor_id`, which is the scope the patient portal's list
        // pages use. The distinction is load-bearing:
        // Patient::findOrCreateFromBooking() sets guarantor_id only on creation
        // and never updates it, so when a second account books for the same
        // person the appointment carries user_id = B while guarantor_id is
        // still A. Scoping here on guarantor_id would admit A — a stranger to
        // this visit — into B's live consultation, and lock B, who booked it
        // and checked in, out of it.
        return $user->id === $session->doctor_id
            || $user->id === $appointment->user_id;
    }

    /**
     * ICE servers for RTCPeerConnection, shaped as RTCIceServer[].
     *
     * @return array<int, array<string, mixed>>
     */
    public function iceServers(): array
    {
        $servers = [];

        $stun = config('webrtc.stun_urls', []);
        if ($stun !== []) {
            $servers[] = ['urls' => $stun];
        }

        $turn = config('webrtc.turn_urls', []);
        if ($turn !== []) {
            $servers[] = [
                'urls' => $turn,
                'username' => (string) config('webrtc.turn_username'),
                'credential' => (string) config('webrtc.turn_credential'),
            ];
        }

        return $servers;
    }

    /** @throws InvalidConsultationTransitionException */
    private function guardNotFinalized(ConsultationSession $session): void
    {
        // G5. `isFinalized()` has existed on the model since the table was
        // created and was called from nowhere — this is what it was for.
        if ($session->isFinalized()) {
            throw new InvalidConsultationTransitionException(
                'This consultation has been finalized and can no longer be edited.'
            );
        }
    }

    /**
     * @param  array<string, mixed>  $soap
     * @param  array<string, mixed>  $vitals
     * @return array<string, mixed>
     */
    private function noteAttributes(ConsultationSession $session, User $doctor, array $soap, array $vitals): array
    {
        $source = $this->resolveVitalsSource($session, $vitals['source'] ?? null);

        // "Nothing was obtained" and a recorded blood pressure cannot both be
        // true, and a record that says both is worse than one that says neither.
        // The room's UI already closes the six inputs when the doctor picks
        // this, but the save route is reachable without that page, and the
        // in-person session editor posts the same six fields from a form that
        // never saw the choice. Normalising here is what makes the stored row
        // consistent regardless of which door the save came through.
        if ($source === 'not_obtained') {
            $vitals = [];
        }

        return [
            'doctor_id' => $doctor->id,
            'subjective' => $soap['subjective'] ?? null,
            'objective' => $soap['objective'] ?? null,
            'assessment' => $soap['assessment'] ?? null,
            'plan' => $soap['plan'] ?? null,
            // Task 3.1 — dual-written. The display strings stay exactly as they
            // were so nothing that reads them has to change today; the numeric
            // columns beside them are what a trend, a BMI or an out-of-range
            // flag can actually be computed from.
            'blood_pressure' => $vitals['bloodPressure'] ?? null,
            'heart_rate' => $vitals['heartRate'] ?? null,
            'temperature' => $vitals['temperature'] ?? null,
            'oxygen_saturation' => $vitals['oxygenSaturation'] ?? null,
            'weight' => $vitals['weight'] ?? null,
            'height' => $vitals['height'] ?? null,
            'vitals_source' => $source,
        ] + $this->numericVitals($vitals);
    }

    /**
     * The measurement half of the vitals, parsed out of what the form posts.
     *
     * The editor sends display strings ("119/83", "70"), and the controller's
     * rules already constrain them to plausible measurements — but the rules
     * only reject; they do not convert. This is where the number is extracted.
     *
     * Returns null for anything absent or unparseable rather than zero. A
     * recorded heart rate of 0 is clinically impossible and, unlike a null,
     * looks like a real reading — the same reason the backfill migration guards
     * every cast.
     *
     * @param  array<string, mixed>  $vitals
     * @return array<string, int|float|null>
     */
    private function numericVitals(array $vitals): array
    {
        [$systolic, $diastolic] = $this->splitBloodPressure($vitals['bloodPressure'] ?? null);

        return [
            'systolic' => $systolic,
            'diastolic' => $diastolic,
            'heart_rate_bpm' => $this->toInt($vitals['heartRate'] ?? null),
            'temperature_c' => $this->toFloat($vitals['temperature'] ?? null),
            'oxygen_saturation_pct' => $this->toInt($vitals['oxygenSaturation'] ?? null),
            'weight_kg' => $this->toFloat($vitals['weight'] ?? null),
            'height_cm' => $this->toFloat($vitals['height'] ?? null),
        ];
    }

    /**
     * "119/83" into its two measurements.
     *
     * Both or neither: a value that is not two numbers separated by a slash is
     * not a blood pressure, and guessing which half a lone number represents
     * would be inventing a finding.
     *
     * @return array{0: int|null, 1: int|null}
     */
    private function splitBloodPressure(mixed $value): array
    {
        if (! is_string($value) || ! preg_match('/^\s*(\d{2,3})\s*\/\s*(\d{2,3})/', $value, $m)) {
            return [null, null];
        }

        return [(int) $m[1], (int) $m[2]];
    }

    private function toInt(mixed $value): ?int
    {
        $number = $this->leadingNumber($value);

        return $number === null ? null : (int) $number;
    }

    private function toFloat(mixed $value): ?float
    {
        return $this->leadingNumber($value);
    }

    /**
     * The number at the start of a written value, or null.
     *
     * Tolerates a trailing unit ("70 bpm", "36.7 C", "96%") because the seeded
     * rows are written that way and a doctor may type it too.
     */
    private function leadingNumber(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        if (! is_string($value) || ! preg_match('/^\s*(\d+(?:\.\d+)?)/', $value, $m)) {
            return null;
        }

        return (float) $m[1];
    }

    /**
     * Decide the provenance to store for this save.
     *
     * Three rules, in order, and the middle one is the reason this is a method
     * rather than a `??` chain:
     *
     *  1. **An explicit, valid choice wins.** The doctor said where the numbers
     *     came from; nothing here second-guesses it.
     *  2. **Silence preserves what is already on the row.** The in-person
     *     session editor and the video room both POST to the same save route,
     *     and a caller that omits the field must not overwrite a choice the
     *     other one made. Without this, a doctor who marked a virtual visit's
     *     vitals `patient_reported` in the room, then reopened the note in the
     *     session-editor modal, would have had them silently relabelled as
     *     clinic-measured -- the record asserting an instrument reading that
     *     never happened, which is the exact failure this column exists to
     *     prevent.
     *  3. **Otherwise fall back to the mode's honest default.** Virtual means
     *     patient-reported, because nobody on a video call is holding a cuff.
     *
     * An invalid value is treated as silence rather than rejected: the request
     * validation already refuses one, and a service that throws here would take
     * a whole clinical note down over a provenance label.
     */
    private function resolveVitalsSource(ConsultationSession $session, ?string $requested): string
    {
        if ($requested !== null && in_array($requested, ConsultationSession::VITALS_SOURCES, true)) {
            return $requested;
        }

        return $session->vitals_source ?? $session->defaultVitalsSource();
    }

    private function notifyPatientRoomOpen(Appointment $appointment): void
    {
        if (! $appointment->user_id) {
            return;
        }

        AppointmentNotification::create([
            'appointment_id' => $appointment->id,
            'user_id' => $appointment->user_id,
            'type' => 'consultation_started',
            'subject' => 'Your Doctor Is Ready',
            'body' => 'Your video consultation room is open. Join from your dashboard to start the call.',
            'read' => false,
        ]);
    }
}
