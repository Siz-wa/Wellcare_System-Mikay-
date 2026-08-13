<?php

namespace App\Services;

use App\Concerns\AggregatesClinicData;
use App\Models\LabTestResult;
use App\Models\LoaRequest;
use App\Models\Patient;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Objective 1.5 — "analytics tools for tracking and analyzing patient trends,
 * appointment data, clinic performance and LOA requests".
 *
 * One public method per clause of that sentence, plus `rowsFor()`, which the CSV
 * export uses. The export deliberately projects the *same* method output rather
 * than re-querying: two code paths computing "cancellation rate" is how a
 * downloaded report and the screen it was downloaded from end up disagreeing.
 *
 * Every aggregate here reads through the default Eloquent scope, so archived
 * (soft-deleted) appointments and patients never inflate a total — the admin
 * Archive can restore them and the numbers move accordingly.
 */
class AnalyticsService
{
    use AggregatesClinicData;

    /** Ranges the UI offers. Anything else is rejected by the controller. */
    public const RANGES = ['30d', '90d', '12m'];

    public const DEFAULT_RANGE = '90d';

    /**
     * Report slugs, used for both the tab ids and the export URLs.
     *
     * `diagnostics` is served by ClinicDiagnosticsService rather than this
     * class — it belongs here because this constant is the single list the
     * controller validates against and the access and export tests iterate.
     */
    public const REPORTS = [
        'patient-trends',
        'appointment-volume',
        'clinic-performance',
        'loa-turnaround',
        'diagnostics',
    ];

    /** Age bands for the booking demographics, as [label, min, max]. */
    private const AGE_BANDS = [
        ['0–17', 0, 17],
        ['18–34', 18, 34],
        ['35–49', 35, 49],
        ['50–64', 50, 64],
        ['65+', 65, 200],
    ];

    // ── Report 1: patient trends ──────────────────────────────────────────────

    /**
     * @return array{
     *     stats: array<string, int|float>,
     *     registrations: array<int, array{label: string, value: int}>,
     *     newVsReturning: array<int, array{label: string, new: int, returning: int}>,
     *     gender: array<int, array{label: string, value: int}>,
     *     ageBands: array<int, array{label: string, value: int}>,
     *     coverage: array<int, array{label: string, value: int}>,
     *     topServices: array<int, array{label: string, value: int}>,
     * }
     */
    public function patientTrends(string $range): array
    {
        [$from, $to, $granularity] = $this->resolveRange($range);

        $registrations = $this->countsByDay(
            Patient::query()->whereBetween('created_at', [$from, $to]),
            'created_at',
        );

        $newByDay = $this->countsByDay(
            $this->appointmentsInRange($from, $to)->where('patient_status', 'new'),
            'appointment_date',
        );

        $returningByDay = $this->countsByDay(
            $this->appointmentsInRange($from, $to)->where('patient_status', 'returning'),
            'appointment_date',
        );

        $newBuckets = $this->bucket($newByDay, $from, $to, $granularity);
        $returningBuckets = $this->bucket($returningByDay, $from, $to, $granularity);

        $newTotal = array_sum(array_column($newBuckets, 'value'));
        $returningTotal = array_sum(array_column($returningBuckets, 'value'));

        return [
            'stats' => [
                'totalPatients' => Patient::count(),
                'newRegistrations' => array_sum($registrations),
                'newBookings' => $newTotal,
                'returningBookings' => $returningTotal,
                'newPatientShare' => $this->rate($newTotal, $newTotal + $returningTotal),
            ],
            'registrations' => $this->bucket($registrations, $from, $to, $granularity),
            'newVsReturning' => array_map(
                fn (array $bucket, array $returning): array => [
                    'label' => $bucket['label'],
                    'new' => $bucket['value'],
                    'returning' => $returning['value'],
                ],
                $newBuckets,
                $returningBuckets,
            ),
            'gender' => $this->distribution($from, $to, 'gender'),
            'ageBands' => $this->ageBandDistribution($from, $to),
            'coverage' => $this->distribution($from, $to, 'coverage'),
            'topServices' => $this->distribution($from, $to, 'service', 8),
        ];
    }

    // ── Report 2: appointment volume ──────────────────────────────────────────

