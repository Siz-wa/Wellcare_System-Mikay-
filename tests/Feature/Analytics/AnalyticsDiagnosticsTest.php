<?php

use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Models\LoaRequest;
use App\Models\Patient;
use App\Models\User;
use App\Services\AnalyticsService;
use App\Services\ClinicDiagnosticsService;

/**
 * The reasoning behind the diagnostics, which is where this kind of feature
 * actually breaks.
 *
 * Access and export are already covered — adding `diagnostics` to
 * AnalyticsService::REPORTS extends AnalyticsAccessTest and AnalyticsExportTest
 * automatically, because both drive their datasets from that constant.
 *
 * What needs its own file is the statistics. A diagnostic fails silently and
 * convincingly: it reports a real number computed over the wrong population,
 * and there is nothing on screen to suggest anything went wrong. The tests here
 * pin the three guards that keep it honest — baseline comparison, small-sample
 * suppression, and thresholds that a single stray event cannot trip.
 */
beforeEach(function () {
    $this->diagnostics = app(ClinicDiagnosticsService::class);
    $this->hr = userWithRole('hr');
});

/**
 * A clean baseline population: enough completed appointments to make the
 * clinic-wide failure rate low, so a seeded problem segment stands out.
 *
 * Times are varied because `appointments_active_slot_unique` covers
 * doctor + date + time, and the factory assigns a fresh doctor per row only
 * when one is not pinned.
 */
function seedHealthyAppointments(int $count, string $coverage = 'cash'): void
{
    foreach (range(1, $count) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(10),
            'appointment_time' => sprintf('%02d:00 AM', ($index % 10) + 1),
            'status' => 'completed',
            'coverage' => $coverage,
            'service' => 'general',
        ]);
    }
}

// ── Empty data ────────────────────────────────────────────────────────────────

it('returns zeroes rather than NAN when there is nothing to diagnose', function () {
    $report = $this->diagnostics->report('30d');

    expect($report['failureDrivers']['baseline'])->toBe(0.0)
        ->and($report['failureDrivers']['totalFailed'])->toBe(0)
        ->and($report['failureDrivers']['topDriver'])->toBeNull()
        ->and($report['loaDelay']['totalWaitHours'])->toBe(0.0)
        ->and($report['labBottleneck']['dominantStage'])->toBeNull()
        ->and($report['capacity']['concentration'])->toBe(0.0);
});

it('produces an empty attention list on a healthy clinic rather than inventing one', function () {
    // Nothing pending, nothing stalled, nobody over cap. The list must be
    // empty — an action list that always finds something is noise.
    seedHealthyAppointments(20);

    expect($this->diagnostics->report('30d')['attention'])->toBe([]);
});

// ── Baseline comparison ───────────────────────────────────────────────────────

it('reports a segment only when it sits above the clinic baseline', function () {
    seedHealthyAppointments(20, 'cash');

    // 6 of 8 HMO appointments cancelled, against a low overall baseline.
    foreach (range(1, 6) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(9),
            'appointment_time' => sprintf('%02d:30 AM', $index),
            'status' => 'cancelled',
            'coverage' => 'hmo',
        ]);
    }
    foreach (range(1, 2) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(9),
            'appointment_time' => sprintf('%02d:45 AM', $index),
            'status' => 'completed',
            'coverage' => 'hmo',
        ]);
    }

    $drivers = $this->diagnostics->report('30d')['failureDrivers'];
    $coverage = collect($drivers['dimensions'])->firstWhere('dimension', 'Coverage');
    $hmo = collect($coverage['segments'])->firstWhere('label', 'HMO');

    expect($drivers['totalAppointments'])->toBe(28)
        ->and($drivers['totalFailed'])->toBe(6)
        ->and($drivers['baseline'])->toBe(21.4)   // 6/28
        ->and($hmo)->not->toBeNull()
        ->and($hmo['total'])->toBe(8)
        ->and($hmo['failed'])->toBe(6)
        ->and($hmo['rate'])->toBe(75.0)
        ->and($hmo['lift'])->toBe(53.6)           // 75 − 21.4
        ->and($hmo['contribution'])->toBe(100.0); // all failures are HMO

    // Cash carried no cancellations, so it is not a driver at all.
    expect(collect($coverage['segments'])->firstWhere('label', 'Cash'))->toBeNull();
});

