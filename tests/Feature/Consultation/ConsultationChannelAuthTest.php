<?php

use App\Events\WebRtcSignal;
use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Services\ConsultationSessionService;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Support\Str;

/**
 * **The security boundary for the entire virtual-consultation feature.**
 *
 * An unauthorized subscribe to `consultation.{roomId}` is a live audio and
 * video leak of a medical consultation — not a data disclosure that can be
 * revoked afterwards, but a stranger silently present in a clinical
 * conversation. This is the most consequential authorization rule in the
 * codebase and it gets the most direct test.
 *
 * The rule has ONE implementation, ConsultationSessionService::mayJoinRoom(),
 * used by both routes/channels.php (WebSocket subscribe) and
 * ConsultationRoomController (HTTP relay). These tests exercise the shared
 * method, plus a registry assertion that the channel is actually wired to it —
 * a perfect method that nothing calls would pass every behavioural test here.
 *
 * Two things are asserted that are easy to get wrong:
 *
 *   1. **A different doctor is refused.** `role:doctor` answers "is this user a
 *      doctor?", never "is this user THIS consultation's doctor?". A role-only
 *      guard would admit every doctor in the clinic to every room, and it would
 *      look correct in any test that only tried a patient.
 *
 *   2. **The guarantor is not automatically a participant.** The room scopes on
 *      `appointments.user_id`, not `patients.guarantor_id`. Because
 *      Patient::findOrCreateFromBooking() sets guarantor_id once and never
 *      updates it, the two can point at different accounts — see the last test.
 */
beforeEach(function () {
    $this->service = app(ConsultationSessionService::class);

    $this->doctor = userWithRole('doctor');
    $this->otherDoctor = userWithRole('doctor');
    $this->booker = userWithRole('user');
    $this->stranger = userWithRole('user');
    $this->nurse = userWithRole('nurse');
    $this->admin = userWithRole('admin');

    $this->record = Patient::factory()->forGuarantor($this->booker)->create();

    $this->appointment = Appointment::factory()
        ->forPatient($this->record)
        ->forDoctor($this->doctor)
        ->virtual()
        ->create(['status' => 'checked_in']);

    $this->session = $this->service->openVirtualRoom($this->appointment, $this->doctor);
    $this->roomId = $this->session->room_id;
});

// ── The channel is actually wired to the rule ─────────────────────────────────

it('registers the consultation channel', function () {
    // Asserted against the registry rather than an HTTP call: the claim is that
    // this channel exists at all, not that one subscribe happened to succeed.
    // A flawless mayJoinRoom() that nothing is wired to would pass every other
    // test in this file.
    $channels = app(Broadcaster::class)->getChannels()->keys();

    expect($channels)->toContain('consultation.{roomId}');
});

/**
 * **The presence conversion, asserted where it can actually fail.**
 *
 * The registry test above passes whether this channel is private or presence —
 * Laravel registers `consultation.{roomId}` once and resolves both
 * `private-consultation.X` and `presence-consultation.X` to the same callback.
 * So a half-converted state (say, the event still broadcasting on a
 * PrivateChannel while the client subscribes with `join`) authorizes perfectly
 * and then delivers nothing, logging nothing on either side. That is the same
 * silent-failure shape as the CSRF defect this feature already burned cycles on.
 *
 * Two things are pinned here, and both must hold together:
 *   1. the callback returns an ARRAY for an authorized member, not `true`
 *   2. the event publishes to `presence-consultation.{roomId}`
 *
 * Returning `true` is the subtle wrong answer: Laravel treats any truthy value
 * as authorized, so the subscribe succeeds and only the member payload is
 * empty — meaning `here`/`joining`/`leaving` carry no id and the client cannot
 * tell which participant left.
 */
it('authorizes the room as a presence channel carrying the member identity', function (string $actor) {
    $callback = app(Broadcaster::class)->getChannels()->get('consultation.{roomId}');

    $member = $callback($this->{$actor}, $this->roomId);

    expect($member)->toBeArray()
        ->and($member['id'])->toBe($this->{$actor}->id)
        ->and($member)->toHaveKey('name');
})->with(['doctor', 'booker']);

it('refuses a non-participant from the presence roster', function () {
    $callback = app(Broadcaster::class)->getChannels()->get('consultation.{roomId}');

    // Must be falsy, never an empty array — an array is authorization.
    expect($callback($this->stranger, $this->roomId))->toBeFalse();
});

