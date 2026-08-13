<?php

use App\Events\WebRtcSignal;
use App\Models\Appointment;
use App\Models\Patient;
use App\Services\ConsultationSessionService;
use Illuminate\Support\Facades\Event;

/**
 * The HTTP half of the consultation room — the signalling relay, the room
 * pages, and the doctor's start-virtual action.
 *
 * ConsultationChannelAuthTest covers the rule; this covers the *doors*. The
 * same mayJoinRoom() guards the WebSocket subscribe and these endpoints, and
 * an endpoint that forgot to call it would leak exactly as badly as an
 * unguarded channel: the relay forwards SDP and ICE candidates, so an
 * unauthorized caller could inject an offer and be connected to a live
 * consultation without ever touching the WebSocket.
 *
 * The relay routes sit in a plain `auth` group with no `role:` middleware, by
 * design — the doctor and the patient are symmetric participants. These tests
 * are what stop that from becoming an accident.
 */
beforeEach(function () {
    Event::fake([WebRtcSignal::class]);

    $this->service = app(ConsultationSessionService::class);

    $this->doctor = userWithRole('doctor');
    $this->otherDoctor = userWithRole('doctor');
    $this->booker = userWithRole('user');
    $this->stranger = userWithRole('user');

    $this->record = Patient::factory()->forGuarantor($this->booker)->create();

    $this->appointment = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => 'checked_in']);

    $this->session = $this->service->openVirtualRoom($this->appointment, $this->doctor);
    $this->roomId = $this->session->room_id;
});

// ── The relay ─────────────────────────────────────────────────────────────────

it('relays a signal for each participant and broadcasts it', function (string $actor) {
    $this->actingAs($this->{$actor})
        ->postJson("/consultations/rooms/{$this->roomId}/signal", [
            'type' => 'offer',
            'payload' => ['sdp' => 'v=0...'],
        ])
        ->assertOk()
        ->assertJson(['sent' => true]);

    Event::assertDispatched(WebRtcSignal::class, fn (WebRtcSignal $e) => $e->roomId === $this->roomId
        && $e->type === 'offer'
        && $e->fromUserId === $this->{$actor}->id);
})->with(['doctor', 'booker']);

it('refuses to relay for anyone who is not a participant', function (string $actor) {
    $this->actingAs($this->{$actor})
        ->postJson("/consultations/rooms/{$this->roomId}/signal", [
            'type' => 'offer',
            'payload' => ['sdp' => 'malicious'],
        ])
        ->assertForbidden();

    // The important half: nothing reached the other peer.
    Event::assertNotDispatched(WebRtcSignal::class);
})->with(['otherDoctor', 'stranger']);

it('refuses to relay for a guest', function () {
    $this->postJson("/consultations/rooms/{$this->roomId}/signal", [
        'type' => 'offer',
        'payload' => [],
    ])->assertUnauthorized();

    Event::assertNotDispatched(WebRtcSignal::class);
});

it('rejects a signal type outside the protocol', function () {
    $this->actingAs($this->doctor)
        ->postJson("/consultations/rooms/{$this->roomId}/signal", [
            'type' => 'execute',
            'payload' => [],
        ])
        ->assertStatus(422);

    Event::assertNotDispatched(WebRtcSignal::class);
});

/**
 * The two non-WebRTC message types.
 *
 * `state` carries mic/camera on-off so a muted peer is not mistaken for a broken
 * call. `peer-left` is the client's own `pagehide` beacon — React does not run
 * effect cleanups on unload, so before it a refresh left the other party on a
 * frozen frame for the ~30s it takes ICE consent to expire.
 *
 * Both are relayed, neither touches the room's state. That is the whole point of
 * `peer-left` being a separate type from `bye`: `bye` closes the room and no
 * client may forge one — it is only ever emitted by endCall().
 */
