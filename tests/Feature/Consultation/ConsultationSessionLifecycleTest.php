<?php

use App\Events\WebRtcSignal;
use App\Exceptions\InvalidConsultationTransitionException;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Services\ConsultationSessionService;
use Illuminate\Support\Facades\Event;

/**
 * The consultation state machine.
 *
 * Two machines run on one `consultation_sessions` row and the tests below keep
 * them apart on purpose:
 *
 *     consultation_status (the CALL)   null -> waiting -> active -> ended
 *     status              (the NOTE)   draft -> finalized          (terminal)
 *
 * Ending a call must NOT finalize the note — §12 risk 7 says connections drop,
 * and the 2026-08-03 two-device run dropped at 4m 5s. A dropped call that
 * closed the clinical record would be a data-loss bug triggered by a flaky
 * network.
 *
 * Finalizing the note MUST end the call — mayJoinRoom() authorizes on live call
 * state, so a signed note with a still-open room stays joinable after the visit
 * is documented.
 *
 * Two of these tests are regressions against defects that were live before this
 * service existed and that nothing covered:
 *
 *   - finalize from any appointment status (a cancelled visit could be
 *     marked completed)
 *   - a draft save silently reopening a finalized note
 */
beforeEach(function () {
    $this->service = app(ConsultationSessionService::class);

    $this->doctor = userWithRole('doctor');
    $this->guarantor = userWithRole('user');
    $this->record = Patient::factory()->forGuarantor($this->guarantor)->create();

    $this->soap = ['subjective' => 'Cough', 'objective' => 'Clear', 'assessment' => 'URI', 'plan' => 'Rest'];
    $this->vitals = ['bloodPressure' => '120/80', 'heartRate' => '72'];

    $this->virtualVisit = fn (string $status = 'checked_in') => Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => $status]);
});

// ── Opening a room ────────────────────────────────────────────────────────────

it('opens a room and moves a checked-in visit to in progress', function () {
    $appointment = ($this->virtualVisit)();

    $session = $this->service->openVirtualRoom($appointment, $this->doctor);

    expect($session->mode)->toBe('virtual')
        ->and($session->consultation_status)->toBe('waiting')
        ->and($session->room_id)->not->toBeNull()
        ->and($session->started_at)->not->toBeNull()
        ->and($appointment->fresh()->status)->toBe('in_progress');
});

it('is idempotent — reopening returns the same room rather than minting a new one', function () {
    $appointment = ($this->virtualVisit)();

    $first = $this->service->openVirtualRoom($appointment, $this->doctor);
    $second = $this->service->openVirtualRoom($appointment, $this->doctor);

    // Re-minting while the patient is connected would leave them subscribed to
    // a channel nobody broadcasts on — a call that never connects, with no
    // error on either screen.
    expect($second->room_id)->toBe($first->room_id)
        ->and(ConsultationSession::count())->toBe(1);
});

it('keeps the same room while a call is already active', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);
    $this->service->markActive($session);

    expect($this->service->openVirtualRoom($appointment, $this->doctor)->room_id)
        ->toBe($session->room_id);
});

it('notifies the booking account that the room is open', function () {
    $appointment = ($this->virtualVisit)();

    $this->service->openVirtualRoom($appointment, $this->doctor);

    expect(AppointmentNotification::where('user_id', $this->guarantor->id)
        ->where('type', 'consultation_started')
        ->exists())->toBeTrue();
});

it('refuses a room for an in-person booking', function () {
    $appointment = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->create(['status' => 'checked_in']);

    expect(fn () => $this->service->openVirtualRoom($appointment, $this->doctor))
        ->toThrow(InvalidConsultationTransitionException::class);
});

it('refuses a room outside the consultation window', function (string $status) {
    $appointment = ($this->virtualVisit)($status);

    expect(fn () => $this->service->openVirtualRoom($appointment, $this->doctor))
        ->toThrow(InvalidConsultationTransitionException::class);

    expect(ConsultationSession::whereNotNull('room_id')->count())->toBe(0);
})->with(['requested', 'confirmed', 'completed', 'cancelled', 'no_show']);

// ── Call transitions ──────────────────────────────────────────────────────────

it('moves waiting to active and tolerates a repeat', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);

    expect($this->service->markActive($session)->consultation_status)->toBe('active');
    // A reconnect (ICE restart, §12 risk 7) re-runs this. It must not error.
    expect($this->service->markActive($session->fresh())->consultation_status)->toBe('active');
});

