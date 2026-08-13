// resources/js/pages/hr/analytics/sections/diagnostics-report.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The diagnostic and prescriptive tab — "why", then "what to do".
//
// Order is intentional: actions first, evidence underneath. Someone opening
// this during a clinic day wants the queue, not the analysis; someone
// defending a number wants the analysis directly below it.
//
// All copy, including the deliberately non-causal phrasing, lives in
// analytics-data.ts. See the note on `diagnosticsCopy` before rewording
// anything here.

import type { ReactElement } from 'react';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import { diagnosticsCopy } from '@/pages/hr/analytics/analytics-data';
import type { Diagnostics } from '@/pages/hr/analytics/analytics-data';
import { AttentionList } from '@/pages/hr/analytics/components/attention-list';
import { ChartGrid } from '@/pages/hr/analytics/components/chart-card';
import { DriverBars } from '@/pages/hr/analytics/components/driver-bars';

function SectionHeading({
    title,
    intro,
}: {
    title: string;
    intro: string;
}): ReactElement {
    return (
        <div style={{ margin: '0 0 var(--space-4)' }}>
            <h3
                style={{
                    margin: '0 0 2px',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--wc-dark)',
                }}
            >
                {title}
            </h3>
            <p
                style={{
                    margin: 0,
                    fontSize: 11,
                    color: 'var(--wc-gray-500)',
                }}
            >
                {intro}
            </p>
        </div>
    );
}

