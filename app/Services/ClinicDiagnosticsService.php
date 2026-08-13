<?php

namespace App\Services;

use App\Concerns\AggregatesClinicData;
use App\Models\Appointment;
use App\Models\LabTestResult;
use App\Models\LoaRequest;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * The diagnostic and prescriptive half of Objective 1.5's "tracking and
 * **analyzing**".
 *
 * AnalyticsService answers *what happened*. This answers *why*, and then *what
 * to do about it*. Predictive analytics is deliberately absent — see the
 * decision recorded in WELLCARE-BUILD-PLAN.md §11: the dataset holds 102
 * appointments over 12 distinct dates with zero no-shows, so a risk model has
 * no positive class to learn and a forecast has no series to fit.
 *
 * ── Three rules hold this file honest, because a weak diagnostic is worse than
 * no diagnostic:
 *
 *  1. **Compare against a baseline, never report a raw rate.** A segment is a
 *     driver by how far it sits above the clinic-wide failure rate and by what
 *     share of all failures it accounts for — not by being large.
 *  2. **Suppress small samples, and say so.** One cancellation out of two is
 *     50% and means nothing. Segments under MIN_SAMPLE are excluded and the
 *     count of exclusions is returned, never silently dropped.
 *  3. **Correlation only.** Everything here is an association between a segment
 *     and an outcome. Nothing establishes cause, and the copy that renders it
 *     says "concentrated in", never "caused by".
 */
class ClinicDiagnosticsService
{
    use AggregatesClinicData;

    /**
     * Below this, a segment's rate is noise. With ~100 appointments in the
     * window, 5 is low enough to keep real segments and high enough that a
     * single cancellation cannot manufacture a 50% finding.
     */
    public const MIN_SAMPLE = 5;

    /**
     * A segment needs at least two failures before it is a pattern.
     *
     * Without this the time-slot dimension returned eight rows, each holding a
     * single cancellation and each "above baseline" — eight findings that were
     * really one cancellation spread thinly. One event is an anecdote.
     */
    public const MIN_FAILURES = 2;

    /**
     * How far above baseline a segment must sit, in percentage points.
     *
     * Guards the opposite failure: a segment holding almost the entire
     * population ("In-person", 89 of 92) is barely above baseline by
     * construction, yet carries ~100% of failures and would otherwise top the
     * list on contribution alone. A near-zero lift means the segment explains
     * nothing, however large its share.
     */
    public const MIN_LIFT = 5.0;

    /** An undecided LOA older than this needs chasing, not watching. */
    public const LOA_CHASE_DAYS = 7;

    public const LOA_WATCH_DAYS = 3;

    /** A lab test parked at one stage longer than this has stalled. */
    public const LAB_STALE_HOURS = 48;

    /** Statuses that mean the appointment did not deliver care. */
    private const FAILED_STATUSES = ['cancelled', 'no_show'];

    private const SEVERITY_RANK = ['high' => 0, 'medium' => 1, 'low' => 2];

    // ── Entry point ───────────────────────────────────────────────────────────

    /**
     * @return array{
     *     attention: array<int, array<string, mixed>>,
     *     failureDrivers: array<string, mixed>,
     *     loaDelay: array<string, mixed>,
     *     labBottleneck: array<string, mixed>,
     *     capacity: array<string, mixed>,
     *     minSample: int,
     * }
     */
    public function report(string $range): array
    {
        $failureDrivers = $this->appointmentFailureDrivers($range);
        $loaDelay = $this->loaDelayAttribution($range);
        $labBottleneck = $this->labBottleneck($range);
        $capacity = $this->capacityStrain($range);

        return [
            // Built from the four attributions rather than re-querying, so an
            // action can never contradict the evidence shown beneath it.
            'attention' => $this->attentionItems($loaDelay, $labBottleneck, $capacity, $failureDrivers),
            'failureDrivers' => $failureDrivers,
            'loaDelay' => $loaDelay,
            'labBottleneck' => $labBottleneck,
            'capacity' => $capacity,
            // Rendered on screen. Filtering that a reader cannot see is
            // indistinguishable from a clinic with no problems.
            'criteria' => [
                'minSample' => self::MIN_SAMPLE,
                'minFailures' => self::MIN_FAILURES,
                'minLift' => self::MIN_LIFT,
                'labStaleHours' => self::LAB_STALE_HOURS,
                'loaChaseDays' => self::LOA_CHASE_DAYS,
            ],
        ];
    }

