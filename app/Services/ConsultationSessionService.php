<?php

namespace App\Services;

use App\Events\WebRtcSignal;
use App\Exceptions\InvalidConsultationTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\ConsultationSession;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
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
    public function saveNotes(Appointment $appointment, User $doctor, array $soap, array $vitals): ConsultationSession
    {
        $session = $this->ensureSession($appointment, $doctor);

        $this->guardNotFinalized($session);

        $session->update($this->noteAttributes($doctor, $soap, $vitals) + ['status' => 'draft']);

        // The in-person equivalent of "the doctor has started". Preserved from
        // the original saveSession(), which flipped checked_in -> in_progress
        // on the first draft save.
        if ($appointment->status === 'checked_in') {
            $appointment->update(['status' => 'in_progress']);
        }

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
    public function finalize(Appointment $appointment, User $doctor, array $soap, array $vitals): ConsultationSession
    {
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

        $signed = DB::transaction(function () use ($session, $appointment, $doctor, $soap, $vitals) {
            $session->update($this->noteAttributes($doctor, $soap, $vitals) + ['status' => 'finalized']);

            $appointment->update(['status' => 'completed']);

            if ($appointment->user_id) {
                $name = trim($appointment->first_name.' '.$appointment->last_name);

                AppointmentNotification::create([
                    'appointment_id' => $appointment->id,
                    'user_id' => $appointment->user_id,
                    'type' => 'consultation_done',
                    'subject' => 'Consultation Complete',
                    'body' => "{$name}'s consultation notes have been finalized by the doctor.",
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
    private function noteAttributes(User $doctor, array $soap, array $vitals): array
    {
        return [
            'doctor_id' => $doctor->id,
            'subjective' => $soap['subjective'] ?? null,
            'objective' => $soap['objective'] ?? null,
            'assessment' => $soap['assessment'] ?? null,
            'plan' => $soap['plan'] ?? null,
            'blood_pressure' => $vitals['bloodPressure'] ?? null,
            'heart_rate' => $vitals['heartRate'] ?? null,
            'temperature' => $vitals['temperature'] ?? null,
            'oxygen_saturation' => $vitals['oxygenSaturation'] ?? null,
            'weight' => $vitals['weight'] ?? null,
            'height' => $vitals['height'] ?? null,
        ];
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