    /**
     * @return array{
     *     stats: array<string, int|float>,
     *     series: array<int, array{label: string, value: int}>,
     *     byStatus: array<int, array{label: string, value: int}>,
     *     byWeekday: array<int, array{label: string, value: int}>,
     *     byDoctor: array<int, array{label: string, value: int}>,
     *     byTimeSlot: array<int, array{label: string, value: int}>,
     *     byType: array<int, array{label: string, value: int}>,
     * }
     */
    public function appointmentVolume(string $range): array
    {
        [$from, $to, $granularity] = $this->resolveRange($range);

        $perDay = $this->countsByDay(
            $this->appointmentsInRange($from, $to),
            'appointment_date',
        );

        $series = $this->bucket($perDay, $from, $to, $granularity);
        $total = array_sum($perDay);
        $days = max(1, $from->diffInDays($to) + 1);

        return [
            'stats' => [
                'total' => $total,
                'averagePerDay' => round($total / $days, 1),
                'busiestDay' => $perDay === [] ? 0 : max($perDay),
                'virtualShare' => $this->rate(
                    $this->appointmentsInRange($from, $to)
                        ->where('consultation_type', 'virtual')
                        ->count(),
                    $total,
                ),
            ],
            'series' => $series,
            'byStatus' => $this->distribution($from, $to, 'status'),
            'byWeekday' => $this->weekdayDistribution($from, $to),
            'byDoctor' => $this->doctorDistribution($from, $to),
            // Times are already display strings ("10:00 AM") — humanising them
            // would lowercase the meridiem.
            'byTimeSlot' => $this->distribution($from, $to, 'appointment_time', 8, humanise: false),
            'byType' => $this->distribution($from, $to, 'consultation_type'),
        ];
    }

    // ── Report 3: clinic performance ──────────────────────────────────────────

    /**
     * @return array{
     *     stats: array<string, int|float>,
     *     rates: array<int, array{label: string, value: float, count: int}>,
     *     doctorLoad: array<int, array{doctor: string, appointments: int, activeDays: int, averagePerDay: float, cap: int, utilisation: float}>,
     *     labTurnaround: array<string, int|float>,
     * }
     */
    public function clinicPerformance(string $range): array
    {
        [$from, $to] = $this->resolveRange($range);

        $byStatus = $this->appointmentsInRange($from, $to)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $total = (int) $byStatus->sum();
        $completed = (int) $byStatus->get('completed', 0);
        $cancelled = (int) $byStatus->get('cancelled', 0);
        $noShow = (int) $byStatus->get('no_show', 0);

        // DATEDIFF over date(created_at) rather than the raw timestamp: a
        // same-day booking should read as 0 days of lead, not 0.4.
        //
        // The >= 0 filter is not a clamp. BookingService enforces a two-hour
        // minimum lead, so a *booked* appointment can never precede its own
        // creation; a row where it does was entered after the visit happened —
        // a back-filled paper record, which is exactly what Objective 5's
        // manual-to-digital transition produces. Those have no lead time to
        // average, and including them drags the mean negative. `leadTimeSample`
        // is exposed so the figure stays auditable rather than mysterious.
        $forwardBooked = $this->appointmentsInRange($from, $to)
            ->whereRaw('appointments.appointment_date >= DATE(appointments.created_at)');

        $leadTime = (clone $forwardBooked)
            ->selectRaw('AVG(DATEDIFF(appointment_date, DATE(created_at))) as average')
            ->value('average');

        return [
            'stats' => [
                'total' => $total,
                'completionRate' => $this->rate($completed, $total),
                'cancellationRate' => $this->rate($cancelled, $total),
                'noShowRate' => $this->rate($noShow, $total),
                'averageLeadTimeDays' => round((float) ($leadTime ?? 0), 1),
                'leadTimeSample' => (clone $forwardBooked)->count(),
            ],
            'rates' => [
                ['label' => 'Completed', 'value' => $this->rate($completed, $total), 'count' => $completed],
                ['label' => 'Cancelled', 'value' => $this->rate($cancelled, $total), 'count' => $cancelled],
                ['label' => 'No-show', 'value' => $this->rate($noShow, $total), 'count' => $noShow],
            ],
            'doctorLoad' => $this->doctorLoad($from, $to),
            'labTurnaround' => $this->labTurnaround($from, $to),
        ];
    }

    // ── Report 4: LOA turnaround ──────────────────────────────────────────────