    // ── Diagnostic 1: why appointments fail ───────────────────────────────────

    /**
     * Cancellation and no-show concentration, by segment, against the
     * clinic-wide baseline.
     *
     * @return array{
     *     baseline: float,
     *     totalAppointments: int,
     *     totalFailed: int,
     *     dimensions: array<int, array<string, mixed>>,
     *     topDriver: array<string, mixed>|null,
     * }
     */
    public function appointmentFailureDrivers(string $range): array
    {
        [$from, $to] = $this->resolveRange($range);

        $totals = $this->appointmentsInRange($from, $to)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(status IN (?, ?)) as failed', self::FAILED_STATUSES)
            ->first();

        $totalAppointments = (int) ($totals->total ?? 0);
        $totalFailed = (int) ($totals->failed ?? 0);
        $baseline = $this->rate($totalFailed, $totalAppointments);

        $weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        $dimensions = [
            $this->driversFrom(
                'Booking lead time',
                // Back-entered records are excluded for the same reason the
                // lead-time average excludes them: the visit predates the row.
                $this->appointmentsInRange($from, $to)
                    ->whereRaw('appointments.appointment_date >= DATE(appointments.created_at)'),
                "CASE
                    WHEN DATEDIFF(appointment_date, DATE(created_at)) = 0 THEN 'Same day'
                    WHEN DATEDIFF(appointment_date, DATE(created_at)) <= 3 THEN '1-3 days ahead'
                    WHEN DATEDIFF(appointment_date, DATE(created_at)) <= 7 THEN '4-7 days ahead'
                    WHEN DATEDIFF(appointment_date, DATE(created_at)) <= 30 THEN '8-30 days ahead'
                    ELSE 'Over 30 days ahead'
                END",
                $totalFailed,
                $baseline,
            ),
            $this->driversFrom(
                'Coverage',
                $this->appointmentsInRange($from, $to),
                'appointments.coverage',
                $totalFailed,
                $baseline,
                fn (string $v): string => $this->humanise($v),
            ),
            $this->driversFrom(
                'Day of week',
                $this->appointmentsInRange($from, $to),
                'DAYOFWEEK(appointments.appointment_date)',
                $totalFailed,
                $baseline,
                // MySQL DAYOFWEEK is 1=Sunday — the same convention, and the
                // same off-by-one trap, as availability_blocks.day_of_week.
                fn (string $v): string => $weekdays[((int) $v) - 1] ?? $v,
            ),
            $this->driversFrom(
                'Time slot',
                $this->appointmentsInRange($from, $to),
                'appointments.appointment_time',
                $totalFailed,
                $baseline,
            ),
            $this->driversFrom(
                'Service',
                $this->appointmentsInRange($from, $to),
                'appointments.service',
                $totalFailed,
                $baseline,
                fn (string $v): string => $this->humanise($v),
            ),
            $this->driversFrom(
                'Consultation type',
                $this->appointmentsInRange($from, $to),
                'appointments.consultation_type',
                $totalFailed,
                $baseline,
                fn (string $v): string => $this->humanise($v),
            ),
            $this->driversFrom(
                'Doctor',
                $this->appointmentsInRange($from, $to)
                    ->leftJoin('doctor_profiles', 'doctor_profiles.user_id', '=', 'appointments.doctor_id'),
                "COALESCE(doctor_profiles.display_name, 'Unassigned')",
                $totalFailed,
                $baseline,
            ),
        ];

        return [
            'baseline' => $baseline,
            'totalAppointments' => $totalAppointments,
            'totalFailed' => $totalFailed,
            'dimensions' => $dimensions,
            'topDriver' => $this->highestContribution($dimensions),
        ];
    }