export function DiagnosticsReport({
    data,
    rangeLabel,
}: {
    data: Diagnostics;
    rangeLabel: string;
}): ReactElement {
    const { failureDrivers: drivers, loaDelay, labBottleneck, capacity } = data;

    return (
        <>
            <AttentionList items={data.attention} />

            {/* ── Why appointments fail ── */}
            <SectionHeading
                title={diagnosticsCopy.driversTitle}
                intro={`${diagnosticsCopy.driversIntro} ${rangeLabel}: ${drivers.totalFailed} of ${drivers.totalAppointments} appointments were cancelled or missed — a ${drivers.baseline}% baseline. A segment is listed only if it holds at least ${data.criteria.minSample} bookings, at least ${data.criteria.minFailures} cancellations, and sits ${data.criteria.minLift}pp or more above that baseline.`}
            />

            <ChartGrid minWidth={340}>
                {drivers.dimensions.map((dimension) => (
                    <DriverBars
                        key={dimension.dimension}
                        dimension={dimension}
                        baseline={drivers.baseline}
                        minSample={data.criteria.minSample}
                    />
                ))}
            </ChartGrid>

            {/* ── Where LOA time goes ── */}
            <SectionHeading
                title={diagnosticsCopy.loaTitle}
                intro={diagnosticsCopy.loaIntro}
            />

            <ChartGrid minWidth={380}>
                <div className="wc-card wc-card-body">
                    <h4
                        style={{
                            margin: '0 0 var(--space-3)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: 'var(--wc-gray-800)',
                        }}
                    >
                        Share of total waiting time
                    </h4>

                    {loaDelay.totalWaitHours <= 0 ? (
                        <p
                            style={{
                                margin: 0,
                                fontSize: 12,
                                color: 'var(--wc-gray-400)',
                            }}
                        >
                            {diagnosticsCopy.loaWaitEmpty}
                        </p>
                    ) : (
                        <AdminTable
                            columns={[
                                'Provider',
                                'Share of wait',
                                'Decisions',
                                'Average',
                            ]}
                            isEmpty={loaDelay.byProvider.length === 0}
                            emptyMessage="No decided requests in this period."
                        >
                            {loaDelay.byProvider.map((row) => (
                                <tr key={row.provider}>
                                    <AdminTableCell nowrap>
                                        {row.provider}
                                    </AdminTableCell>
                                    <AdminTableCell>
                                        {row.shareOfWait}%
                                    </AdminTableCell>
                                    <AdminTableCell>
                                        {row.decisions}
                                    </AdminTableCell>
                                    <AdminTableCell nowrap>
                                        {row.averageHours}h
                                    </AdminTableCell>
                                </tr>
                            ))}
                        </AdminTable>
                    )}
                </div>

                <div className="wc-card wc-card-body">
                    <h4
                        style={{
                            margin: '0 0 var(--space-3)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: 'var(--wc-gray-800)',
                        }}
                    >
                        {diagnosticsCopy.pendingTitle}
                    </h4>

                    <AdminTable
                        columns={['Reference', 'Provider', 'Waiting']}
                        isEmpty={loaDelay.oldestPending.length === 0}
                        emptyMessage={diagnosticsCopy.pendingEmpty}
                    >
                        {loaDelay.oldestPending.map((row) => (
                            <tr key={row.loaNumber}>
                                <AdminTableCell nowrap>
                                    {row.loaNumber}
                                </AdminTableCell>
                                <AdminTableCell nowrap>
                                    {row.provider}
                                </AdminTableCell>
                                <AdminTableCell nowrap>
                                    <span
                                        className={`wc-badge ${
                                            row.daysWaiting >=
                                            data.criteria.loaChaseDays
                                                ? 'wc-badge-error'
                                                : 'wc-badge-warning'
                                        }`}
                                    >
                                        {row.daysWaiting}d
                                    </span>
                                </AdminTableCell>
                            </tr>
                        ))}
                    </AdminTable>
                </div>
            </ChartGrid>

            {/* ── Lab bottleneck and capacity ── */}
            <SectionHeading
                title={diagnosticsCopy.labTitle}
                intro={diagnosticsCopy.labIntro}
            />

            <ChartGrid minWidth={380}>
                <div className="wc-card wc-card-body">
                    <p
                        style={{
                            margin: '0 0 var(--space-3)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {labBottleneck.dominantStage ? (
                            <>
                                <strong>{labBottleneck.dominantStage}</strong>{' '}
                                is the slower stage, holding{' '}
                                <strong>{labBottleneck.dominantShare}%</strong>{' '}
                                of end-to-end time.
                            </>
                        ) : (
                            diagnosticsCopy.labUndetermined
                        )}
                    </p>

                    <AdminTable
                        columns={['Stage', 'Average', 'Waiting now', 'Stalled']}
                        isEmpty={false}
                        emptyMessage=""
                    >
                        <tr>
                            <AdminTableCell nowrap>
                                Nurse encoding
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {labBottleneck.hoursToRecord}h
                            </AdminTableCell>
                            <AdminTableCell>
                                {labBottleneck.awaitingResults}
                            </AdminTableCell>
                            <AdminTableCell>
                                {labBottleneck.staleAwaitingResults}
                            </AdminTableCell>
                        </tr>
                        <tr>
                            <AdminTableCell nowrap>
                                Doctor review
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {labBottleneck.hoursToReview}h
                            </AdminTableCell>
                            <AdminTableCell>
                                {labBottleneck.awaitingReview}
                            </AdminTableCell>
                            <AdminTableCell>
                                {labBottleneck.staleAwaitingReview}
                            </AdminTableCell>
                        </tr>
                    </AdminTable>

                    <p
                        style={{
                            margin: 'var(--space-3) 0 0',
                            fontSize: 11,
                            color: 'var(--wc-gray-400)',
                        }}
                    >
                        &ldquo;Stalled&rdquo; counts tests parked at that stage
                        for over {data.criteria.labStaleHours} hours, as of now
                        rather than within the selected period.
                    </p>
                </div>

                <div className="wc-card wc-card-body">
                    <h4
                        style={{
                            margin: '0 0 var(--space-1)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: 'var(--wc-gray-800)',
                        }}
                    >
                        {diagnosticsCopy.capacityTitle}
                    </h4>
                    <p
                        style={{
                            margin: '0 0 var(--space-3)',
                            fontSize: 11,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {diagnosticsCopy.capacityIntro} The three busiest
                        doctors carry {capacity.concentration}% of booked care;{' '}
                        {capacity.unassignedUpcoming} upcoming booking
                        {capacity.unassignedUpcoming === 1
                            ? ' has'
                            : 's have'}{' '}
                        no doctor assigned.
                    </p>

                    <AdminTable
                        columns={['Doctor', 'Date', 'Booked', 'Cap']}
                        isEmpty={capacity.capBreaches.length === 0}
                        emptyMessage={diagnosticsCopy.capacityHealthy}
                    >
                        {capacity.capBreaches.map((row) => (
                            <tr key={`${row.doctor}-${row.date}`}>
                                <AdminTableCell nowrap>
                                    {row.doctor}
                                </AdminTableCell>
                                <AdminTableCell nowrap>
                                    {row.date}
                                </AdminTableCell>
                                <AdminTableCell>
                                    <span className="wc-badge wc-badge-error">
                                        {row.booked}
                                    </span>
                                </AdminTableCell>
                                <AdminTableCell>{row.cap}</AdminTableCell>
                            </tr>
                        ))}
                    </AdminTable>
                </div>
            </ChartGrid>

            <p
                style={{
                    margin: 0,
                    fontSize: 11,
                    color: 'var(--wc-gray-400)',
                    maxWidth: '70ch',
                }}
            >
                {diagnosticsCopy.predictiveNote}
            </p>
        </>
    );
}