// ── The three noise guards ────────────────────────────────────────────────────

/**
 * Regression: the time-slot dimension originally returned eight rows, each
 * holding exactly one cancellation and each technically "above baseline".
 * One event is an anecdote, not a concentration.
 */
it('suppresses a segment with too few appointments to compare', function () {
    seedHealthyAppointments(20);

    // A 3-appointment segment with a 100% failure rate. Statistically nothing.
    foreach (range(1, 3) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(9),
            'appointment_time' => sprintf('%02d:15 PM', $index),
            'status' => 'cancelled',
            'coverage' => 'philhealth',
        ]);
    }

    $coverage = collect($this->diagnostics->report('30d')['failureDrivers']['dimensions'])
        ->firstWhere('dimension', 'Coverage');

    expect(collect($coverage['segments'])->firstWhere('label', 'PhilHealth'))->toBeNull()
        ->and($coverage['suppressed'])->toBe(1)
        // Reported, never silently dropped — a reader who cannot see what was
        // filtered has no way to judge what remains.
        ->and($coverage['suppressedAppointments'])->toBe(3);
});

it('ignores a segment carrying only a single failure', function () {
    seedHealthyAppointments(20);

    // 8 appointments — above the sample floor — but one lone cancellation.
    foreach (range(1, 8) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(9),
            'appointment_time' => sprintf('%02d:20 PM', $index),
            'status' => $index === 1 ? 'cancelled' : 'completed',
            'coverage' => 'corporate',
        ]);
    }

    $coverage = collect($this->diagnostics->report('30d')['failureDrivers']['dimensions'])
        ->firstWhere('dimension', 'Coverage');

    expect(collect($coverage['segments'])->firstWhere('label', 'Corporate'))->toBeNull()
        // It cleared the sample floor, so it is not a suppression either —
        // it simply is not a finding.
        ->and($coverage['suppressed'])->toBe(0);
});

/**
 * Regression: "In-person" held 89 of 92 appointments and therefore ~100% of all
 * failures, and topped the list on contribution alone while sitting 0.3pp above
 * baseline. A segment that is essentially the whole population explains nothing.
 */
it('ignores a segment that is barely above baseline however large its share', function () {
    // 30 appointments, 3 cancelled — every one of them cash, so cash carries
    // 100% of failures while sitting exactly at the baseline.
    seedHealthyAppointments(27, 'cash');

    foreach (range(1, 3) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(9),
            'appointment_time' => sprintf('%02d:50 AM', $index),
            'status' => 'cancelled',
            'coverage' => 'cash',
        ]);
    }

    $coverage = collect($this->diagnostics->report('30d')['failureDrivers']['dimensions'])
        ->firstWhere('dimension', 'Coverage');

    expect($coverage['segments'])->toBe([]);
});

it('ranks drivers by contribution, not by raw rate', function () {
    seedHealthyAppointments(40, 'cash');

    // Small segment, high rate, few failures.
    foreach (range(1, 6) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(8),
            'appointment_time' => sprintf('%02d:05 AM', $index),
            'status' => $index <= 5 ? 'cancelled' : 'completed',
            'service' => 'small-clinic',
        ]);
    }

    // Larger segment, lower rate, but carries more of the total problem.
    foreach (range(1, 30) as $index) {
        Appointment::factory()->create([
            'appointment_date' => today()->subDays(7),
            'appointment_time' => sprintf('%02d:%02d PM', ($index % 9) + 1, $index),
            'status' => $index <= 12 ? 'cancelled' : 'completed',
            'service' => 'big-clinic',
        ]);
    }

    $service = collect($this->diagnostics->report('30d')['failureDrivers']['dimensions'])
        ->firstWhere('dimension', 'Service');

    expect($service['segments'][0]['label'])->toBe('Big clinic')
        ->and($service['segments'][0]['failed'])->toBe(12)
        ->and($service['segments'][1]['label'])->toBe('Small clinic')
        // Small clinic has the higher rate (83% vs 40%) yet ranks second,
        // because it accounts for less of the clinic's total problem.
        ->and($service['segments'][1]['rate'])
        ->toBeGreaterThan($service['segments'][0]['rate']);
});

