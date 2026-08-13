// resources/js/pages/hr/analytics/sections/patient-trends-report.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Objective 1.5, clause 1 — "patient trends".
//
// The distributions are booking-level, not patient-level, and the card titles
// say so ("Bookings by gender", not "Patients by gender"). Appointments carry
// their own demographic snapshot taken at booking time, so counting them
// answers "who did the clinic see this quarter" without a join — but it is a
// different question from "who is registered", and the copy must not blur them.

import type { ReactElement } from 'react';
import {
    chartTitles,
    patientTrendStats,
} from '@/pages/hr/analytics/analytics-data';
import type { PatientTrends } from '@/pages/hr/analytics/analytics-data';
import { AnalyticsStatRow } from '@/pages/hr/analytics/components/analytics-stat-row';
import {
    CategoryBars,
    ChartCard,
    ChartGrid,
    DualTrendLine,
    hasMarks,
    SplitDonut,
    TrendLine,
} from '@/pages/hr/analytics/components/chart-card';

export function PatientTrendsReport({
    data,
    rangeLabel,
}: {
    data: PatientTrends;
    rangeLabel: string;
}): ReactElement {
    return (
        <>
            <AnalyticsStatRow stats={data.stats} cards={patientTrendStats} />

            <ChartGrid>
                <ChartCard
                    title={chartTitles.newVsReturning}
                    hint={rangeLabel}
                    hasData={data.newVsReturning.some(
                        (row) => row.new > 0 || row.returning > 0,
                    )}
                >
                    <DualTrendLine
                        data={data.newVsReturning}
                        keys={['new', 'returning']}
                        names={['New', 'Returning']}
                    />
                </ChartCard>

                <ChartCard
                    title={chartTitles.registrations}
                    hint="New patient records created"
                    hasData={hasMarks(data.registrations)}
                >
                    <TrendLine data={data.registrations} />
                </ChartCard>

                <ChartCard
                    title={chartTitles.gender}
                    hint="Recorded at booking"
                    hasData={hasMarks(data.gender)}
                >
                    <SplitDonut data={data.gender} />
                </ChartCard>

                <ChartCard
                    title={chartTitles.ageBands}
                    hint="Recorded at booking"
                    hasData={hasMarks(data.ageBands)}
                >
                    <CategoryBars data={data.ageBands} />
                </ChartCard>

                <ChartCard
                    title={chartTitles.coverage}
                    hint="Cash, HMO, PhilHealth or corporate"
                    hasData={hasMarks(data.coverage)}
                >
                    <SplitDonut data={data.coverage} />
                </ChartCard>

                <ChartCard
                    title={chartTitles.topServices}
                    hint="Top 8 by booking count"
                    hasData={hasMarks(data.topServices)}
                >
                    <CategoryBars data={data.topServices} horizontal />
                </ChartCard>
            </ChartGrid>
        </>
    );
}
