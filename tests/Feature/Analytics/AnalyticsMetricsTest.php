<?php

use App\Models\Appointment;
use App\Models\LoaRequest;
use App\Models\Patient;
use App\Services\AnalyticsService;

/**
 * The numbers themselves, against fixtures whose totals are known by hand.
 *
 * A dashboard that renders is not a dashboard that is right, and every defect
 * this file guards against is silent: a rate that divides by zero, an archived
 * record inflating a total, a pending request counted as an instant decision.
 * None of them raises — they just print a plausible wrong number, which on a
 * clinic report is worse than a crash.
 */
beforeEach(function () {
    $this->analytics = app(AnalyticsService::class);
});

// ── Empty ranges ──────────────────────────────────────────────────────────────

/**
 * The normal state of a freshly migrated database, and the one that turns every
 * rate into a division by zero if it is not guarded.
 */
it('returns zeroes rather than NAN when nothing happened in the range', function () {
    $performance = $this->analytics->clinicPerformance('30d');

    expect($performance['stats']['total'])->toBe(0)
        ->and($performance['stats']['completionRate'])->toBe(0.0)
        ->and($performance['stats']['cancellationRate'])->toBe(0.0)
        ->and($performance['stats']['noShowRate'])->toBe(0.0)
        ->and($performance['stats']['averageLeadTimeDays'])->toBe(0.0);

    $loa = $this->analytics->loaTurnaround('30d');

    expect($loa['stats']['approvalRate'])->toBe(0.0)
        ->and($loa['stats']['averageDecisionHours'])->toBe(0.0);

    $trends = $this->analytics->patientTrends('30d');

    expect($trends['stats']['newPatientShare'])->toBe(0.0);
});

it('still emits a full bucket series when every bucket is empty', function () {
    // A line chart that omits empty buckets draws a slope across a gap.
    expect($this->analytics->appointmentVolume('30d')['series'])->toHaveCount(30);
    expect($this->analytics->appointmentVolume('12m')['series'])->toHaveCount(12);
});

// ── Appointment rates ─────────────────────────────────────────────────────────

it('computes completion, cancellation and no-show rates over the range', function () {
    Appointment::factory()->count(5)->create([
        'appointment_date' => today()->subDays(3),
        'status' => 'completed',
    ]);
    Appointment::factory()->count(3)->create([
        'appointment_date' => today()->subDays(3),
        'status' => 'cancelled',
    ]);
    Appointment::factory()->count(2)->create([
        'appointment_date' => today()->subDays(3),
        'status' => 'no_show',
    ]);

    $stats = $this->analytics->clinicPerformance('30d')['stats'];

    expect($stats['total'])->toBe(10)
        ->and($stats['completionRate'])->toBe(50.0)
        ->and($stats['cancellationRate'])->toBe(30.0)
        ->and($stats['noShowRate'])->toBe(20.0);
});

it('excludes appointments outside the range', function () {
    Appointment::factory()->create(['appointment_date' => today()->subDays(3)]);
    Appointment::factory()->create(['appointment_date' => today()->subDays(200)]);

    expect($this->analytics->appointmentVolume('30d')['stats']['total'])->toBe(1)
        ->and($this->analytics->appointmentVolume('12m')['stats']['total'])->toBe(2);
});

/**
 * The admin Archive soft-deletes rather than destroying, so an archived
 * appointment is still a row. Default Eloquent scoping excludes it — asserted
 * rather than assumed, because a raw query added later would not.
 */
it('excludes archived appointments from every total', function () {
    Appointment::factory()->count(3)->create([
        'appointment_date' => today()->subDays(2),
        'status' => 'completed',
    ]);

    $archived = Appointment::factory()->create([
        'appointment_date' => today()->subDays(2),
        'status' => 'completed',
    ]);
    $archived->delete();

    expect($this->analytics->appointmentVolume('30d')['stats']['total'])->toBe(3)
        ->and($this->analytics->clinicPerformance('30d')['stats']['total'])->toBe(3);
});

// ── Lead time ─────────────────────────────────────────────────────────────────

/**
 * Back-entered records — a paper file typed in after the visit — have an
 * appointment date before their own creation date. They have no lead time to
 * average, and including them drags the mean negative, which is exactly what
 * the seeded database did before this filter existed.
 */