    /**
     * @return array{
     *     stats: array<string, int|float>,
     *     byStatus: array<int, array{label: string, value: int}>,
     *     series: array<int, array{label: string, submitted: int, decided: int}>,
     *     ageing: array<int, array{label: string, value: int}>,
     *     byProvider: array<int, array{provider: string, submitted: int, approved: int, rejected: int, averageHours: float}>,
     * }
     */
    public function loaTurnaround(string $range): array
    {
        [$from, $to, $granularity] = $this->resolveRange($range);

        $byStatus = LoaRequest::query()
            ->whereBetween('requested_at', [$from, $to])
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $approved = (int) $byStatus->get('approved', 0);
        $rejected = (int) $byStatus->get('rejected', 0);

        $submittedByDay = $this->countsByDay(
            LoaRequest::query()->whereBetween('requested_at', [$from, $to]),
            'requested_at',
        );

        // COALESCE, not two queries: a request has exactly one decision
        // timestamp, and which one it is does not change when it was decided.
        $decidedByDay = LoaRequest::query()
            ->whereRaw('COALESCE(approved_at, rejected_at) BETWEEN ? AND ?', [$from, $to])
            ->selectRaw("DATE_FORMAT(COALESCE(approved_at, rejected_at), '%Y-%m-%d') as day, COUNT(*) as aggregate")
            ->groupBy('day')
            ->pluck('aggregate', 'day')
            ->map(fn ($value): int => (int) $value)
            ->all();

        $submittedBuckets = $this->bucket($submittedByDay, $from, $to, $granularity);
        $decidedBuckets = $this->bucket($decidedByDay, $from, $to, $granularity);

        return [
            'stats' => [
                'submitted' => (int) $byStatus->sum(),
                'approved' => $approved,
                'rejected' => $rejected,
                'pending' => (int) $byStatus->get('submitted', 0),
                'approvalRate' => $this->rate($approved, $approved + $rejected),
                'averageDecisionHours' => $this->averageDecisionHours($from, $to),
                'decisionSample' => $this->timedDecisions($from, $to)->count(),
            ],
            'byStatus' => $byStatus
                ->map(fn ($value, string $status): array => [
                    'label' => ucfirst($status),
                    'value' => (int) $value,
                ])
                ->values()
                ->all(),
            'series' => array_map(
                fn (array $submitted, array $decided): array => [
                    'label' => $submitted['label'],
                    'submitted' => $submitted['value'],
                    'decided' => $decided['value'],
                ],
                $submittedBuckets,
                $decidedBuckets,
            ),
            'ageing' => $this->pendingAgeing(),
            'byProvider' => $this->loaByProvider($from, $to),
        ];
    }

    // ── CSV projection ────────────────────────────────────────────────────────

    /**
     * A flat table for one report, built from the same method the screen uses.
     *
     * @return array{title: string, headers: array<int, string>, rows: array<int, array<int, string|int|float>>}
     */
    public function rowsFor(string $report, string $range): array
    {
        return match ($report) {
            'patient-trends' => $this->patientTrendsRows($range),
            'appointment-volume' => $this->appointmentVolumeRows($range),
            'clinic-performance' => $this->clinicPerformanceRows($range),
            'loa-turnaround' => $this->loaTurnaroundRows($range),
            default => throw new \InvalidArgumentException("Unknown report [{$report}]."),
        };
    }

    /** Human label for a range key, used in page copy and CSV filenames. */
    public function rangeLabel(string $range): string
    {
        return match ($range) {
            '30d' => 'Last 30 days',
            '12m' => 'Last 12 months',
            default => 'Last 90 days',
        };
    }

    // ── Shared query fragments ────────────────────────────────────────────────

    // resolveRange(), countsByDay(), bucket(), appointmentsInRange(), rate(),
    // humanise() and LABEL_OVERRIDES now live in AggregatesClinicData, shared
    // with ClinicDiagnosticsService.

    /**
     * Counts for one appointment column, largest first.
     *
     * @return array<int, array{label: string, value: int}>
     */
    private function distribution(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $column,
        ?int $limit = null,
        bool $humanise = true,
    ): array {
        // $column is never user input — every call site passes a literal.
        $query = $this->appointmentsInRange($from, $to)
            ->selectRaw("appointments.{$column} as bucket, COUNT(*) as aggregate")
            ->groupBy('bucket')
            ->orderByDesc('aggregate');

        if ($limit !== null) {
            $query->limit($limit);
        }

        return $query->get()
            ->map(fn ($row): array => [
                'label' => $humanise ? $this->humanise((string) $row->bucket) : (string) $row->bucket,
                'value' => (int) $row->aggregate,
            ])
            ->all();
    }

