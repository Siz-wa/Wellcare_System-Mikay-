// resources/js/pages/hr/analytics/sections/loa-turnaround-report.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Objective 1.5, clause 4 — "LOA requests" — and the measurement half of
// Objective 1.6's LOA monitoring.
//
// One deliberate inconsistency, labelled on screen: the pending-queue ageing
// chart is NOT range-filtered. A request submitted four months ago and still
// undecided is precisely the one HR needs to see, and a 30-day window would
// hide it. Everything else on this tab respects the selected period.

import type { ReactElement } from 'react';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import { chartTitles, loaStats } from '@/pages/hr/analytics/analytics-data';
import type { LoaTurnaround } from '@/pages/hr/analytics/analytics-data';
import { AnalyticsStatRow } from '@/pages/hr/analytics/components/analytics-stat-row';
import {
    CategoryBars,
    ChartCard,
    ChartGrid,
    DualTrendLine,
    hasMarks,
    SplitDonut,
} from '@/pages/hr/analytics/components/chart-card';

export function LoaTurnaroundReport({
    data,
    rangeLabel,
}: {
    data: LoaTurnaround;
    rangeLabel: string;
}): ReactElement {
    return (
        <>
            <AnalyticsStatRow stats={data.stats} cards={loaStats} />

            <p
                style={{
                    margin: '0 0 var(--space-6)',
                    fontSize: 11,
                    color: 'var(--wc-gray-500)',
                }}
            >
                Decision time averages {data.stats.decisionSample} request
                {data.stats.decisionSample === 1 ? '' : 's'} whose approval or
                rejection was recorded after their submission. Requests
                back-filled from appointments already decided before the LOA
                register existed are excluded.
            </p>

            <ChartGrid>
                <ChartCard
                    title={chartTitles.loaFlow}
                    hint={rangeLabel}
                    hasData={data.series.some(
                        (row) => row.submitted > 0 || row.decided > 0,
                    )}
                >
                    <DualTrendLine
                        data={data.series}
                        keys={['submitted', 'decided']}
                        names={['Submitted', 'Decided']}
                    />
                </ChartCard>

                <ChartCard
                    title={chartTitles.loaStatus}
                    hint="By submission date"
                    hasData={hasMarks(data.byStatus)}
                >
                    <SplitDonut data={data.byStatus} />
                </ChartCard>

                <ChartCard
                    title={chartTitles.loaAgeing}
                    hint={`${data.stats.pending} awaiting a decision — not limited to this period`}
                    hasData={hasMarks(data.ageing)}
                >
                    <CategoryBars data={data.ageing} />
                </ChartCard>
            </ChartGrid>

            <div className="wc-card wc-card-body">
                <h3
                    style={{
                        margin: '0 0 var(--space-4)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--wc-gray-800)',
                    }}
                >
                    {chartTitles.loaProviders}
                </h3>

                <AdminTable
                    columns={[
                        'HMO provider',
                        'Submitted',
                        'Approved',
                        'Rejected',
                        'Average decision time',
                    ]}
                    isEmpty={data.byProvider.length === 0}
                    emptyMessage="No LOA requests were submitted in this period."
                >
                    {data.byProvider.map((row) => (
                        <tr key={row.provider}>
                            <AdminTableCell nowrap>
                                {row.provider}
                            </AdminTableCell>
                            <AdminTableCell>{row.submitted}</AdminTableCell>
                            <AdminTableCell>{row.approved}</AdminTableCell>
                            <AdminTableCell>{row.rejected}</AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.averageHours}h
                            </AdminTableCell>
                        </tr>
                    ))}
                </AdminTable>
            </div>
        </>
    );
}