it('averages lead time over forward-booked appointments only', function () {
    // Booked 4 days ahead of a visit that has since happened. Every range is
    // backward-looking, so the appointment has to sit inside the window for
    // its lead time to be counted at all.
    Appointment::factory()->create([
        'appointment_date' => today()->subDays(3),
        'created_at' => now()->subDays(7),
    ]);

    // Back-entered: the visit happened 30 days ago and was typed in today.
    Appointment::factory()->create([
        'appointment_date' => today()->subDays(30),
        'created_at' => now(),
    ]);

    $stats = $this->analytics->clinicPerformance('90d')['stats'];

    expect($stats['leadTimeSample'])->toBe(1)
        ->and($stats['averageLeadTimeDays'])->toBe(4.0);
});

/**
 * Every range ends today, so a future booking is in none of them. Retrospective
 * is the right reading of Objective 1.5's "tracking and analyzing", but it is
 * a real property of these reports and is asserted rather than left implicit.
 */
it('reports on past appointments only, never on future bookings', function () {
    Appointment::factory()->create(['appointment_date' => today()->subDay()]);
    Appointment::factory()->create(['appointment_date' => today()->addDays(5)]);

    expect($this->analytics->appointmentVolume('12m')['stats']['total'])->toBe(1);
});

// ── Patient trends ────────────────────────────────────────────────────────────

it('splits new against returning bookings', function () {
    Appointment::factory()->count(3)->create([
        'appointment_date' => today()->subDay(),
        'patient_status' => 'new',
    ]);
    Appointment::factory()->create([
        'appointment_date' => today()->subDay(),
        'patient_status' => 'returning',
    ]);

    $stats = $this->analytics->patientTrends('30d')['stats'];

    expect($stats['newBookings'])->toBe(3)
        ->and($stats['returningBookings'])->toBe(1)
        ->and($stats['newPatientShare'])->toBe(75.0);
});

it('counts every registered patient but only in-range registrations', function () {
    Patient::factory()->count(2)->create(['created_at' => now()->subDays(2)]);
    Patient::factory()->create(['created_at' => now()->subDays(200)]);

    $stats = $this->analytics->patientTrends('30d')['stats'];

    expect($stats['totalPatients'])->toBe(3)
        ->and($stats['newRegistrations'])->toBe(2);
});

// ── LOA turnaround ────────────────────────────────────────────────────────────

/**
 * A request still sitting in the queue has not been decided. Averaging it in as
 * a zero-hour turnaround would make HR look faster the longer they leave work
 * undone — the metric would move in the wrong direction.
 */
it('averages decision time over decided requests only', function () {
    LoaRequest::factory()->approved()->create([
        'requested_at' => now()->subHours(10),
        'approved_at' => now()->subHours(6),   // 4 hours
    ]);
    LoaRequest::factory()->rejected()->create([
        'requested_at' => now()->subHours(10),
        'rejected_at' => now()->subHours(4),   // 6 hours
    ]);
    LoaRequest::factory()->create([
        'requested_at' => now()->subDays(20),  // still pending
    ]);

    $stats = $this->analytics->loaTurnaround('30d')['stats'];

    expect($stats['submitted'])->toBe(3)
        ->and($stats['pending'])->toBe(1)
        ->and($stats['averageDecisionHours'])->toBe(5.0)
        ->and($stats['approvalRate'])->toBe(50.0);
});

/**
 * Regression: the reported average was -284.9 hours against the development
 * database.
 *
 * Phase 2's backfill migration created LOA rows for HMO appointments that had
 * already been approved before `loa_requests` existed, so those rows carry a
 * decision timestamp earlier than their own submission. LoaService cannot
 * produce that — but the report read it without complaint and printed a
 * negative turnaround, which is the exact shape of silent defect this file
 * exists to catch.
 */
it('ignores requests whose decision predates their submission', function () {
    LoaRequest::factory()->approved()->create([
        'requested_at' => now()->subHours(6),
        'approved_at' => now()->subHours(2),      // a real 4-hour turnaround
    ]);

    LoaRequest::factory()->approved()->create([
        'requested_at' => now()->subDays(2),
        'approved_at' => now()->subDays(30),      // backfilled: decided first
    ]);

    $stats = $this->analytics->loaTurnaround('90d')['stats'];

    expect($stats['decisionSample'])->toBe(1)
        ->and($stats['averageDecisionHours'])->toBe(4.0)
        ->and($stats['averageDecisionHours'])->toBeGreaterThanOrEqual(0);
});

it('keeps backfilled requests in the counts even though they are untimed', function () {
    // Excluding them from the average must not make them vanish from the
    // register — they are real approvals and HR still granted that coverage.
    LoaRequest::factory()->approved()->create([
        'hmo_provider' => 'Maxicare',
        'requested_at' => now()->subDays(2),
        'approved_at' => now()->subDays(30),
    ]);

    $report = $this->analytics->loaTurnaround('90d');
    $maxicare = collect($report['byProvider'])->firstWhere('provider', 'Maxicare');

    expect($report['stats']['approved'])->toBe(1)
        ->and($report['stats']['decisionSample'])->toBe(0)
        ->and($maxicare['submitted'])->toBe(1)
        ->and($maxicare['approved'])->toBe(1)
        ->and($maxicare['averageHours'])->toBe(0.0);
});