it('publishes signals on the presence channel the client subscribes to', function () {
    $channel = (new WebRtcSignal(
        roomId: $this->roomId,
        type: 'hello',
        payload: [],
        fromUserId: $this->doctor->id,
    ))->broadcastOn();

    // `presence-` prefix, matching echo.join() on the client. If this reverts to
    // a PrivateChannel the name becomes `private-consultation.X`, every
    // subscriber goes on listening to a channel nobody publishes to, and the
    // room simply never connects.
    expect($channel)->toBeInstanceOf(PresenceChannel::class)
        ->and($channel->name)->toBe("presence-consultation.{$this->roomId}");
});

// ── Who may join ──────────────────────────────────────────────────────────────

it('admits the assigned doctor', function () {
    expect($this->service->mayJoinRoom($this->doctor, $this->roomId))->toBeTrue();
});

it('admits the account that booked the appointment', function () {
    expect($this->service->mayJoinRoom($this->booker, $this->roomId))->toBeTrue();
});

// ── Who may not ───────────────────────────────────────────────────────────────

it('refuses a different doctor', function () {
    // The one that role-based thinking gets wrong.
    expect($this->service->mayJoinRoom($this->otherDoctor, $this->roomId))->toBeFalse();
});

it('refuses every other role and every unrelated account', function (string $actor) {
    expect($this->service->mayJoinRoom($this->{$actor}, $this->roomId))->toBeFalse();
})->with(['otherDoctor', 'stranger', 'nurse', 'admin']);

it('refuses an unknown room id', function () {
    expect($this->service->mayJoinRoom($this->doctor, 'not-a-real-room'))->toBeFalse();
});

// ── State closes the room ─────────────────────────────────────────────────────

it('refuses both participants once the call has ended', function () {
    $this->service->endCall($this->session);

    expect($this->service->mayJoinRoom($this->doctor, $this->roomId))->toBeFalse()
        ->and($this->service->mayJoinRoom($this->booker, $this->roomId))->toBeFalse();
});

it('refuses both participants once the note is finalized', function () {
    $this->service->finalize($this->appointment->fresh(), $this->doctor, [], []);

    expect($this->service->mayJoinRoom($this->doctor, $this->roomId))->toBeFalse()
        ->and($this->service->mayJoinRoom($this->booker, $this->roomId))->toBeFalse();
});

it('refuses both participants once the appointment reaches a terminal state', function (string $status) {
    $this->appointment->update(['status' => $status]);

    expect($this->service->mayJoinRoom($this->doctor, $this->roomId))->toBeFalse()
        ->and($this->service->mayJoinRoom($this->booker, $this->roomId))->toBeFalse();
})->with(['completed', 'cancelled', 'no_show']);

it('refuses a room on a soft-deleted appointment', function () {
    $this->appointment->delete();

    // belongsTo respects SoftDeletes, so the appointment resolves to null and
    // the null branch refuses. Worth pinning: a trashed appointment with a
    // live session row is exactly the state an archive/restore cycle produces.
    expect($this->service->mayJoinRoom($this->doctor, $this->roomId))->toBeFalse();
});

it('refuses a session that was never made virtual', function () {
    $session = ConsultationSession::factory()->create([
        'room_id' => (string) Str::uuid(),
        'consultation_status' => 'waiting',
        'mode' => 'in_person',
    ]);

    expect($this->service->mayJoinRoom($this->doctor, $session->room_id))->toBeFalse();
});

// ── The guarantor / booker split ──────────────────────────────────────────────

it('admits the booking account and refuses the guarantor when they differ', function () {
    // Patient::findOrCreateFromBooking() sets guarantor_id only at creation and
    // never updates it, so a second account booking for the same person gets
    // user_id = B against a patient still guaranteed by A. Scoping the room on
    // guarantor_id would invert this test: it would admit A, a stranger to this
    // visit, and lock out B who booked it and checked in.
    $secondAccount = userWithRole('user');

    $appointment = Appointment::factory()
        ->forDoctor($this->doctor)
        ->virtual()
        ->create([
            'patient_id' => $this->record->id,   // guaranteed by $this->booker
            'user_id' => $secondAccount->id,     // but booked by someone else
            'status' => 'checked_in',
            // Distinct slot: `active_slot_key` is a generated column unique on
            // (doctor, date, time), so reusing the beforeEach slot is a 1062.
            'appointment_time' => '10:30 AM',
        ]);

    $roomId = $this->service->openVirtualRoom($appointment, $this->doctor)->room_id;

    expect($this->service->mayJoinRoom($secondAccount, $roomId))->toBeTrue()
        ->and($this->service->mayJoinRoom($this->booker, $roomId))->toBeFalse();
});