    /**
     * One dimension's segments, ranked by their share of all failures.
     *
     * @param  Builder<Appointment>  $query
     * @param  (callable(string): string)|null  $labeller
     * @return array{dimension: string, segments: array<int, array<string, mixed>>, suppressed: int, suppressedAppointments: int}
     */
    private function driversFrom(
        string $dimension,
        Builder $query,
        string $expression,
        int $totalFailed,
        float $baseline,
        ?callable $labeller = null,
    ): array {
        $rows = $query
            ->selectRaw("{$expression} as segment")
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(status IN (?, ?)) as failed', self::FAILED_STATUSES)
            ->groupBy('segment')
            ->get();

        $segments = [];
        $suppressed = 0;
        $suppressedAppointments = 0;

        foreach ($rows as $row) {
            $total = (int) $row->total;
            $failed = (int) $row->failed;

            if ($total < self::MIN_SAMPLE) {
                $suppressed++;
                $suppressedAppointments += $total;

                continue;
            }

            $rate = $this->rate($failed, $total);
            $lift = round($rate - $baseline, 1);

            // Three conditions, each ruling out a different kind of non-finding:
            // a segment no worse than the clinic overall, a single stray failure,
            // and a segment so close to baseline that it explains nothing.
            if ($failed < self::MIN_FAILURES || $lift < self::MIN_LIFT) {
                continue;
            }

            $segments[] = [
                'label' => $labeller ? $labeller((string) $row->segment) : (string) $row->segment,
                'total' => $total,
                'failed' => $failed,
                'rate' => $rate,
                'lift' => $lift,
                'contribution' => $this->rate($failed, $totalFailed),
            ];
        }

        // Contribution, not rate: a segment carrying 40% of all cancellations
        // matters more than one with a higher rate over fewer bookings.
        usort($segments, fn (array $a, array $b): int => $b['contribution'] <=> $a['contribution']);

        return [
            'dimension' => $dimension,
            'segments' => $segments,
            'suppressed' => $suppressed,
            'suppressedAppointments' => $suppressedAppointments,
        ];
    }

    /**
     * The single strongest association across every dimension — what the
     * prescriptive layer points at.
     *
     * Ranked by contribution and tie-broken by lift. The tiebreak matters:
     * several dimensions routinely carry 100% of a small failure set (all ten
     * cancellations are HMO *and* Wednesday *and* one service), and the most
     * useful of those is the one furthest from baseline, not whichever the
     * loop happened to reach first.
     *
     * @param  array<int, array<string, mixed>>  $dimensions
     * @return array<string, mixed>|null
     */
    private function highestContribution(array $dimensions): ?array
    {
        $best = null;

        foreach ($dimensions as $dimension) {
            foreach ($dimension['segments'] as $segment) {
                $better = $best === null
                    || [$segment['contribution'], $segment['lift']]
                        > [$best['contribution'], $best['lift']];

                if ($better) {
                    $best = $segment + ['dimension' => $dimension['dimension']];
                }
            }
        }

        return $best;
    }

    // ── Diagnostic 2: where LOA time goes ─────────────────────────────────────