it('relays the non-webrtc message types without touching the room', function (string $type, array $payload) {
    $this->actingAs($this->booker)
        ->postJson("/consultations/rooms/{$this->roomId}/signal", [
            'type' => $type,
            'payload' => $payload,
        ])
        ->assertOk();

    Event::assertDispatched(WebRtcSignal::class, fn (WebRtcSignal $e) => $e->type === $type
        && $e->fromUserId === $this->booker->id);

    expect($this->session->fresh()->consultation_status)->toBe('waiting');
})->with([
    'mute state' => ['state', ['mic' => false, 'camera' => true]],
    'departure beacon' => ['peer-left', []],
]);

/**
 * The beacon posts JSON with the CSRF token in the body, because
 * `navigator.sendBeacon` cannot set headers. Laravel reads `_token` from a
 * decoded JSON body, so the extra key rides along in the same payload as the
 * signal itself and must not upset validation.
 *
 * The CSRF half cannot be asserted here — the middleware is skipped entirely
 * under `runningUnitTests()`. This pins the body shape.
 */
it('accepts the departure beacon body shape', function () {
    $this->actingAs($this->booker)
        ->postJson("/consultations/rooms/{$this->roomId}/signal", [
            '_token' => 'irrelevant-under-runningUnitTests',
            'type' => 'peer-left',
            'payload' => [],
        ])
        ->assertOk();

    Event::assertDispatched(WebRtcSignal::class);
});

it('gives an unknown room the same 403 as an unauthorized one', function () {
    // Not a 404: a different status for "no such room" turns this endpoint into
    // an oracle for probing which room ids exist.
    $this->actingAs($this->doctor)
        ->postJson('/consultations/rooms/does-not-exist/signal', ['type' => 'hello', 'payload' => []])
        ->assertForbidden();
});

// ── join / leave ──────────────────────────────────────────────────────────────

it('marks the call active when a participant joins', function () {
    $this->actingAs($this->booker)
        ->postJson("/consultations/rooms/{$this->roomId}/join")
        ->assertOk()
        ->assertJson(['status' => 'active']);

    expect($this->session->fresh()->consultation_status)->toBe('active');
});

it('ends the call when the DOCTOR leaves, without finalizing the note or completing the visit', function () {
    $this->actingAs($this->doctor)
        ->postJson("/consultations/rooms/{$this->roomId}/leave")
        ->assertOk();

    // A hang-up, a refresh and a dropped connection are indistinguishable here.
    // None of them means the consultation is documented.
    expect($this->session->fresh())
        ->consultation_status->toBe('ended')
        ->status->toBe('draft')
        ->and($this->appointment->fresh()->status)->toBe('in_progress');
});

/**
 * An SDP must reach the far peer byte for byte.
 *
 * SDP is a CRLF-delimited format in which every line, including the last, must
 * be terminated. Laravel's global `TrimStrings` middleware runs `Str::trim()`
 * over every string in the request — nested ones included — so by default it
 * deletes the offer's final `\r\n` and the receiving browser rejects the entire
 * session description with "Invalid SDP line".
 *
 * That defect is invisible from the sending side: the POST returns 200, the
 * event broadcasts, nothing is logged, and only the *other* device throws. It
 * is also selective in a misleading way — `hello` has an empty payload and ICE
 * candidate strings carry no trailing whitespace, so those relay intact and
 * signalling appears half-working.
 *
 * This asserts the relay is byte-transparent, which is the property
 * ConsultationRoomController's docblock claims ("forwards an opaque payload").
 */
it('relays an SDP without altering a single byte', function () {
    // Trailing CRLF is the load-bearing part; the leading space and the empty
    // trailing line guard the other things a trim would silently eat.
    $sdp = "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\na=ssrc:382895626 msid:abc def\r\n";

    $this->actingAs($this->doctor)
        ->postJson("/consultations/rooms/{$this->roomId}/signal", [
            'type' => 'offer',
            'payload' => ['sdp' => $sdp, 'type' => 'offer'],
        ])
        ->assertOk();

    Event::assertDispatched(
        WebRtcSignal::class,
        fn (WebRtcSignal $event): bool => $event->payload['sdp'] === $sdp
    );
});

