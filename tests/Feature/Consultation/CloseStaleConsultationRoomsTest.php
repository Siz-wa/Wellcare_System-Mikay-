<?php

use App\Events\WebRtcSignal;
use App\Models\Appointment;
use App\Models\ConsultationSession;
use App\Models\Patient;
use App\Services\ConsultationSessionService;
use Illuminate\Support\Facades\Event;

/**
 * The stale-room sweep.
 *
 * Nothing else in this application ends an abandoned call. Every close path is a
 * deliberate act by a person — End Call, Finalize, Complete — and none of them
 * runs when the doctor shuts the laptop or the browser crashes. The row stays
 * `waiting`/`active` with `ended_at` NULL forever, and while it does, gate 2 of
 * mayJoinRoom() keeps returning true: the room is still a live, subscribable,
 * private audio/video channel for both participants.
 *
 * So these tests are about a privacy boundary, not tidiness, and the last one —
 * that a closed room is genuinely no longer joinable — is the one that matters.
 */
beforeEach(function () {
    Event::fake([WebRtcSignal::class]);

    $this->service = app(ConsultationSessionService::class);
    $this->doctor = userWithRole('doctor');
    $this->booker = userWithRole('user');
    $this->record = Patient::factory()->forGuarantor($this->booker)->create();

    $this->openRoom = function (string $startedAt, string $time = '09:00 AM') {
        $appointment = Appointment::factory()
            ->forPatient($this->record)
            ->forDoctor($this->doctor)
            ->virtual()
            ->create(['status' => 'checked_in', 'appointment_time' => $time]);

        $session = $this->service->openVirtualRoom($appointment, $this->doctor);
        $session->update(['started_at' => $startedAt]);

        return $session->fresh();
    };
});

it('closes a room that was left open past the cutoff', function () {
    $stale = ($this->openRoom)(now()->subHours(9)->toDateTimeString());

    $this->artisan('consultations:close-stale')->assertSuccessful();

    expect($stale->fresh()->consultation_status)->toBe('ended')
        ->and($stale->fresh()->ended_at)->not->toBeNull();
});

/**
 * "Closed 0" has two completely different meanings and the output used to give
 * no way to tell them apart. On a run where every room happened to be `ended`
 * already, the command reported zero and read as broken while working perfectly.
 */
it('says how many rooms it considered, not just how many it closed', function () {
    ($this->openRoom)(now()->subMinutes(5)->toDateTimeString());

    $this->artisan('consultations:close-stale')
        ->expectsOutputToContain('Closed 0 of 1 open virtual room(s)')
        ->assertSuccessful();
});

it('says plainly when there was nothing open at all', function () {
    $this->artisan('consultations:close-stale')
        ->expectsOutputToContain('No rooms were open')
        ->assertSuccessful();
});

it('leaves a room that is still within the window alone', function () {
    // A long consultation is not an abandoned one. Closing a call the doctor is
    // still on would be far worse than leaving a dead row for another hour.
    $live = ($this->openRoom)(now()->subMinutes(20)->toDateTimeString());

    $this->artisan('consultations:close-stale')->assertSuccessful();

    expect($live->fresh()->consultation_status)->toBe('waiting');
});

it('honours a custom cutoff', function () {
    $session = ($this->openRoom)(now()->subHours(2)->toDateTimeString());

    $this->artisan('consultations:close-stale', ['--hours' => 1])->assertSuccessful();

    expect($session->fresh()->consultation_status)->toBe('ended');
});

it('tells anyone still on the page that the room closed', function () {
    // Ends through the service rather than a bulk UPDATE precisely so this
    // fires. A participant who genuinely is still sitting there is told, instead
    // of being left on a frozen frame with a running timer.
    $stale = ($this->openRoom)(now()->subHours(9)->toDateTimeString());

    $this->artisan('consultations:close-stale')->assertSuccessful();

    Event::assertDispatched(WebRtcSignal::class, fn (WebRtcSignal $e) => $e->type === 'bye'
        && $e->roomId === $stale->room_id);
});

it('ignores in-person sessions and rooms that are already ended', function () {
    // An in-person session has no room and no channel; "closing" it would write
    // an ended_at onto a visit that was never a call.
    $inPerson = ConsultationSession::factory()->create([
        'mode' => 'in_person',
        'consultation_status' => 'waiting',
        'started_at' => now()->subDays(3),
    ]);

    $alreadyEnded = ($this->openRoom)(now()->subDays(3)->toDateTimeString(), '10:00 AM');
    $this->service->endCall($alreadyEnded);
    $endedAt = $alreadyEnded->fresh()->ended_at;

    Event::fake([WebRtcSignal::class]);

    $this->artisan('consultations:close-stale')->assertSuccessful();

    expect($inPerson->fresh()->consultation_status)->toBe('waiting')
        // Idempotent: no second bye for a room that was already closed, and the
        // original ended_at is not overwritten with a later one.
        ->and($alreadyEnded->fresh()->ended_at->toDateTimeString())->toBe($endedAt->toDateTimeString());

    Event::assertNotDispatched(WebRtcSignal::class);
});

it('makes a swept room unjoinable', function () {
    $stale = ($this->openRoom)(now()->subHours(9)->toDateTimeString());

    expect($this->service->mayJoinRoom($this->booker, $stale->room_id))->toBeTrue();

    $this->artisan('consultations:close-stale')->assertSuccessful();

    // The entire point. Before this command, that bookmark stayed good forever.
    expect($this->service->mayJoinRoom($this->booker, $stale->room_id))->toBeFalse()
        ->and($this->service->mayJoinRoom($this->doctor, $stale->room_id))->toBeFalse();
});