    /**
     * @return array{
     *     timedDecisions: int,
     *     totalWaitHours: float,
     *     byProvider: array<int, array<string, mixed>>,
     *     byOutcome: array<int, array<string, mixed>>,
     *     pendingTotal: int,
     *     oldestPending: array<int, array<string, mixed>>,
     *     chaseCount: int,
     *     watchCount: int,
     * }
     */
    public function loaDelayAttribution(string $range): array
    {
        [$from, $to] = $this->resolveRange($range);

        // Same guard as the Phase 6 average: rows back-filled by the Phase 2
        // migration carry a decision timestamp earlier than their own
        // submission, and cannot contribute a duration.
        $timed = fn (): Builder => LoaRequest::query()
            ->whereBetween('requested_at', [$from, $to])
            ->whereRaw('COALESCE(approved_at, rejected_at) >= requested_at');

        $totalWait = (float) ($timed()
            ->selectRaw('SUM(TIMESTAMPDIFF(HOUR, requested_at, COALESCE(approved_at, rejected_at))) as total')
            ->value('total') ?? 0);

        $byProvider = $timed()
            ->selectRaw("COALESCE(NULLIF(hmo_provider, ''), 'Unspecified') as provider")
            ->selectRaw('COUNT(*) as decisions')
            ->selectRaw('SUM(TIMESTAMPDIFF(HOUR, requested_at, COALESCE(approved_at, rejected_at))) as total_hours')
            ->groupBy('provider')
            ->get()
            ->map(fn ($row): array => [
                'provider' => (string) $row->provider,
                'decisions' => (int) $row->decisions,
                'totalHours' => round((float) $row->total_hours, 1),
                'averageHours' => round((float) $row->total_hours / max(1, (int) $row->decisions), 1),
                // Share of the clinic's total waiting time. Nine merely-slow
                // requests outweigh one very slow one, and an average hides that.
                'shareOfWait' => $totalWait > 0
                    ? round((float) $row->total_hours / $totalWait * 100, 1)
                    : 0.0,
            ])
            ->sortByDesc('shareOfWait')
            ->values()
            ->all();

        $byOutcome = collect(['approved', 'rejected'])
            ->map(function (string $outcome) use ($timed): array {
                $column = $outcome === 'approved' ? 'approved_at' : 'rejected_at';

                $row = $timed()
                    ->where('status', $outcome)
                    ->selectRaw('COUNT(*) as decisions')
                    ->selectRaw("AVG(TIMESTAMPDIFF(HOUR, requested_at, {$column})) as average")
                    ->first();

                return [
                    'outcome' => ucfirst($outcome),
                    'decisions' => (int) ($row->decisions ?? 0),
                    'averageHours' => round((float) ($row->average ?? 0), 1),
                ];
            })
            ->all();

        // The pending queue is deliberately NOT range-filtered: a request
        // submitted four months ago and still undecided is exactly the one HR
        // needs, and a 30-day window would hide it.
        $pending = LoaRequest::query()
            ->awaitingApproval()
            ->whereNotNull('requested_at')
            ->orderBy('requested_at')
            ->get();

        $now = CarbonImmutable::now();

        $oldest = $pending->take(10)->map(fn (LoaRequest $loa): array => [
            'loaNumber' => $loa->loa_number,
            'provider' => $loa->hmo_provider ?: 'Unspecified',
            'daysWaiting' => (int) floor($loa->requested_at->floatDiffInDays($now)),
        ])->values()->all();

        $daysWaiting = fn (LoaRequest $loa): float => $loa->requested_at->floatDiffInDays($now);

        return [
            'timedDecisions' => $timed()->count(),
            'totalWaitHours' => round($totalWait, 1),
            'byProvider' => $byProvider,
            'byOutcome' => $byOutcome,
            'pendingTotal' => $pending->count(),
            'oldestPending' => $oldest,
            'chaseCount' => $pending->filter(fn ($l): bool => $daysWaiting($l) >= self::LOA_CHASE_DAYS)->count(),
            'watchCount' => $pending->filter(
                fn ($l): bool => $daysWaiting($l) >= self::LOA_WATCH_DAYS
                    && $daysWaiting($l) < self::LOA_CHASE_DAYS
            )->count(),
        ];
    }

    // ── Diagnostic 3: where the lab backs up ──────────────────────────────────

    /**
     * @return array{
     *     hoursToRecord: float,
     *     hoursToReview: float,
     *     dominantStage: string|null,
     *     dominantShare: float,
     *     awaitingResults: int,
     *     awaitingReview: int,
     *     staleAwaitingResults: int,
     *     staleAwaitingReview: int,
     * }
     */
    public function labBottleneck(string $range): array
    {
        [$from, $to] = $this->resolveRange($range);

        $inRange = fn (): Builder => LabTestResult::query()
            ->whereBetween('requested_at', [$from, $to]);

        $toRecord = (float) ($inRange()
            ->whereNotNull('recorded_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, requested_at, recorded_at)) as average')
            ->value('average') ?? 0);

        $toReview = (float) ($inRange()
            ->whereNotNull('recorded_at')
            ->whereNotNull('reviewed_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, recorded_at, reviewed_at)) as average')
            ->value('average') ?? 0);

        $combined = $toRecord + $toReview;

        // Which half of the doctor → nurse → doctor chain actually holds the
        // result up. Null when nothing has completed a stage, rather than an
        // arbitrary winner on two zeroes.
        $dominant = match (true) {
            $combined <= 0 => null,
            $toReview > $toRecord => 'Doctor review',
            $toRecord > $toReview => 'Nurse encoding',
            default => null,
        };

        $cutoff = CarbonImmutable::now()->subHours(self::LAB_STALE_HOURS);

        return [
            'hoursToRecord' => round($toRecord, 1),
            'hoursToReview' => round($toReview, 1),
            'dominantStage' => $dominant,
            'dominantShare' => $combined > 0
                ? round(max($toRecord, $toReview) / $combined * 100, 1)
                : 0.0,
            'awaitingResults' => $inRange()->where('status', 'requested')->count(),
            'awaitingReview' => $inRange()->where('status', 'recorded')->count(),
            // Backlog age is a "right now" question, so these are not
            // range-filtered — a test stalled since last quarter still blocks
            // a patient today.
            'staleAwaitingResults' => LabTestResult::query()
                ->where('status', 'requested')
                ->where('requested_at', '<', $cutoff)
                ->count(),
            'staleAwaitingReview' => LabTestResult::query()
                ->where('status', 'recorded')
                ->where('recorded_at', '<', $cutoff)
                ->count(),
        ];
    }