    /** @return array<int, array{label: string, value: int}> */
    private function ageBandDistribution(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $ages = $this->appointmentsInRange($from, $to)->pluck('age');

        return collect(self::AGE_BANDS)
            ->map(fn (array $band): array => [
                'label' => $band[0],
                'value' => $ages->filter(
                    fn ($age): bool => $age !== null && $age >= $band[1] && $age <= $band[2],
                )->count(),
            ])
            ->all();
    }

    /**
     * Bookings per weekday.
     *
     * MySQL DAYOFWEEK is 1=Sunday … 7=Saturday — the same convention as
     * `availability_blocks.day_of_week`, and the same off-by-one trap.
     *
     * @return array<int, array{label: string, value: int}>
     */
    private function weekdayDistribution(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $counts = $this->appointmentsInRange($from, $to)
            ->selectRaw('DAYOFWEEK(appointment_date) as weekday, COUNT(*) as aggregate')
            ->groupBy('weekday')
            ->pluck('aggregate', 'weekday');

        $labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return collect($labels)
            ->map(fn (string $label, int $index): array => [
                'label' => $label,
                'value' => (int) $counts->get($index + 1, 0),
            ])
            ->all();
    }

    /**
     * Bookings per doctor.
     *
     * Joins `doctor_profiles.display_name` because `User::$name` is computed
     * from the profile relation in PHP and cannot be grouped on in SQL. A null
     * `doctor_id` is a "next available" booking, which is a real bucket rather
     * than a gap.
     *
     * @return array<int, array{label: string, value: int}>
     */
    private function doctorDistribution(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->appointmentsInRange($from, $to)
            ->leftJoin('doctor_profiles', 'doctor_profiles.user_id', '=', 'appointments.doctor_id')
            ->selectRaw("COALESCE(doctor_profiles.display_name, 'Unassigned') as bucket, COUNT(*) as aggregate")
            ->groupBy('bucket')
            ->orderByDesc('aggregate')
            ->limit(10)
            ->get()
            ->map(fn ($row): array => [
                'label' => (string) $row->bucket,
                'value' => (int) $row->aggregate,
            ])
            ->all();
    }

    /**
     * Per-doctor load against `doctor_profiles.max_patients_per_day`, the cap
     * the Scope sets at 5.
     *
     * Utilisation divides by *active* days rather than calendar days: a doctor
     * who works Tuesdays should not read as 20% utilised because they saw
     * nobody on the Monday.
     *
     * @return array<int, array{doctor: string, appointments: int, activeDays: int, averagePerDay: float, cap: int, utilisation: float}>
     */
    private function doctorLoad(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->appointmentsInRange($from, $to)
            ->join('doctor_profiles', 'doctor_profiles.user_id', '=', 'appointments.doctor_id')
            ->whereNotIn('appointments.status', ['cancelled', 'no_show'])
            ->selectRaw('doctor_profiles.display_name as doctor')
            ->selectRaw('doctor_profiles.max_patients_per_day as cap')
            ->selectRaw('COUNT(*) as appointments')
            ->selectRaw('COUNT(DISTINCT appointments.appointment_date) as active_days')
            ->groupBy('doctor', 'cap')
            ->orderByDesc('appointments')
            ->get()
            ->map(function ($row): array {
                $activeDays = max(1, (int) $row->active_days);
                $average = round((int) $row->appointments / $activeDays, 1);
                $cap = (int) $row->cap;

                return [
                    'doctor' => (string) $row->doctor,
                    'appointments' => (int) $row->appointments,
                    'activeDays' => (int) $row->active_days,
                    'averagePerDay' => $average,
                    'cap' => $cap,
                    'utilisation' => $cap > 0 ? round($average / $cap * 100, 1) : 0.0,
                ];
            })
            ->all();
    }

    /**
     * The doctor → nurse → doctor chain of custody, in hours.
     *
     * Averages run only over rows that reached the stage being measured, so a
     * test still sitting in the queue does not enter as a zero-hour turnaround.
     *
     * @return array<string, int|float>
     */
    private function labTurnaround(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $base = fn () => LabTestResult::query()
            ->whereBetween('requested_at', [$from, $to]);

        $toRecorded = $base()
            ->whereNotNull('recorded_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, requested_at, recorded_at)) as average')
            ->value('average');

        $toReviewed = $base()
            ->whereNotNull('reviewed_at')
            ->whereNotNull('recorded_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, recorded_at, reviewed_at)) as average')
            ->value('average');

        $endToEnd = $base()
            ->whereNotNull('reviewed_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, requested_at, reviewed_at)) as average')
            ->value('average');

        return [
            'requested' => $base()->count(),
            'awaitingResults' => $base()->where('status', 'requested')->count(),
            'awaitingReview' => $base()->where('status', 'recorded')->count(),
            'reviewed' => $base()->where('status', 'reviewed')->count(),
            'hoursToRecord' => round((float) ($toRecorded ?? 0), 1),
            'hoursToReview' => round((float) ($toReviewed ?? 0), 1),
            'hoursEndToEnd' => round((float) ($endToEnd ?? 0), 1),
        ];
    }

