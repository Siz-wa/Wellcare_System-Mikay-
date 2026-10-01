<?php

use App\Models\Appointment;
use App\Models\AvailabilityBlock;
use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use Carbon\Carbon;

/**
 * Roster governance — the doctor proposes, the clinic publishes.
 *
 * Before Phase 9 a doctor set their own bookable hours with immediate effect
 * and no oversight whatsoever. Now those hours are a proposal: they generate no
 * slots until an administrator publishes them.
 *
 * The leak this file guards against has no visible symptom. BookingService
 * reads availability in two separate places — the day-of-week lookup behind
 * hasSchedule() and getAvailabilityBlocksForDate() behind slot generation — and
 * omitting scopePublished() in either one silently publishes hours nobody
 * approved. Both are asserted here rather than left to review.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
    $this->doctor = userWithRole('doctor');

    DoctorProfile::create([
        'user_id' => $this->doctor->id,
        'display_name' => 'Dr. Roster',
        'specialty' => 'general',
        'is_active' => true,
    ]);
});

function proposeWeek($test): void
{
    $test->actingAs($test->doctor)->put('/doctor/availability/weekly', [
        'days' => [
            ['iso_day' => 1, 'start_time' => '09:00', 'end_time' => '11:00', 'slot_duration_minutes' => 30],
        ],
    ]);
}

function monday(): string
{
    return Carbon::parse('next monday')->toDateString();
}

// ── The proposal ──────────────────────────────────────────────────────────────

it('files a doctors weekly hours as pending, not live', function () {
    proposeWeek($this);

    $block = AvailabilityBlock::where('doctor_id', $this->doctor->id)->firstOrFail();

    expect($block->approval_status)->toBe(AvailabilityBlock::APPROVAL_PENDING)
        ->and($block->submitted_at)->not->toBeNull()
        ->and($block->approved_by)->toBeNull();
});

it('generates no slots from a schedule awaiting approval', function () {
    proposeWeek($this);

    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, monday()))
        ->toBeEmpty();
});

it('reports no schedule while the hours are only proposed', function () {
    proposeWeek($this);

    // hasSchedule() is the second read path. Unscoped it would report true and
    // the booking UI would render "Fully Booked" for a doctor who has simply
    // not been approved yet — the wrong message for the wrong reason.
    expect(app(BookingService::class)->hasSchedule($this->doctor->id, monday()))
        ->toBeFalse();
});

it('keeps the published hours bookable while a change waits for approval', function () {
    proposeWeek($this);
    $this->actingAs($this->admin)->post("/admin/staff/{$this->doctor->id}/schedule/publish");

    // A new proposal (Monday afternoon instead of morning) must not take the
    // doctor off the booking system before anyone has approved it.
    $this->actingAs($this->doctor)->put('/doctor/availability/weekly', [
        'days' => [
            ['iso_day' => 1, 'start_time' => '13:00', 'end_time' => '15:00', 'slot_duration_minutes' => 30],
        ],
    ]);

    $slots = app(BookingService::class)->getAvailableSlots($this->doctor->id, monday());
    expect($slots)->not->toBeEmpty()->and($slots[0])->toBe('9:00 AM');

    $this->actingAs($this->admin)->post("/admin/staff/{$this->doctor->id}/schedule/publish");

    app(BookingService::class)->bustDoctorSlotCache($this->doctor->id);
    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, monday())[0])->toBe('1:00 PM')
        ->and(AvailabilityBlock::where('doctor_id', $this->doctor->id)->count())->toBe(1);
});

it('queues nothing when a doctor re-saves unchanged hours', function () {
    proposeWeek($this);
    $this->actingAs($this->admin)->post("/admin/staff/{$this->doctor->id}/schedule/publish");

    proposeWeek($this);

    expect(AvailabilityBlock::awaitingApproval()->where('doctor_id', $this->doctor->id)->exists())->toBeFalse()
        ->and(app(BookingService::class)->getAvailableSlots($this->doctor->id, monday()))->not->toBeEmpty();
});

// ── Publishing ────────────────────────────────────────────────────────────────

it('makes the hours bookable when an administrator publishes them', function () {
    proposeWeek($this);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/schedule/publish")
        ->assertRedirect()
        ->assertSessionHas('success');

    $block = AvailabilityBlock::where('doctor_id', $this->doctor->id)->firstOrFail();

    expect($block->approval_status)->toBe(AvailabilityBlock::APPROVAL_PUBLISHED)
        ->and($block->approved_by)->toBe($this->admin->id)
        ->and($block->approved_at)->not->toBeNull();

    // Bookable immediately — a stale 60s slot cache would hide the hours the
    // doctor was just told are live.
    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, monday()))
        ->toHaveCount(4) // 09:00, 09:30, 10:00, 10:30
        ->and(app(BookingService::class)->hasSchedule($this->doctor->id, monday()))->toBeTrue();
});

it('tells the administrator when there is nothing to publish', function () {
    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/schedule/publish")
        ->assertRedirect()
        ->assertSessionHas('error');
});

// ── Sending it back ───────────────────────────────────────────────────────────

it('returns a rejected schedule to the doctor as a draft with the reason', function () {
    proposeWeek($this);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/schedule/reject", [
            'remarks' => 'Clashes with the Monday laboratory rounds.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $block = AvailabilityBlock::where('doctor_id', $this->doctor->id)->firstOrFail();

    // Kept as a draft rather than deleted, so the doctor edits what they
    // proposed instead of rebuilding it from an empty page.
    expect($block->approval_status)->toBe(AvailabilityBlock::APPROVAL_DRAFT)
        ->and($block->review_remarks)->toBe('Clashes with the Monday laboratory rounds.');

    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, monday()))
        ->toBeEmpty();
});

it('requires a reason when sending a schedule back', function () {
    proposeWeek($this);

    $this->actingAs($this->admin)
        ->post("/admin/staff/{$this->doctor->id}/schedule/reject", ['remarks' => ''])
        ->assertSessionHasErrors('remarks');
});

// ── Time off is exempt ────────────────────────────────────────────────────────

it('applies time off immediately without waiting for approval', function () {
    proposeWeek($this);
    app(AvailabilityService::class)->publishSchedule($this->doctor->id, $this->admin);

    expect(app(BookingService::class)->getAvailableSlots($this->doctor->id, monday()))
        ->not->toBeEmpty();

    $this->actingAs($this->doctor)
        ->post('/doctor/availability/time-off', [
            'date' => monday(),
            'reason' => 'Emergency leave.',
        ])
        ->assertRedirect();

    $timeOff = AvailabilityBlock::where('doctor_id', $this->doctor->id)
        ->whereNotNull('specific_date')
        ->firstOrFail();

    // A doctor who cannot attend must be able to close the day now. If the
    // blackout were queued for approval, scopePublished() would filter it out
    // and the day would quietly stay open — the opposite of what was asked.
    expect($timeOff->approval_status)->toBe(AvailabilityBlock::APPROVAL_PUBLISHED)
        ->and(app(BookingService::class)->getAvailableSlots($this->doctor->id, monday()))
        ->toBeEmpty();
});

it('still cancels booked appointments when time off is taken', function () {
    proposeWeek($this);
    app(AvailabilityService::class)->publishSchedule($this->doctor->id, $this->admin);

    $patient = Patient::factory()->create();
    $appointment = Appointment::factory()
        ->forPatient($patient)
        ->forDoctor($this->doctor)
        ->create(['appointment_date' => monday(), 'status' => 'confirmed']);

    $this->actingAs($this->doctor)->post('/doctor/availability/time-off', [
        'date' => monday(),
        'reason' => 'Emergency leave.',
    ]);

    expect($appointment->fresh()->status)->toBe('cancelled');
});

// ── The queue ─────────────────────────────────────────────────────────────────

it('lists doctors with hours awaiting a decision', function () {
    proposeWeek($this);

    $this->actingAs($this->admin)
        ->get('/admin/staff/roster')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/staff/roster')
            ->has('pending', 1)
            ->where('pending.0.doctorId', $this->doctor->id)
            ->has('pending.0.days', 1)
        );
});

it('drops a doctor off the queue once published', function () {
    proposeWeek($this);
    $this->actingAs($this->admin)->post("/admin/staff/{$this->doctor->id}/schedule/publish");

    $this->actingAs($this->admin)
        ->get('/admin/staff/roster')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('pending', 0));
});