/**
 * Completing a visit from the list must close its video room.
 *
 * complete() marks the appointment terminal, which makes mayJoinRoom() fail its
 * "visit still open" gate — but it left the session row `waiting`/`active`, so
 * isLive() stayed true. The room page went on rendering and the patient's list
 * went on offering a Join Call button for a console that could never connect:
 * authorized-looking UI in front of a channel that refuses every subscribe.
 */
it('closes a live video room when the visit is completed from the list', function () {
    $this->service->markActive($this->session->fresh());

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$this->appointment->id}/complete")
        ->assertRedirect();

    expect($this->session->fresh()->consultation_status)->toBe('ended')
        ->and($this->appointment->fresh()->status)->toBe('completed');
});

it('lets the patient leave without closing the room, then rejoin', function () {
    $this->service->markActive($this->session->fresh());

    $this->actingAs($this->booker)
        ->postJson("/consultations/rooms/{$this->roomId}/leave")
        ->assertOk()
        ->assertJson(['status' => 'waiting']);

    // The room survives, so the join page still opens for them.
    $this->actingAs($this->booker)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertOk();
});

it('refuses join and leave to a non-participant', function (string $action) {
    $this->actingAs($this->stranger)
        ->postJson("/consultations/rooms/{$this->roomId}/{$action}")
        ->assertForbidden();

    expect($this->session->fresh()->consultation_status)->toBe('waiting');
})->with(['join', 'leave']);

// ── Room pages ────────────────────────────────────────────────────────────────

it('opens the doctor room page for the assigned doctor', function () {
    $this->actingAs($this->doctor)
        ->get("/doctor/consultations/{$this->appointment->id}/room")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('doctor/consultations/room/room')
            ->where('room.id', $this->roomId)
            ->where('isInitiator', true)
            ->has('iceServers')
            ->has('reverb.key')
        );
});

it('refuses the doctor room page to a different doctor', function () {
    $this->actingAs($this->otherDoctor)
        ->get("/doctor/consultations/{$this->appointment->id}/room")
        ->assertForbidden();
});

it('opens the patient room page for the booking account as the answerer', function () {
    $this->actingAs($this->booker)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/consultations/room')
            ->where('room.id', $this->roomId)
            // The doctor always offers; a fixed initiator is what lets the hook
            // skip perfect-negotiation.
            ->where('isInitiator', false)
        );
});

/**
 * Both room pages must ship the session's CSRF token as a prop.
 *
 * This is not defensive plumbing. The signalling layer is the only raw
 * `fetch()` in the app, and laravel-echo authorizes the private channel itself;
 * left alone both read `meta[name="csrf-token"]`, which app.blade.php renders
 * once per full document load. Inertia never re-renders <head>, and logging in
 * regenerates the session token — so from the first client-side navigation on,
 * that tag holds a token the session rejects. The room is reached by
 * `router.post(.../start-virtual)` + redirect, i.e. always a client-side
 * navigation, so it was always stale: every signal POST and
 * /broadcasting/auth answered 419, the peers exchanged nothing, and both sat on
 * "Waiting for the other person".
 *
 * Laravel logs nothing for a 419 and the CSRF middleware is skipped entirely
 * under `runningUnitTests()`, so no test can observe the rejection itself.
 * Asserting the prop is what stops it regressing — dropping it puts the client
 * straight back on the stale meta tag.
 */
it('hands both room pages a usable csrf token', function (string $actor, string $url, string $component) {
    $this->actingAs($this->{$actor})
        ->get($url)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component($component)
            ->where('csrfToken', session()->token())
        );
})->with([
    'doctor' => ['doctor', fn () => "/doctor/consultations/{$this->appointment->id}/room", 'doctor/consultations/room/room'],
    'patient' => ['booker', fn () => "/user/consultations/{$this->appointment->id}", 'user/consultations/room'],
]);

it('refuses the patient room page to another account', function () {
    $this->actingAs($this->stranger)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertForbidden();
});

