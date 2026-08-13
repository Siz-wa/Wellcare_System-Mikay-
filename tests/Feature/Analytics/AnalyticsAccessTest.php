<?php

use App\Services\AnalyticsService;

/**
 * The security boundary around the analytics surface.
 *
 * Every figure on this page is clinic-wide: appointment volumes, patient
 * demographics, per-doctor load, and HMO turnaround. It is the only surface in
 * the system that aggregates *across* patients rather than scoping to one, so a
 * role leak here is a different shape of problem from the rest of the app — the
 * CSV export in particular hands the whole dataset over in one request.
 *
 * Objective 1.5's audience is Admin/HR (Fig. 4), so those two roles are allowed
 * and the other three are asserted closed on both the page and every export.
 */
beforeEach(function () {
    $this->admin = userWithRole('admin');
    $this->hr = userWithRole('hr');
    $this->doctor = userWithRole('doctor');
    $this->nurse = userWithRole('nurse');
    $this->patient = userWithRole('user');
});

// ── Allowed ───────────────────────────────────────────────────────────────────

it('opens the analytics page for hr and admin', function (string $actor) {
    $this->actingAs($this->{$actor})
        ->get('/hr/analytics')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('hr/analytics/analytics'));
})->with(['hr', 'admin']);

it('lets hr and admin download every report', function (string $actor, string $report) {
    $this->actingAs($this->{$actor})
        ->get("/hr/analytics/export/{$report}")
        ->assertOk();
})->with(['hr', 'admin'])->with(AnalyticsService::REPORTS);

// ── Refused ───────────────────────────────────────────────────────────────────

it('refuses the analytics page to every other role', function (string $actor) {
    $this->actingAs($this->{$actor})
        ->get('/hr/analytics')
        ->assertForbidden();
})->with(['doctor', 'nurse', 'patient']);

/**
 * The export is a separate route, so it needs its own assertion — a guard on
 * the page says nothing about the download, and the download is the one that
 * hands over the entire dataset in a single file.
 */
it('refuses every export to every other role', function (string $actor, string $report) {
    $this->actingAs($this->{$actor})
        ->get("/hr/analytics/export/{$report}")
        ->assertForbidden();
})->with(['doctor', 'nurse', 'patient'])->with(AnalyticsService::REPORTS);

it('requires a login for the page and the exports', function (string $url) {
    $this->get($url)->assertRedirect('/login');
})->with([
    '/hr/analytics',
    '/hr/analytics/export/patient-trends',
    '/hr/analytics/export/loa-turnaround',
]);
