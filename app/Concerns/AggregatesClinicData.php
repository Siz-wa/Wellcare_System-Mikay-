<?php

namespace App\Concerns;

use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * The period, bucketing and label vocabulary shared by the analytics reports
 * and the clinic diagnostics.
 *
 * Extracted during Phase 6.1 for the same reason ReadsPatientRecords was
 * extracted in Phase 5: two callers must not drift apart on what a thing *is*.
 * A diagnostic that resolved `90d` one day differently from the descriptive
 * report sitting next to it would produce two plausible, disagreeing numbers on
 * one screen — precisely the silent failure this project keeps getting bitten
 * by, and one no test would flag because each half would be internally
 * consistent.
 *
 * Behaviour is unchanged from AnalyticsService, where all of this originated.
 * That service's 57 tests are the regression net for the move.
 */
trait AggregatesClinicData
{
    /**
     * Labels a generic slug-to-sentence pass would mangle. Acronyms lose their
     * casing to it, and "Hmo" on a clinic report reads as a bug to anyone who
     * works there.
     */
    private const LABEL_OVERRIDES = [
        'hmo' => 'HMO',
        'philhealth' => 'PhilHealth',
        'no_show' => 'No-show',
        'in_person' => 'In-person',
        'pending_hmo_approval' => 'Pending HMO approval',
    ];

    /**
     * Resolve a range key into inclusive bounds plus the bucket granularity.
     *
     * Granularity keeps the trend charts readable: 90 daily points is noise for
     * a single-branch clinic, and 365 is unreadable.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: string}
     */
    private function resolveRange(string $range): array
    {
        $today = CarbonImmutable::today();

        return match ($range) {
            '30d' => [$today->subDays(29)->startOfDay(), $today->endOfDay(), 'day'],
            '12m' => [$today->subMonthsNoOverflow(11)->startOfMonth(), $today->endOfDay(), 'month'],
            default => [$today->subDays(89)->startOfDay(), $today->endOfDay(), 'week'],
        };
    }

    /**
     * Day-level counts for any query, keyed 'Y-m-d'.
     *
     * Everything groups by day in SQL and is bucketed in PHP afterwards. One
     * SQL shape and one bucketing function is far easier to keep correct than
     * three sets of MySQL date expressions, and the row count is bounded by the
     * range (365 at most).
     *
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     * @return array<string, int>
     */
    private function countsByDay($query, string $column): array
    {
        return $query
            ->selectRaw("DATE_FORMAT({$column}, '%Y-%m-%d') as day, COUNT(*) as aggregate")
            ->groupBy('day')
            ->pluck('aggregate', 'day')
            ->map(fn ($value): int => (int) $value)
            ->all();
    }

    /**
     * Roll day counts up into the range's buckets, emitting every bucket in the
     * period — including empty ones. A line chart that silently omits a zero
     * week draws a slope where there was a gap.
     *
     * @param  array<string, int>  $countsByDay
     * @return array<int, array{label: string, value: int}>
     */
    private function bucket(array $countsByDay, CarbonImmutable $from, CarbonImmutable $to, string $granularity): array
    {
        $buckets = [];

        $cursor = match ($granularity) {
            'month' => $from->startOfMonth(),
            'week' => $from->startOfWeek(),
            default => $from->startOfDay(),
        };

        while ($cursor <= $to) {
            $buckets[$this->bucketKey($cursor, $granularity)] = [
                'label' => $this->bucketLabel($cursor, $granularity),
                'value' => 0,
            ];

            $cursor = match ($granularity) {
                'month' => $cursor->addMonthNoOverflow(),
                'week' => $cursor->addWeek(),
                default => $cursor->addDay(),
            };
        }

        foreach ($countsByDay as $day => $count) {
            $key = $this->bucketKey(CarbonImmutable::parse($day), $granularity);

            if (isset($buckets[$key])) {
                $buckets[$key]['value'] += $count;
            }
        }

        return array_values($buckets);
    }

    private function bucketKey(CarbonImmutable $date, string $granularity): string
    {
        return match ($granularity) {
            'month' => $date->format('Y-m'),
            'week' => $date->startOfWeek()->format('Y-m-d'),
            default => $date->format('Y-m-d'),
        };
    }

    private function bucketLabel(CarbonImmutable $date, string $granularity): string
    {
        return match ($granularity) {
            'month' => $date->format('M Y'),
            'week' => $date->startOfWeek()->format('j M'),
            default => $date->format('j M'),
        };
    }

    /**
     * Appointments whose *care date* falls in the range.
     *
     * `appointment_date` rather than `created_at`: the clinic's question is
     * "how busy was that week", not "when were those bookings typed in". Lead
     * time is the one metric that needs both, and says so where it is computed.
     *
     * @return Builder<Appointment>
     */
    private function appointmentsInRange(CarbonImmutable $from, CarbonImmutable $to)
    {
        // Qualified because several callers join `doctor_profiles`.
        return Appointment::query()
            ->whereBetween('appointments.appointment_date', [$from->toDateString(), $to->toDateString()]);
    }

    /**
     * A percentage that is 0 rather than NAN on an empty denominator. An empty
     * window is the normal state of a freshly seeded database, not an error.
     */
    private function rate(int $part, int $total): float
    {
        return $total === 0 ? 0.0 : round($part / $total * 100, 1);
    }

    /** `general-consultation` → `General consultation`, `hoursToRecord` → `Hours to record`. */
    private function humanise(string $value): string
    {
        if (isset(self::LABEL_OVERRIDES[$value])) {
            return self::LABEL_OVERRIDES[$value];
        }

        $spaced = preg_replace('/(?<!^)[A-Z]/', ' $0', $value) ?? $value;
        $spaced = strtolower(str_replace(['_', '-'], ' ', $spaced));

        // Collapse runs of whitespace. The camelCase split above inserts a
        // space before every capital, so an input that is already spaced
        // ("Diabetes Management", as the service column stores it) came out
        // double-spaced — visible on the Phase 6 service chart as well.
        $spaced = preg_replace('/\s+/', ' ', trim($spaced)) ?? $spaced;

        return ucfirst($spaced);
    }
}
