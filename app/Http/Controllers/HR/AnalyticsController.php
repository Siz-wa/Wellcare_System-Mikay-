<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use App\Services\ClinicDiagnosticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Objective 1.5's analytics surface, and Figure 4's "Generate Reports" flow.
 *
 * Lives in the HR namespace because it is bound into the `role:hr|admin` group
 * — admins are members of that group and already reach the HMO queue the same
 * way. Splitting it into two role-prefixed copies would mean two routes over
 * one service for no gain.
 *
 * Thin by design: every aggregate is AnalyticsService's, so the screen and the
 * CSV cannot drift apart.
 */
class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics,
        private readonly ClinicDiagnosticsService $diagnostics,
    ) {}

    public function index(Request $request): Response
    {
        $range = $this->resolveRange($request);

        return Inertia::render('hr/analytics/analytics', [
            'range' => $range,
            'rangeLabel' => $this->analytics->rangeLabel($range),
            'patientTrends' => $this->analytics->patientTrends($range),
            'appointmentVolume' => $this->analytics->appointmentVolume($range),
            'clinicPerformance' => $this->analytics->clinicPerformance($range),
            'loaTurnaround' => $this->analytics->loaTurnaround($range),
            // The "why" and "what to do" half — see ClinicDiagnosticsService.
            'diagnostics' => $this->diagnostics->report($range),
        ]);
    }

    /**
     * Figure 4's "Generate Reports", as a download rather than a screen.
     *
     * An unknown slug 404s instead of streaming an empty file — a report with
     * no rows and a report that does not exist must not look the same to
     * whoever opens the spreadsheet.
     */
    public function export(Request $request, string $report): StreamedResponse
    {
        abort_unless(in_array($report, AnalyticsService::REPORTS, true), 404);

        $range = $this->resolveRange($request);

        $data = $report === 'diagnostics'
            ? $this->diagnostics->rowsFor($range)
            : $this->analytics->rowsFor($report, $range);

        $filename = sprintf('wellcare-%s-%s-%s.csv', $report, $range, now()->format('Y-m-d'));

        return response()->streamDownload(function () use ($data, $range): void {
            $handle = fopen('php://output', 'w');

            // Provenance first: a CSV that outlives the tab it came from still
            // has to say what it covers.
            fputcsv($handle, [$data['title'], $this->analytics->rangeLabel($range)]);
            fputcsv($handle, ['Generated', now()->toDayDateTimeString()]);
            fputcsv($handle, []);
            fputcsv($handle, $data['headers']);

            foreach ($data['rows'] as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * Sanitises rather than validates, deliberately.
     *
     * The range arrives from a link, so a stale bookmark should show the
     * default report rather than an error page. It matters more on `export`:
     * a validation failure there redirects, and the browser would save an HTML
     * redirect body under a `.csv` filename — a failure that looks like a
     * corrupt download rather than a bad parameter.
     *
     * Safe to accept anything because the value only ever selects among three
     * hardcoded branches in AnalyticsService; it never reaches a query.
     */
    private function resolveRange(Request $request): string
    {
        $range = (string) $request->query('range', '');

        return in_array($range, AnalyticsService::RANGES, true)
            ? $range
            : AnalyticsService::DEFAULT_RANGE;
    }
}