// ── Prescriptive rules ────────────────────────────────────────────────────────

it('raises a chase item only once a request passes the threshold', function () {
    LoaRequest::factory()->create([
        'requested_at' => now()->subDays(ClinicDiagnosticsService::LOA_CHASE_DAYS + 1),
    ]);
    LoaRequest::factory()->create([
        'requested_at' => now()->subDays(ClinicDiagnosticsService::LOA_WATCH_DAYS + 1),
    ]);
    LoaRequest::factory()->create(['requested_at' => now()->subHours(2)]);

    $report = $this->diagnostics->report('30d');
    $ids = collect($report['attention'])->pluck('id');

    expect($report['loaDelay']['chaseCount'])->toBe(1)
        ->and($report['loaDelay']['watchCount'])->toBe(1)
        ->and($ids)->toContain('loa-chase')
        ->and($ids)->toContain('loa-watch');

    // The most urgent item leads, and names the oldest request as evidence.
    expect($report['attention'][0]['severity'])->toBe('high')
        ->and($report['attention'][0]['evidence'])
        ->toContain($report['loaDelay']['oldestPending'][0]['loaNumber']);
});

it('does not raise a chase item for a queue that is merely young', function () {
    LoaRequest::factory()->count(3)->create(['requested_at' => now()->subHours(6)]);

    $report = $this->diagnostics->report('30d');

    expect($report['loaDelay']['pendingTotal'])->toBe(3)
        ->and($report['loaDelay']['chaseCount'])->toBe(0)
        ->and(collect($report['attention'])->pluck('id'))->not->toContain('loa-chase');
});

it('flags lab work stalled past the threshold at each stage', function () {
    $stale = now()->subHours(ClinicDiagnosticsService::LAB_STALE_HOURS + 1);

    LabTestResult::factory()->create([
        'status' => 'recorded',
        'requested_at' => $stale,
        'recorded_at' => $stale,
    ]);
    LabTestResult::factory()->create([
        'status' => 'requested',
        'requested_at' => $stale,
    ]);
    // Fresh — must not be counted.
    LabTestResult::factory()->create([
        'status' => 'requested',
        'requested_at' => now()->subHour(),
    ]);

    $report = $this->diagnostics->report('30d');
    $ids = collect($report['attention'])->pluck('id');

    expect($report['labBottleneck']['staleAwaitingReview'])->toBe(1)
        ->and($report['labBottleneck']['staleAwaitingResults'])->toBe(1)
        ->and($ids)->toContain('lab-review')
        ->and($ids)->toContain('lab-encode');
});

it('names the slower laboratory stage', function () {
    // Encoded 1h after the order, reviewed 20h after encoding: review is slower.
    LabTestResult::factory()->create([
        'status' => 'reviewed',
        'requested_at' => now()->subHours(30),
        'recorded_at' => now()->subHours(29),
        'reviewed_at' => now()->subHours(9),
    ]);

    expect($this->diagnostics->report('30d')['labBottleneck']['dominantStage'])
        ->toBe('Doctor review');

    // Reverse the profile and the verdict must follow.
    LabTestResult::query()->delete();

    LabTestResult::factory()->create([
        'status' => 'reviewed',
        'requested_at' => now()->subHours(30),
        'recorded_at' => now()->subHours(10),
        'reviewed_at' => now()->subHours(9),
    ]);

    expect($this->diagnostics->report('30d')['labBottleneck']['dominantStage'])
        ->toBe('Nurse encoding');
});

it('flags a doctor booked past the daily cap', function () {
    $doctor = userWithRole('doctor');
    $doctor->doctorProfile()->create([
        'display_name' => 'Dr. Cruz',
        'specialty' => 'General',
        'max_patients_per_day' => 3,
    ]);

    foreach (range(1, 5) as $index) {
        Appointment::factory()->forDoctor($doctor)->create([
            'appointment_date' => today()->subDays(5),
            'appointment_time' => sprintf('%02d:00 AM', $index + 6),
            'status' => 'completed',
        ]);
    }

    $report = $this->diagnostics->report('30d');

    expect($report['capacity']['breachCount'])->toBe(1)
        ->and($report['capacity']['capBreaches'][0]['doctor'])->toBe('Dr. Cruz')
        ->and($report['capacity']['capBreaches'][0]['booked'])->toBe(5)
        ->and($report['capacity']['capBreaches'][0]['over'])->toBe(2)
        ->and(collect($report['attention'])->pluck('id'))->toContain('cap-breach');
});