it('refuses to activate a room that was never opened', function () {
    $session = ConsultationSession::factory()->virtual()->create();

    expect(fn () => $this->service->markActive($session))
        ->toThrow(InvalidConsultationTransitionException::class);
});

it('cannot resurrect a call that ended after the guard was read', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);

    // The instance a request holds is loaded once and reused. Simulate the other
    // peer ending the call in between: the in-memory copy still says `waiting`,
    // the row says `ended`. A bare UPDATE here would flip it back to `active`
    // while leaving `ended_at` set — a row that is ended and live at once, which
    // mayJoinRoom() would happily authorize.
    ConsultationSession::whereKey($session->getKey())
        ->update(['consultation_status' => 'ended', 'ended_at' => now()]);

    expect(fn () => $this->service->markActive($session))
        ->toThrow(InvalidConsultationTransitionException::class);

    expect($session->fresh()->consultation_status)->toBe('ended');
});

// ── Every close path tells the other peer ─────────────────────────────────────

/**
 * The `bye` broadcast belongs to endCall(), not to the controller that happens
 * to call it.
 *
 * It used to live in ConsultationRoomController::leave, which meant finalize()
 * — which also ends the call — announced nothing. The doctor signed the note and
 * navigated away; the patient was left watching a frozen last frame with a
 * running clock, with no indication the consultation was over. Asserting it at
 * the service is what stops the next close path from inheriting that hole.
 */
it('tells the other peer on every path that closes a call', function (string $how) {
    Event::fake([WebRtcSignal::class]);

    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);
    $this->service->markActive($session->fresh());

    match ($how) {
        'endCall' => $this->service->endCall($session->fresh()),
        'doctor leaves' => $this->service->leaveRoom($session->fresh(), $this->doctor),
        'finalize' => $this->service->finalize($appointment->fresh(), $this->doctor, $this->soap, $this->vitals),
    };

    Event::assertDispatched(
        WebRtcSignal::class,
        fn (WebRtcSignal $e): bool => $e->type === 'bye'
            && $e->roomId === $session->room_id
            // Nobody sent it. A participant id here would make the peer who
            // triggered the close the one peer never told about it, because the
            // client drops signals whose sender is itself.
            && $e->fromUserId === 0
    );
})->with(['endCall', 'doctor leaves', 'finalize']);

it('does not re-announce a call that had already ended', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);
    $this->service->endCall($session->fresh());

    Event::fake([WebRtcSignal::class]);

    $this->service->endCall($session->fresh());

    Event::assertNotDispatched(WebRtcSignal::class);
});

it('tells the doctor when the patient leaves, addressed from the patient', function () {
    Event::fake([WebRtcSignal::class]);

    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);

    $this->service->leaveRoom($session->fresh(), $this->guarantor);

    Event::assertDispatched(
        WebRtcSignal::class,
        fn (WebRtcSignal $e): bool => $e->type === 'peer-left'
            // Sent as the patient so their own client filters it out and only
            // the doctor is told.
            && $e->fromUserId === $this->guarantor->id
    );
});

// ── Leaving is role-aware ─────────────────────────────────────────────────────

it('ends the consultation when the doctor leaves', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);
    $this->service->markActive($session->fresh());

    $left = $this->service->leaveRoom($session->fresh(), $this->doctor);

    expect($left->consultation_status)->toBe('ended')
        ->and($left->ended_at)->not->toBeNull();
});

it('keeps the room open when the patient leaves so they can rejoin', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);
    $this->service->markActive($session->fresh());

    $left = $this->service->leaveRoom($session->fresh(), $this->guarantor);

    // Back to waiting, NOT ended — a patient on a phone drops, backgrounds the
    // app or taps the wrong thing, and none of that is a decision to end a
    // consultation. Same room_id, so their existing link still works.
    expect($left->consultation_status)->toBe('waiting')
        ->and($left->ended_at)->toBeNull()
        ->and($left->room_id)->toBe($session->room_id);
});

it('lets a patient who left rejoin the same room', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);
    $this->service->markActive($session->fresh());
    $this->service->leaveRoom($session->fresh(), $this->guarantor);

    expect($this->service->mayJoinRoom($this->guarantor, $session->room_id))->toBeTrue();
    expect($this->service->markActive($session->fresh())->consultation_status)->toBe('active');
});

it('ends a call without touching the note or the appointment', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);

    $ended = $this->service->endCall($this->service->markActive($session));

    expect($ended->consultation_status)->toBe('ended')
        ->and($ended->ended_at)->not->toBeNull()
        // The clinical record survives a dropped connection.
        ->and($ended->status)->toBe('draft')
        ->and($appointment->fresh()->status)->toBe('in_progress');
});

