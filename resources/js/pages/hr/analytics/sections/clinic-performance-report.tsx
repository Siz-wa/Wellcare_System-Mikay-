// resources/js/pages/hr/analytics/sections/clinic-performance-report.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Objective 1.5, clause 3 — "clinic performance".
//
// Two things here are worth reading the copy carefully for, because both are
// easy to misreport:
//
//   • Doctor utilisation divides by *active* days, not calendar days. A doctor
//     who holds Tuesday clinics is not 20% utilised because they saw nobody on
//     the Monday. The column header says "per active day" for that reason.
//   • Lead time covers forward-booked appointments only, and the card states
//     the sample size — back-entered paper records have no lead time to average
//     and would otherwise drag the mean negative.
//
// AdminTable is reused rather than re-implemented; its own header comment notes
// that it exists so the same table is not written out per page.

import type { ReactElement } from 'react';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import {
    chartTitles,
    clinicPerformanceStats,
} from '@/pages/hr/analytics/analytics-data';
import type { ClinicPerformance } from '@/pages/hr/analytics/analytics-data';
import { AnalyticsStatRow } from '@/pages/hr/analytics/components/analytics-stat-row';
import {
    CategoryBars,
    ChartCard,
    ChartGrid,
    hasMarks,
} from '@/pages/hr/analytics/components/chart-card';

export function ClinicPerformanceReport({
    data,
    rangeLabel,
}: {
    data: ClinicPerformance;
    rangeLabel: string;
}): ReactElement {
    const lab = data.labTurnaround;

    const labStages = [
        { label: 'Awaiting results', value: lab.awaitingResults },
        { label: 'Awaiting review', value: lab.awaitingReview },
        { label: 'Reviewed', value: lab.reviewed },
    ];

    return (
        <>
            <AnalyticsStatRow
                stats={data.stats}
                cards={clinicPerformanceStats}
            />

            <p
                style={{
                    margin: '0 0 var(--space-6)',
                    fontSize: 11,
                    color: 'var(--wc-gray-500)',
                }}
            >
                Lead time averages {data.stats.leadTimeSample} forward-booked
                appointment{data.stats.leadTimeSample === 1 ? '' : 's'} in this
                period. Records entered after the visit are excluded.
            </p>

            <ChartGrid>
                <ChartCard
                    title={chartTitles.outcomes}
                    hint={`${rangeLabel} · ${data.stats.total} appointments`}
                    hasData={hasMarks(
                        data.rates.map((r) => ({ value: r.count })),
                    )}
                >
                    <CategoryBars
                        data={data.rates.map((rate) => ({
                            label: rate.label,
                            value: rate.count,
                        }))}
                    />
                </ChartCard>

                <ChartCard
                    title={chartTitles.labTurnaround}
                    hint={`${lab.requested} tests ordered · ${lab.hoursEndToEnd}h average order to validated result`}
                    hasData={hasMarks(labStages)}
                >
                    <CategoryBars data={labStages} horizontal />
                </ChartCard>
            </ChartGrid>

            <div className="wc-card wc-card-body">
                <h3
                    style={{
                        margin: '0 0 var(--space-1)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--wc-gray-800)',
                    }}
                >
                    {chartTitles.doctorLoad}
                </h3>
                <p
                    style={{
                        margin: '0 0 var(--space-4)',
                        fontSize: 11,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    Cancelled and no-show appointments are excluded — they
                    consumed a slot but not the doctor&rsquo;s time.
                </p>

                <AdminTable
                    columns={[
                        'Doctor',
                        'Appointments',
                        'Active days',
                        'Per active day',
                        'Daily cap',
                        'Utilisation',
                    ]}
                    isEmpty={data.doctorLoad.length === 0}
                    emptyMessage="No doctor had a booked appointment in this period."
                >
                    {data.doctorLoad.map((row) => (
                        <tr key={row.doctor}>
                            <AdminTableCell nowrap>{row.doctor}</AdminTableCell>
                            <AdminTableCell>{row.appointments}</AdminTableCell>
                            <AdminTableCell>{row.activeDays}</AdminTableCell>
                            <AdminTableCell>{row.averagePerDay}</AdminTableCell>
                            <AdminTableCell>{row.cap}</AdminTableCell>
                            <AdminTableCell nowrap>
                                <span
                                    className={`wc-badge ${
                                        row.utilisation >= 100
                                            ? 'wc-badge-error'
                                            : row.utilisation >= 80
                                              ? 'wc-badge-warning'
                                              : 'wc-badge-success'
                                    }`}
                                >
                                    {row.utilisation}%
                                </span>
                            </AdminTableCell>
                        </tr>
                    ))}
                </AdminTable>
            </div>
        </>
    );
}