    // ── Diagnostic 4: where capacity strains ──────────────────────────────────

    /**
     * @return array{
     *     capBreaches: array<int, array<string, mixed>>,
     *     breachCount: int,
     *     busiestDoctors: array<int, array<string, mixed>>,
     *     concentration: float,
     *     unassignedUpcoming: int,
     * }
     */
    public function capacityStrain(string $range): array
    {
        [$from, $to] = $this->resolveRange($range);

        // The Scope's "max 5 patients per day" rule, checked against what was
        // actually booked. Cancelled and no-show rows are excluded: they took a
        // slot but not the doctor's time.
        $breaches = $this->appointmentsInRange($from, $to)
            ->join('doctor_profiles', 'doctor_profiles.user_id', '=', 'appointments.doctor_id')
            ->whereNotIn('appointments.status', self::FAILED_STATUSES)
            ->selectRaw('doctor_profiles.display_name as doctor')
            ->selectRaw('doctor_profiles.max_patients_per_day as cap')
            ->selectRaw('appointments.appointment_date as date')
            ->selectRaw('COUNT(*) as booked')
            ->groupBy('doctor', 'cap', 'date')
            ->havingRaw('COUNT(*) > doctor_profiles.max_patients_per_day')
            ->orderByDesc('booked')
            ->get()
            ->map(fn ($row): array => [
                'doctor' => (string) $row->doctor,
                'date' => CarbonImmutable::parse($row->date)->format('j M Y'),
                'booked' => (int) $row->booked,
                'cap' => (int) $row->cap,
                'over' => (int) $row->booked - (int) $row->cap,
            ])
            ->all();

        $busiest = $this->appointmentsInRange($from, $to)
            ->join('doctor_profiles', 'doctor_profiles.user_id', '=', 'appointments.doctor_id')
            ->whereNotIn('appointments.status', self::FAILED_STATUSES)
            ->selectRaw('doctor_profiles.display_name as doctor')
            ->selectRaw('COUNT(*) as booked')
            ->groupBy('doctor')
            ->orderByDesc('booked')
            ->get();

        $assignedTotal = (int) $busiest->sum('booked');
        $topThree = (int) $busiest->take(3)->sum('booked');

        return [
            'capBreaches' => array_slice($breaches, 0, 10),
            'breachCount' => count($breaches),
            'busiestDoctors' => $busiest->take(5)->map(fn ($row): array => [
                'doctor' => (string) $row->doctor,
                'booked' => (int) $row->booked,
            ])->values()->all(),
            // How lopsided the roster is. High concentration with idle
            // colleagues is a rota problem, not a demand problem.
            'concentration' => $this->rate($topThree, $assignedTotal),
            // Forward-looking on purpose: an unassigned booking is only
            // actionable before the visit.
            'unassignedUpcoming' => Appointment::query()
                ->whereNull('doctor_id')
                ->whereDate('appointment_date', '>=', CarbonImmutable::today()->toDateString())
                ->whereNotIn('status', ['cancelled', 'no_show', 'completed'])
                ->count(),
        ];
    }

    // ── Prescriptive: the attention list ──────────────────────────────────────