it('treats ending an already-ended call as a no-op', function () {
    $session = ConsultationSession::factory()->ended()->create();
    $endedAt = $session->ended_at;

    expect($this->service->endCall($session)->ended_at->timestamp)->toBe($endedAt->timestamp);
});

// ── The note ──────────────────────────────────────────────────────────────────

it('saves a draft and starts the visit', function () {
    $appointment = ($this->virtualVisit)();

    $session = $this->service->saveNotes($appointment, $this->doctor, $this->soap, $this->vitals);

    expect($session->status)->toBe('draft')
        ->and($session->subjective)->toBe('Cough')
        ->and($session->blood_pressure)->toBe('120/80')
        ->and($appointment->fresh()->status)->toBe('in_progress');
});

it('finalizes the note, completes the visit and notifies the patient', function () {
    $appointment = ($this->virtualVisit)();

    $session = $this->service->finalize($appointment, $this->doctor, $this->soap, $this->vitals);

    expect($session->status)->toBe('finalized')
        ->and($appointment->fresh()->status)->toBe('completed')
        ->and(AppointmentNotification::where('user_id', $this->guarantor->id)
            ->where('type', 'consultation_done')->exists())->toBeTrue();
});

// ── Regressions against the two live defects ─────────────────────────────────

it('refuses to reopen a finalized note with a later draft save', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->finalize($appointment, $this->doctor, $this->soap, $this->vitals);

    // Before ConsultationSessionService this silently flipped status back to
    // 'draft' and overwrote the signed narrative, leaving no trace —
    // ConsultationSession carries no activity log.
    expect(fn () => $this->service->saveNotes(
        $appointment->fresh(),
        $this->doctor,
        ['subjective' => 'REWRITTEN'],
        [],
    ))->toThrow(InvalidConsultationTransitionException::class);

    $session = ConsultationSession::where('appointment_id', $appointment->id)->first();

    expect($session->status)->toBe('finalized')
        ->and($session->subjective)->toBe('Cough');
});

it('refuses to finalize an appointment that is not in the consultation window', function (string $status) {
    $appointment = ($this->virtualVisit)($status);

    // The original saveSession() set status = 'completed' unconditionally from
    // ANY state, so a cancelled visit could be marked complete.
    expect(fn () => $this->service->finalize($appointment, $this->doctor, $this->soap, $this->vitals))
        ->toThrow(InvalidConsultationTransitionException::class);

    expect($appointment->fresh()->status)->toBe($status);
})->with(['requested', 'confirmed', 'cancelled', 'no_show']);

it('closes the video room when the note is finalized', function () {
    $appointment = ($this->virtualVisit)();
    $session = $this->service->openVirtualRoom($appointment, $this->doctor);
    $this->service->markActive($session);

    $this->service->finalize($appointment->fresh(), $this->doctor, $this->soap, $this->vitals);

    // A signed record must not leave a joinable channel behind — mayJoinRoom()
    // authorizes on live call state.
    $fresh = $session->fresh();

    expect($fresh->consultation_status)->toBe('ended')
        ->and($this->service->mayJoinRoom($this->doctor, $fresh->room_id))->toBeFalse();
});

it('refuses to reopen a room against a finalized note', function () {
    $appointment = ($this->virtualVisit)();
    $this->service->finalize($appointment, $this->doctor, $this->soap, $this->vitals);

    expect(fn () => $this->service->openVirtualRoom($appointment->fresh(), $this->doctor))
        ->toThrow(InvalidConsultationTransitionException::class);
});

// ── ICE server shaping ────────────────────────────────────────────────────────

it('shapes stun-only config into a single RTCIceServer entry', function () {
    config(['webrtc.stun_urls' => ['stun:a:1'], 'webrtc.turn_urls' => []]);

    expect($this->service->iceServers())->toBe([['urls' => ['stun:a:1']]]);
});

it('adds credentials only when a turn url is configured', function () {
    config([
        'webrtc.stun_urls' => ['stun:a:1'],
        'webrtc.turn_urls' => ['turn:b:2'],
        'webrtc.turn_username' => 'u',
        'webrtc.turn_credential' => 'p',
    ]);

    expect($this->service->iceServers())->toBe([
        ['urls' => ['stun:a:1']],
        ['urls' => ['turn:b:2'], 'username' => 'u', 'credential' => 'p'],
    ]);
});