it('excludes cancelled appointments from a cap breach', function () {
    // A cancelled booking took a slot but not the doctor's time, so five
    // bookings of which three cancelled is not a breach of a cap of 3.
    $doctor = userWithRole('doctor');
    $doctor->doctorProfile()->create([
        'display_name' => 'Dr. Lim',
        'specialty' => 'General',
        'max_patients_per_day' => 3,
    ]);

    foreach (range(1, 5) as $index) {
        Appointment::factory()->forDoctor($doctor)->create([
            'appointment_date' => today()->subDays(5),
            'appointment_time' => sprintf('%02d:00 AM', $index + 6),
            'status' => $index <= 3 ? 'cancelled' : 'completed',
        ]);
    }

    expect($this->diagnostics->report('30d')['capacity']['breachCount'])->toBe(0);
});

it('counts only upcoming appointments as unassigned', function () {
    $patient = Patient::factory()->create();

    Appointment::factory()->forPatient($patient)->create([
        'doctor_id' => null,
        'appointment_date' => today()->addDays(3),
        'status' => 'requested',
    ]);
    // Past, and already dealt with — not actionable.
    Appointment::factory()->forPatient($patient)->create([
        'doctor_id' => null,
        'appointment_date' => today()->subDays(3),
        'appointment_time' => '02:00 PM',
        'status' => 'completed',
    ]);

    expect($this->diagnostics->report('30d')['capacity']['unassignedUpcoming'])->toBe(1);
});

// ── LOA attribution ───────────────────────────────────────────────────────────

it('attributes waiting time by share of the total, not by average', function () {
    // Maxicare: three requests at 10h each = 30h total.
    foreach (range(1, 3) as $ignored) {
        LoaRequest::factory()->approved()->create([
            'hmo_provider' => 'Maxicare',
            'requested_at' => now()->subHours(20),
            'approved_at' => now()->subHours(10),
        ]);
    }

    // Intellicare: one request at 20h — the higher average, the smaller share.
    LoaRequest::factory()->approved()->create([
        'hmo_provider' => 'Intellicare',
        'requested_at' => now()->subHours(30),
        'approved_at' => now()->subHours(10),
    ]);

    $loa = $this->diagnostics->report('30d')['loaDelay'];
    $byProvider = collect($loa['byProvider'])->keyBy('provider');

    expect($loa['totalWaitHours'])->toBe(50.0)
        ->and($byProvider['Maxicare']['shareOfWait'])->toBe(60.0)
        ->and($byProvider['Intellicare']['shareOfWait'])->toBe(40.0)
        // Intellicare is slower per request, yet Maxicare holds up more of the
        // clinic's total waiting time. Ranking by average would invert this.
        ->and($byProvider['Intellicare']['averageHours'])
        ->toBeGreaterThan($byProvider['Maxicare']['averageHours'])
        ->and($loa['byProvider'][0]['provider'])->toBe('Maxicare');
});

it('excludes back-filled requests from waiting time attribution', function () {
    // Phase 2's backfill produced decisions predating their own submission.
    LoaRequest::factory()->approved()->create([
        'hmo_provider' => 'Maxicare',
        'requested_at' => now()->subDays(2),
        'approved_at' => now()->subDays(30),
    ]);

    $loa = $this->diagnostics->report('30d')['loaDelay'];

    expect($loa['timedDecisions'])->toBe(0)
        ->and($loa['totalWaitHours'])->toBe(0.0);
});

// ── The page and the export ───────────────────────────────────────────────────

it('ships the diagnostics payload to the page', function () {
    $this->actingAs($this->hr)
        ->get('/hr/analytics')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('diagnostics.attention')
            ->has('diagnostics.failureDrivers.dimensions')
            ->has('diagnostics.loaDelay')
            ->has('diagnostics.labBottleneck')
            ->has('diagnostics.capacity')
            // Rendered on screen so the filtering is visible to the reader.
            ->where('diagnostics.criteria.minSample', ClinicDiagnosticsService::MIN_SAMPLE));
});