    /**
     * Rule-based recommendations, each carrying the evidence that triggered it.
     *
     * Deliberately rules and not a model: every item states a threshold a human
     * can check, which is what makes it defensible. `href` is set only for
     * routes an admin/HR viewer can actually reach — the lab items belong to
     * nurse and doctor screens, so they carry evidence but no link rather than
     * a link to a 403.
     *
     * @param  array<string, mixed>  $loa
     * @param  array<string, mixed>  $lab
     * @param  array<string, mixed>  $capacity
     * @param  array<string, mixed>  $failures
     * @return array<int, array<string, mixed>>
     */
    private function attentionItems(array $loa, array $lab, array $capacity, array $failures): array
    {
        $items = [];

        if ($loa['chaseCount'] > 0) {
            $items[] = [
                'id' => 'loa-chase',
                'severity' => 'high',
                'magnitude' => $loa['chaseCount'],
                'title' => "{$loa['chaseCount']} LOA request(s) undecided for over ".self::LOA_CHASE_DAYS.' days',
                'evidence' => $loa['oldestPending'] === []
                    ? 'Pending queue.'
                    : "Oldest is {$loa['oldestPending'][0]['loaNumber']} at {$loa['oldestPending'][0]['daysWaiting']} days ({$loa['oldestPending'][0]['provider']}).",
                'action' => 'Chase the HMO or decide the request. Coverage cannot be confirmed to the patient until it is resolved.',
                'href' => '/hr/hmo-approvals',
            ];
        }

        if ($loa['watchCount'] > 0) {
            $items[] = [
                'id' => 'loa-watch',
                'severity' => 'medium',
                'magnitude' => $loa['watchCount'],
                'title' => "{$loa['watchCount']} LOA request(s) waiting ".self::LOA_WATCH_DAYS.'–'.self::LOA_CHASE_DAYS.' days',
                'evidence' => 'Approaching the '.self::LOA_CHASE_DAYS.'-day threshold.',
                'action' => 'Decide these before they age into the chase queue.',
                'href' => '/hr/hmo-approvals',
            ];
        }

        if ($lab['staleAwaitingReview'] > 0) {
            $items[] = [
                'id' => 'lab-review',
                'severity' => 'high',
                'magnitude' => $lab['staleAwaitingReview'],
                'title' => "{$lab['staleAwaitingReview']} lab result(s) recorded but unvalidated for over ".self::LAB_STALE_HOURS.'h',
                'evidence' => 'Results are encoded but no doctor has reviewed them.',
                // Patients only see reviewed results, so this stage silently
                // withholds a finished result from the person waiting on it.
                'action' => 'Ask the ordering doctor to validate. Patients cannot see a result until it is reviewed.',
                'href' => null,
            ];
        }

        if ($lab['staleAwaitingResults'] > 0) {
            $items[] = [
                'id' => 'lab-encode',
                'severity' => 'medium',
                'magnitude' => $lab['staleAwaitingResults'],
                'title' => "{$lab['staleAwaitingResults']} lab test(s) ordered but not encoded for over ".self::LAB_STALE_HOURS.'h',
                'evidence' => 'Ordered by a doctor, still awaiting nurse encoding.',
                'action' => 'Check the lab queue — the sample may not have been collected.',
                'href' => null,
            ];
        }

        if ($capacity['breachCount'] > 0) {
            $first = $capacity['capBreaches'][0];
            $items[] = [
                'id' => 'cap-breach',
                'severity' => 'high',
                'magnitude' => $capacity['breachCount'],
                'title' => "{$capacity['breachCount']} day(s) exceeded a doctor's daily patient cap",
                'evidence' => "{$first['doctor']} had {$first['booked']} booked on {$first['date']} against a cap of {$first['cap']}.",
                'action' => 'Rebalance the rota or review the availability blocks for those dates.',
                'href' => null,
            ];
        }

        if ($capacity['unassignedUpcoming'] > 0) {
            $items[] = [
                'id' => 'unassigned',
                'severity' => 'medium',
                'magnitude' => $capacity['unassignedUpcoming'],
                'title' => "{$capacity['unassignedUpcoming']} upcoming appointment(s) have no doctor assigned",
                'evidence' => 'Booked as "next available" and still unassigned.',
                'action' => 'Assign a doctor before the visit date.',
                'href' => null,
            ];
        }

        if ($failures['topDriver'] !== null) {
            $driver = $failures['topDriver'];
            $items[] = [
                'id' => 'failure-driver',
                'severity' => 'medium',
                'magnitude' => $driver['contribution'],
                'title' => "Cancellations concentrate in {$driver['label']} ({$driver['dimension']})",
                'evidence' => "{$driver['rate']}% of {$driver['total']} appointments, against a {$failures['baseline']}% clinic baseline — {$driver['contribution']}% of all cancellations.",
                // "Review", not "fix": this is an association, and the action
                // is to investigate it rather than to act on an assumed cause.
                'action' => 'Review this segment. Confirmation reminders are the usual first step, but the association is not by itself a cause.',
                'href' => null,
            ];
        }

        usort($items, fn (array $a, array $b): int => [self::SEVERITY_RANK[$a['severity']], -$a['magnitude']]
            <=> [self::SEVERITY_RANK[$b['severity']], -$b['magnitude']]);

        return $items;
    }

