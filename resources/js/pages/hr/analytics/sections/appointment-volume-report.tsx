// resources/js/pages/hr/analytics/sections/appointment-volume-report.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Objective 1.5, clause 2 — "appointment data".
//
// Everything here is keyed on `appointment_date`, the date of care, not on
// when the booking was typed in. "How busy was that week" is the clinic's
// question; the booking timestamp answers a different one and is used only by
// the lead-time metric on the performance report.

import type { ReactElement } from 'react';
import {
    appointmentVolumeStats,
    chartTitles,
} from '@/pages/hr/analytics/analytics-data';
import type { AppointmentVolume } from '@/pages/hr/analytics/analytics-data';
import { AnalyticsStatRow } from '@/pages/hr/analytics/components/analytics-stat-row';
import {
    CategoryBars,
    ChartCard,
    ChartGrid,
    hasMarks,
    SplitDonut,
    TrendLine,
} from '@/pages/hr/analytics/components/chart-card';

export function AppointmentVolumeReport({
    data,
    rangeLabel,
}: {
    data: AppointmentVolume;
    rangeLabel: string;
}): ReactElement {
    return (
        <>
            <AnalyticsStatRow
                stats={data.stats}
                cards={appointmentVolumeStats}
            />

            <ChartGrid>
                <ChartCard
                    title={chartTitles.volume}
                    hint={rangeLabel}
                    hasData={hasMarks(data.series)}
                >
                    <TrendLine data={data.series} />
                </ChartCard>

                <ChartCard
                    title={chartTitles.byStatus}
                    hint="Where each booking ended up"
                    hasData={hasMarks(data.byStatus)}
                >
                    <CategoryBars data={data.byStatus} horizontal />
                </ChartCard>

                <ChartCard
                    title={chartTitles.byWeekday}
                    hint="Totals across the whole period"
                    hasData={hasMarks(data.byWeekday)}
                >
                    <CategoryBars data={data.byWeekday} />
                </ChartCard>

                <ChartCard
                    title={chartTitles.byDoctor}
                    hint="Unassigned means booked as next available"
                    hasData={hasMarks(data.byDoctor)}
                >
                    <CategoryBars data={data.byDoctor} horizontal />
                </ChartCard>

                <ChartCard
                    title={chartTitles.byTimeSlot}
                    hint="Top 8 slots"
                    hasData={hasMarks(data.byTimeSlot)}
                >
                    <CategoryBars data={data.byTimeSlot} horizontal />
                </ChartCard>

                <ChartCard
                    title={chartTitles.byType}
                    hint="Chosen by the patient at booking"
                    hasData={hasMarks(data.byType)}
                >
                    <SplitDonut data={data.byType} />
                </ChartCard>
            </ChartGrid>
        </>
    );
}