it('ages the pending queue regardless of the selected range', function () {
    LoaRequest::factory()->create(['requested_at' => now()->subHours(2)]);
    LoaRequest::factory()->create(['requested_at' => now()->subDays(2)]);
    LoaRequest::factory()->create(['requested_at' => now()->subDays(200)]);

    // A 30-day window would hide the 200-day-old request, which is the single
    // one HR most needs to see.
    $ageing = collect($this->analytics->loaTurnaround('30d')['ageing'])
        ->pluck('value', 'label');

    expect($ageing['Under 24h'])->toBe(1)
        ->and($ageing['1–3 days'])->toBe(1)
        ->and($ageing['Over 7 days'])->toBe(1);
});

it('groups turnaround by hmo provider', function () {
    LoaRequest::factory()->approved()->create([
        'hmo_provider' => 'Maxicare',
        'requested_at' => now()->subDay(),
    ]);
    LoaRequest::factory()->rejected()->create([
        'hmo_provider' => 'Maxicare',
        'requested_at' => now()->subDay(),
    ]);
    LoaRequest::factory()->approved()->create([
        'hmo_provider' => 'Intellicare',
        'requested_at' => now()->subDay(),
    ]);

    $byProvider = collect($this->analytics->loaTurnaround('30d')['byProvider'])
        ->keyBy('provider');

    expect($byProvider['Maxicare']['submitted'])->toBe(2)
        ->and($byProvider['Maxicare']['approved'])->toBe(1)
        ->and($byProvider['Maxicare']['rejected'])->toBe(1)
        ->and($byProvider['Intellicare']['submitted'])->toBe(1);
});

// ── Doctor load ───────────────────────────────────────────────────────────────

/**
 * Utilisation divides by active days, not calendar days: a doctor holding one
 * clinic a week is not under-utilised on the days they do not work.
 */
it('measures doctor load against active days rather than calendar days', function () {
    $doctor = userWithRole('doctor');
    $doctor->doctorProfile()->create([
        'display_name' => 'Dr. Reyes',
        'specialty' => 'General',
        'max_patients_per_day' => 5,
    ]);

    // Four appointments across two working days. The times must differ:
    // `appointments_active_slot_unique` covers doctor + date + time, which is
    // the index DoubleBookingTest exists to protect.
    foreach (['09:00 AM', '10:00 AM'] as $time) {
        Appointment::factory()->forDoctor($doctor)->create([
            'appointment_date' => today()->subDays(7),
            'appointment_time' => $time,
            'status' => 'completed',
        ]);
        Appointment::factory()->forDoctor($doctor)->create([
            'appointment_date' => today()->subDays(14),
            'appointment_time' => $time,
            'status' => 'completed',
        ]);
    }

    // Cancelled: consumed a slot, not the doctor's time.
    Appointment::factory()->forDoctor($doctor)->create([
        'appointment_date' => today()->subDays(7),
        'appointment_time' => '11:00 AM',
        'status' => 'cancelled',
    ]);

    $load = collect($this->analytics->clinicPerformance('90d')['doctorLoad'])
        ->firstWhere('doctor', 'Dr. Reyes');

    expect($load['appointments'])->toBe(4)
        ->and($load['activeDays'])->toBe(2)
        ->and($load['averagePerDay'])->toBe(2.0)
        ->and($load['cap'])->toBe(5)
        ->and($load['utilisation'])->toBe(40.0);
});

// ── Range resolution ──────────────────────────────────────────────────────────

/**
 * A stale bookmark should show the default report, not an error — and on the
 * export route a validation redirect would save an HTML body under a .csv
 * filename, which reads as a corrupt download rather than a bad parameter.
 */
it('falls back to the default range when given a bad one', function () {
    $this->actingAs(userWithRole('hr'))
        ->get('/hr/analytics?range=nonsense')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', AnalyticsService::DEFAULT_RANGE));
});

it('still streams a csv when the export range is bad', function () {
    $response = $this->actingAs(userWithRole('hr'))
        ->get('/hr/analytics/export/appointment-volume?range=nonsense')
        ->assertOk();

    expect($response->headers->get('content-type'))->toContain('text/csv');
});

it('accepts every offered range', function (string $range) {
    $this->actingAs(userWithRole('hr'))
        ->get("/hr/analytics?range={$range}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', $range));
})->with(AnalyticsService::RANGES);