    /**
     * LOA requests whose decision can actually be timed.
     *
     * The `>= requested_at` guard is not defensive padding. LoaService stamps
     * `requested_at` at creation and `approved_at`/`rejected_at` at the
     * decision, so the live workflow cannot invert them — but Phase 2's
     * backfill migration created LOA rows for HMO appointments that had
     * *already* been approved before the table existed, giving those rows a
     * decision timestamp earlier than their own submission. Ten of the thirty-
     * five decided rows in the development database are like that, and they
     * dragged the reported average to -284.9 hours: a negative turnaround,
     * rendered without complaint.
     *
     * They are excluded rather than clamped, for the same reason back-entered
     * appointments are excluded from lead time — the record was created after
     * the event it claims to measure, so there is no duration to average.
     *
     * @return Builder<LoaRequest>
     */
    private function timedDecisions(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return LoaRequest::query()
            ->whereBetween('requested_at', [$from, $to])
            ->whereRaw('COALESCE(approved_at, rejected_at) >= requested_at');
    }

    /** Average hours from LOA submission to whichever decision was made. */
    private function averageDecisionHours(CarbonImmutable $from, CarbonImmutable $to): float
    {
        $average = $this->timedDecisions($from, $to)
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, requested_at, COALESCE(approved_at, rejected_at))) as average')
            ->value('average');

        return round((float) ($average ?? 0), 1);
    }

    /**
     * How long the *currently* undecided LOA requests have been waiting.
     *
     * Deliberately not range-filtered: a request submitted four months ago and
     * still pending is exactly the one HR needs to see, and a 30-day window
     * would hide it. The UI labels this "current queue" for that reason.
     *
     * @return array<int, array{label: string, value: int}>
     */
    private function pendingAgeing(): array
    {
        $now = CarbonImmutable::now();

        $pending = LoaRequest::query()
            ->awaitingApproval()
            ->pluck('requested_at')
            ->filter()
            ->map(fn ($requestedAt): float => $requestedAt->floatDiffInHours($now));

        $bands = [
            ['Under 24h', 0, 24],
            ['1–3 days', 24, 72],
            ['3–7 days', 72, 168],
            ['Over 7 days', 168, PHP_FLOAT_MAX],
        ];

        return collect($bands)
            ->map(fn (array $band): array => [
                'label' => $band[0],
                'value' => $pending->filter(
                    fn (float $hours): bool => $hours >= $band[1] && $hours < $band[2],
                )->count(),
            ])
            ->all();
    }

    /**
     * @return array<int, array{provider: string, submitted: int, approved: int, rejected: int, averageHours: float}>
     */
    private function loaByProvider(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return LoaRequest::query()
            ->whereBetween('requested_at', [$from, $to])
            ->selectRaw("COALESCE(NULLIF(hmo_provider, ''), 'Unspecified') as provider")
            ->selectRaw('COUNT(*) as submitted')
            ->selectRaw("SUM(status = 'approved') as approved")
            ->selectRaw("SUM(status = 'rejected') as rejected")
            // The counts include every request; only the average excludes the
            // backfilled rows whose decision precedes their submission. AVG
            // skips the NULLs the CASE produces. See timedDecisions().
            ->selectRaw('AVG(CASE WHEN COALESCE(approved_at, rejected_at) >= requested_at
                THEN TIMESTAMPDIFF(HOUR, requested_at, COALESCE(approved_at, rejected_at)) END) as average_hours')
            ->groupBy('provider')
            ->orderByDesc('submitted')
            ->get()
            ->map(fn ($row): array => [
                'provider' => (string) $row->provider,
                'submitted' => (int) $row->submitted,
                'approved' => (int) $row->approved,
                'rejected' => (int) $row->rejected,
                'averageHours' => round((float) ($row->average_hours ?? 0), 1),
            ])
            ->all();
    }

    // ── CSV row builders ──────────────────────────────────────────────────────

    /** @return array{title: string, headers: array<int, string>, rows: array<int, array<int, string|int|float>>} */
    private function patientTrendsRows(string $range): array
    {
        $data = $this->patientTrends($range);

        $rows = collect($data['newVsReturning'])
            ->map(fn (array $row): array => ['Bookings', $row['label'], $row['new'] + $row['returning']])
            ->merge(collect($data['registrations'])->map(
                fn (array $row): array => ['Patient registrations', $row['label'], $row['value']],
            ))
            ->merge($this->labelledRows('Gender', $data['gender']))
            ->merge($this->labelledRows('Age band', $data['ageBands']))
            ->merge($this->labelledRows('Coverage', $data['coverage']))
            ->merge($this->labelledRows('Service', $data['topServices']))
            ->all();

        return [
            'title' => 'Patient trends',
            'headers' => ['Metric', 'Segment', 'Value'],
            'rows' => $rows,
        ];
    }

    /** @return array{title: string, headers: array<int, string>, rows: array<int, array<int, string|int|float>>} */
    private function appointmentVolumeRows(string $range): array
    {
        $data = $this->appointmentVolume($range);

        $rows = $this->labelledRows('Volume', $data['series'])
            ->merge($this->labelledRows('Status', $data['byStatus']))
            ->merge($this->labelledRows('Weekday', $data['byWeekday']))
            ->merge($this->labelledRows('Doctor', $data['byDoctor']))
            ->merge($this->labelledRows('Time slot', $data['byTimeSlot']))
            ->merge($this->labelledRows('Consultation type', $data['byType']))
            ->all();

        return [
            'title' => 'Appointment volume',
            'headers' => ['Metric', 'Segment', 'Value'],
            'rows' => $rows,
        ];
    }

    /** @return array{title: string, headers: array<int, string>, rows: array<int, array<int, string|int|float>>} */
    private function clinicPerformanceRows(string $range): array
    {
        $data = $this->clinicPerformance($range);

        $rows = collect($data['rates'])
            ->map(fn (array $row): array => ['Outcome', $row['label'], $row['count'], $row['value'].'%'])
            ->merge(collect($data['doctorLoad'])->map(fn (array $row): array => [
                'Doctor load',
                $row['doctor'],
                $row['appointments'],
                $row['averagePerDay'].' per active day (cap '.$row['cap'].')',
            ]))
            ->merge(collect($data['labTurnaround'])->map(fn ($value, string $key): array => [
                'Laboratory',
                $this->humanise($key),
                $value,
                str_contains($key, 'hours') ? 'hours' : 'tests',
            ])->values())
            ->push([
                'Lead time',
                'Average days booked in advance',
                $data['stats']['averageLeadTimeDays'],
                'days · over '.$data['stats']['leadTimeSample'].' forward-booked appointments',
            ])
            ->all();

        return [
            'title' => 'Clinic performance',
            'headers' => ['Metric', 'Segment', 'Value', 'Detail'],
            'rows' => $rows,
        ];
    }

    /** @return array{title: string, headers: array<int, string>, rows: array<int, array<int, string|int|float>>} */
    private function loaTurnaroundRows(string $range): array
    {
        $data = $this->loaTurnaround($range);

        $rows = collect($data['series'])
            ->map(fn (array $row): array => ['Submitted', $row['label'], $row['submitted'], ''])
            ->merge(collect($data['series'])->map(
                fn (array $row): array => ['Decided', $row['label'], $row['decided'], ''],
            ))
            ->merge($this->labelledRows('Status', $data['byStatus'])->map(
                fn (array $row): array => [...$row, ''],
            ))
            ->merge($this->labelledRows('Pending queue age', $data['ageing'])->map(
                fn (array $row): array => [...$row, ''],
            ))
            ->merge(collect($data['byProvider'])->map(fn (array $row): array => [
                'HMO provider',
                $row['provider'],
                $row['submitted'],
                $row['approved'].' approved · '.$row['rejected'].' rejected · '.$row['averageHours'].'h average',
            ]))
            ->push([
                'Turnaround',
                'Average hours to decision',
                $data['stats']['averageDecisionHours'],
                'over '.$data['stats']['decisionSample'].' timed decisions',
            ])
            ->all();

        return [
            'title' => 'LOA turnaround',
            'headers' => ['Metric', 'Segment', 'Value', 'Detail'],
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<int, array{label: string, value: int}>  $rows
     * @return Collection<int, array<int, string|int>>
     */
    private function labelledRows(string $metric, array $rows): Collection
    {
        return collect($rows)->map(
            fn (array $row): array => [$metric, $row['label'], $row['value']],
        );
    }
}