/**
 * A closed room is a destination, not an error.
 *
 * This replaces an assertion that these 404'd, and the change is deliberate.
 * The 404 was reached by the most ordinary sequence there is: the call ends, the
 * patient presses back or reloads, and the visit has simultaneously vanished
 * from their consultations list — which only shows live rooms. A patient whose
 * connection dropped mid-consultation therefore had no route back in and nothing
 * on screen to distinguish "the visit is over" from "my phone is broken".
 *
 * The room console must still never render for a dead room: a page that connects
 * to nothing is the hardest failure to diagnose from a phone.
 */
it('shows the patient why a room is closed instead of 404ing', function (string $arrange, string $reason) {
    match ($arrange) {
        'ended' => $this->service->endCall($this->session),
        'finalized' => $this->service->finalize(
            $this->appointment->fresh(),
            $this->doctor,
            ['subjective' => 'Cough'],
            [],
        ),
        'never_opened' => $this->session->delete(),
    };

    $this->actingAs($this->booker)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/consultations/closed')
            ->where('reason', $reason)
        );
})->with([
    'the call ended' => ['ended', 'ended'],
    'the note was signed' => ['finalized', 'finalized'],
    'no room was ever opened' => ['never_opened', 'not_open'],
]);

it('still refuses a closed room to someone who is not the booker', function () {
    $this->service->endCall($this->session);

    // The closed page carries the visit's service, date and doctor. Softening
    // the 404 must not soften the 403 that sits in front of it.
    $this->actingAs($this->stranger)
        ->get("/user/consultations/{$this->appointment->id}")
        ->assertForbidden();
});

it('sends the doctor back to their list when the room is closed', function () {
    $this->service->endCall($this->session);

    // Was a 404. The doctor reaches this by refreshing after their own End Call,
    // and a bare error page gave them no route onward — the list is one click
    // from reopening the room, which is what they want next.
    $this->actingAs($this->doctor)
        ->get("/doctor/consultations/{$this->appointment->id}/room")
        ->assertRedirect('/doctor/consultations')
        ->assertSessionHas('error');
});

/**
 * The single most time-critical notification in the app.
 *
 * `consultation_started` had no case in urlForNotification(), so it fell through
 * to the patient dashboard — which has no join button — while a doctor sat in a
 * room waiting for them.
 */
it('points the room-open notification at the consultations list', function () {
    $this->actingAs($this->booker)
        ->get('/user/consultations')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.0.type', 'consultation_started')
            ->where('notifications.0.action_url', '/user/consultations')
        );
});

it('lists only live rooms on the patient consultations index', function () {
    // A second virtual visit whose call was already closed must not appear —
    // this page is a door, not a history.
    $closed = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => 'checked_in', 'appointment_time' => '11:00 AM']);

    $this->service->endCall($this->service->openVirtualRoom($closed, $this->doctor));

    $this->actingAs($this->booker)
        ->get('/user/consultations')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/consultations/consultations')
            ->has('consultations', 1)
            ->where('consultations.0.id', $this->appointment->id)
        );
});

// ── start-virtual ─────────────────────────────────────────────────────────────

it('lets the assigned doctor open a room and redirects into it', function () {
    $fresh = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => 'checked_in', 'appointment_time' => '01:00 PM']);

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$fresh->id}/start-virtual")
        ->assertRedirect("/doctor/consultations/{$fresh->id}/room");
});

it('refuses start-virtual to a different doctor', function () {
    $this->actingAs($this->otherDoctor)
        ->post("/doctor/consultations/{$this->appointment->id}/start-virtual")
        ->assertForbidden();
});

it('reports a friendly error rather than opening a room for an in-person booking', function () {
    $inPerson = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->create(['status' => 'checked_in', 'appointment_time' => '02:00 PM']);

    $this->actingAs($this->doctor)
        ->post("/doctor/consultations/{$inPerson->id}/start-virtual")
        ->assertSessionHasErrors('consultation');
});