it('exports the same findings the page shows', function () {
    LoaRequest::factory()->create([
        'requested_at' => now()->subDays(ClinicDiagnosticsService::LOA_CHASE_DAYS + 2),
    ]);

    $onScreen = $this->diagnostics->report('90d');

    $csv = $this->actingAs($this->hr)
        ->get('/hr/analytics/export/diagnostics?range=90d')
        ->assertOk()
        ->streamedContent();

    expect($onScreen['attention'][0]['id'])->toBe('loa-chase')
        ->and($csv)->toContain('Diagnostics and recommended actions')
        ->and($csv)->toContain($onScreen['loaDelay']['oldestPending'][0]['loaNumber'])
        ->and($csv)->toContain('Needs attention');
});

it('says so in the export when nothing is flagged', function () {
    // An empty section must read as "checked, nothing found" rather than as a
    // section that failed to generate.
    $csv = $this->actingAs($this->hr)
        ->get('/hr/analytics/export/diagnostics')
        ->streamedContent();

    expect($csv)->toContain('Nothing flagged in this period');
});

it('keeps the diagnostics export closed to clinical roles', function (string $role) {
    // Covered generically by AnalyticsAccessTest, but asserted here too: this
    // export carries clinic-wide patient and doctor performance in one file.
    $this->actingAs(userWithRole($role))
        ->get('/hr/analytics/export/diagnostics')
        ->assertForbidden();
})->with(['doctor', 'nurse', 'user']);

it('leaves no link on an action the viewer cannot reach', function () {
    $stale = now()->subHours(ClinicDiagnosticsService::LAB_STALE_HOURS + 1);

    LabTestResult::factory()->create([
        'status' => 'recorded',
        'requested_at' => $stale,
        'recorded_at' => $stale,
    ]);

    $items = collect($this->diagnostics->report('30d')['attention'])->keyBy('id');

    // The lab queue is a nurse route; admin and HR would get a 403, so the
    // item carries its evidence without an actionable link.
    expect($items['lab-review']['href'])->toBeNull();
});

it('links the loa queue, which admin and hr can reach', function () {
    LoaRequest::factory()->create([
        'requested_at' => now()->subDays(ClinicDiagnosticsService::LOA_CHASE_DAYS + 1),
    ]);

    $items = collect($this->diagnostics->report('30d')['attention'])->keyBy('id');

    expect($items['loa-chase']['href'])->toBe('/hr/hmo-approvals');

    // And the link is genuinely reachable by both roles, not just well-formed.
    foreach (['hr', 'admin'] as $role) {
        $this->actingAs(userWithRole($role))
            ->get($items['loa-chase']['href'])
            ->assertOk();
    }
});

it('does not leak patient identity into the pending queue payload', function () {
    $patient = Patient::factory()->create(['first_name' => 'Rosario', 'last_name' => 'Delgado']);

    LoaRequest::factory()->forPatient($patient)->create([
        'requested_at' => now()->subDays(10),
    ]);

    $pending = $this->diagnostics->report('30d')['loaDelay']['oldestPending'][0];

    // A reference number is enough to act on. The analytics surface has no
    // reason to carry names that the approvals queue already shows.
    expect(array_keys($pending))->toBe(['loaNumber', 'provider', 'daysWaiting'])
        ->and(json_encode($pending))->not->toContain('Rosario');
});

it('keeps every phase 6 descriptive figure working after the trait extraction', function () {
    // The helpers moved to AggregatesClinicData; this asserts the two services
    // still resolve the same window rather than drifting apart.
    seedHealthyAppointments(10);

    $volume = app(AnalyticsService::class)->appointmentVolume('30d');
    $diagnostics = $this->diagnostics->report('30d');

    expect($volume['stats']['total'])
        ->toBe($diagnostics['failureDrivers']['totalAppointments']);
});

it('keeps a user without a doctor profile out of the capacity table', function () {
    // doctor_id points at users, and only doctors carry a profile. A booking
    // against an account with no profile must not fabricate a load row.
    $ghost = User::factory()->create();

    Appointment::factory()->create([
        'doctor_id' => $ghost->id,
        'appointment_date' => today()->subDays(4),
        'status' => 'completed',
    ]);

    expect($this->diagnostics->report('30d')['capacity']['busiestDoctors'])->toBe([]);
});
