<?php

use App\Models\Appointment;
use App\Models\LoaRequest;
use App\Services\AnalyticsService;

/**
 * Figure 4's "Generate Reports" flow.
 *
 * The assertion that earns its keep here is the last one: the CSV and the
 * screen must agree. They are two renderings of one AnalyticsService call, and
 * the moment someone re-queries in the export for convenience, a downloaded
 * report starts quietly disagreeing with the page it came from — which nobody
 * notices until a defense panel puts the two side by side.
 */
beforeEach(function () {
    $this->hr = userWithRole('hr');
});

it('streams a csv with a dated filename', function (string $report) {
    $response = $this->actingAs($this->hr)
        ->get("/hr/analytics/export/{$report}")
        ->assertOk();

    expect($response->headers->get('content-type'))->toContain('text/csv');

    expect($response->headers->get('content-disposition'))
        ->toContain('attachment')
        ->toContain($report)
        ->toContain(now()->format('Y-m-d'));
})->with(AnalyticsService::REPORTS);

it('404s an unknown report rather than streaming an empty file', function () {
    // An empty report and a non-existent one must not look the same to whoever
    // opens the spreadsheet.
    $this->actingAs($this->hr)
        ->get('/hr/analytics/export/made-up-report')
        ->assertNotFound();
});

it('names the report and its period in the file itself', function () {
    Appointment::factory()->create(['appointment_date' => today()->subDay()]);

    $csv = $this->actingAs($this->hr)
        ->get('/hr/analytics/export/appointment-volume?range=30d')
        ->streamedContent();

    expect($csv)->toContain('Appointment volume')
        ->toContain('Last 30 days')
        ->toContain('Generated');
});

it('carries the selected range through to the export', function () {
    Appointment::factory()->create(['appointment_date' => today()->subDays(200)]);

    $thirtyDay = $this->actingAs($this->hr)
        ->get('/hr/analytics/export/appointment-volume?range=30d')
        ->streamedContent();

    $twelveMonth = $this->actingAs($this->hr)
        ->get('/hr/analytics/export/appointment-volume?range=12m')
        ->streamedContent();

    expect($thirtyDay)->toContain('Last 30 days')
        ->and($twelveMonth)->toContain('Last 12 months')
        ->and($thirtyDay)->not->toBe($twelveMonth);
});

/**
 * The anti-drift assertion. Both sides are read from the same service call, so
 * this fails the moment the export grows its own query.
 */
it('exports the same figures the page renders', function () {
    Appointment::factory()->count(4)->create([
        'appointment_date' => today()->subDays(2),
        'status' => 'completed',
    ]);
    Appointment::factory()->count(2)->create([
        'appointment_date' => today()->subDays(2),
        'status' => 'cancelled',
    ]);

    $onScreen = app(AnalyticsService::class)->clinicPerformance('30d');

    $csv = $this->actingAs($this->hr)
        ->get('/hr/analytics/export/clinic-performance?range=30d')
        ->streamedContent();

    // 4 completed of 6 total = 66.7%, and the CSV must say so too.
    expect($onScreen['stats']['completionRate'])->toBe(66.7)
        ->and($csv)->toContain('66.7%')
        ->and($csv)->toContain('Completed');
});

it('exports loa turnaround figures that match the page', function () {
    LoaRequest::factory()->approved()->create([
        'hmo_provider' => 'Maxicare',
        'requested_at' => now()->subHours(8),
        'approved_at' => now()->subHours(4),
    ]);

    $onScreen = app(AnalyticsService::class)->loaTurnaround('30d');

    $csv = $this->actingAs($this->hr)
        ->get('/hr/analytics/export/loa-turnaround?range=30d')
        ->streamedContent();

    expect($onScreen['stats']['averageDecisionHours'])->toBe(4.0)
        ->and($csv)->toContain('Maxicare')
        ->and($csv)->toContain('Average hours to decision');
});