    // ── CSV projection ────────────────────────────────────────────────────────

    /**
     * Built from `report()` rather than re-querying, so the download and the
     * screen cannot disagree — the same rule Phase 6's exports follow.
     *
     * @return array{title: string, headers: array<int, string>, rows: array<int, array<int, string|int|float>>}
     */
    public function rowsFor(string $range): array
    {
        $data = $this->report($range);
        $rows = [];

        foreach ($data['attention'] as $item) {
            $rows[] = ['Needs attention', ucfirst($item['severity']), $item['title'], $item['evidence'].' '.$item['action']];
        }

        if ($data['attention'] === []) {
            $rows[] = ['Needs attention', '—', 'Nothing flagged in this period', ''];
        }

        $baseline = $data['failureDrivers']['baseline'];

        foreach ($data['failureDrivers']['dimensions'] as $dimension) {
            foreach ($dimension['segments'] as $segment) {
                $rows[] = [
                    'Cancellation driver: '.$dimension['dimension'],
                    $segment['label'],
                    $segment['rate'].'%',
                    "{$segment['failed']} of {$segment['total']} · {$segment['lift']}pp above the {$baseline}% baseline · {$segment['contribution']}% of all cancellations",
                ];
            }

            if ($dimension['suppressed'] > 0) {
                $rows[] = [
                    'Cancellation driver: '.$dimension['dimension'],
                    'Suppressed segments',
                    $dimension['suppressed'],
                    'Fewer than '.self::MIN_SAMPLE.' appointments each; excluded as too small to compare',
                ];
            }
        }

        foreach ($data['loaDelay']['byProvider'] as $provider) {
            $rows[] = [
                'LOA wait by provider',
                $provider['provider'],
                $provider['shareOfWait'].'%',
                "{$provider['decisions']} decisions · {$provider['totalHours']}h total · {$provider['averageHours']}h average",
            ];
        }

        foreach ($data['loaDelay']['oldestPending'] as $pending) {
            $rows[] = [
                'LOA still pending',
                $pending['loaNumber'],
                $pending['daysWaiting'],
                'days waiting · '.$pending['provider'],
            ];
        }

        $lab = $data['labBottleneck'];
        $rows[] = ['Lab bottleneck', 'Dominant stage', $lab['dominantStage'] ?? 'Not determinable', $lab['dominantShare'].'% of end-to-end time'];
        $rows[] = ['Lab bottleneck', 'Nurse encoding', $lab['hoursToRecord'], 'average hours from order to encoded'];
        $rows[] = ['Lab bottleneck', 'Doctor review', $lab['hoursToReview'], 'average hours from encoded to validated'];
        $rows[] = ['Lab bottleneck', 'Stalled awaiting encoding', $lab['staleAwaitingResults'], 'over '.self::LAB_STALE_HOURS.'h'];
        $rows[] = ['Lab bottleneck', 'Stalled awaiting review', $lab['staleAwaitingReview'], 'over '.self::LAB_STALE_HOURS.'h'];

        foreach ($data['capacity']['capBreaches'] as $breach) {
            $rows[] = [
                'Capacity breach',
                $breach['doctor'],
                $breach['booked'],
                "on {$breach['date']} against a cap of {$breach['cap']}",
            ];
        }

        $rows[] = ['Capacity', 'Load concentration', $data['capacity']['concentration'].'%', 'share taken by the three busiest doctors'];
        $rows[] = ['Capacity', 'Unassigned upcoming', $data['capacity']['unassignedUpcoming'], 'bookings with no doctor'];

        return [
            'title' => 'Diagnostics and recommended actions',
            'headers' => ['Section', 'Item', 'Value', 'Evidence'],
            'rows' => $rows,
        ];
    }
}
