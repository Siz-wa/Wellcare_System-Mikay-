// resources/js/pages/hr/analytics/components/driver-bars.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One dimension's cancellation drivers, drawn against the clinic baseline.
//
// The baseline marker is the whole point of the component. A bar reading "33%"
// means nothing on its own; "33% against a 10.9% baseline, over 30 bookings" is
// a finding. Every row therefore shows its own sample size, and the suppressed
// count sits underneath — a reader who cannot see what was filtered out has no
// way to judge what remains.
//
// Deliberately hand-drawn rather than a recharts BarChart: this needs a
// reference line, a per-row denominator and a per-row lift, which is a table
// with a bar in it rather than a chart.

import type { ReactElement } from 'react';
import {
    chartPalette,
    diagnosticsCopy,
} from '@/pages/hr/analytics/analytics-data';
import type { FailureDimension } from '@/pages/hr/analytics/analytics-data';

interface DriverBarsProps {
    dimension: FailureDimension;
    baseline: number;
    minSample: number;
}

export function DriverBars({
    dimension,
    baseline,
    minSample,
}: DriverBarsProps): ReactElement {
    // Scale to the widest bar rather than to 100, so a dimension topping out at
    // 30% is still readable instead of a row of stubs.
    const ceiling = Math.max(
        baseline,
        ...dimension.segments.map((segment) => segment.rate),
        1,
    );

    return (
        <div className="wc-card wc-card-body" style={{ minWidth: 0 }}>
            <h4
                style={{
                    margin: '0 0 var(--space-3)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--wc-gray-800)',
                }}
            >
                {dimension.dimension}
            </h4>

            {dimension.segments.length === 0 ? (
                <p
                    style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--wc-gray-400)',
                    }}
                >
                    {diagnosticsCopy.driversEmpty}
                </p>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {dimension.segments.map((segment) => (
                        <div key={segment.label}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 'var(--space-2)',
                                    fontSize: 12,
                                    marginBottom: 4,
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: 'var(--wc-dark)',
                                    }}
                                >
                                    {segment.label}
                                </span>
                                <span style={{ color: 'var(--wc-gray-600)' }}>
                                    {segment.rate}%{' '}
                                    <span
                                        style={{ color: 'var(--wc-gray-400)' }}
                                    >
                                        ({segment.failed} of {segment.total})
                                    </span>
                                </span>
                            </div>

                            {/* Bar plus the baseline reference marker. */}
                            <div
                                style={{
                                    position: 'relative',
                                    height: 10,
                                    borderRadius: 5,
                                    background: 'var(--wc-gray-100)',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        width: `${(segment.rate / ceiling) * 100}%`,
                                        height: '100%',
                                        borderRadius: 5,
                                        background: chartPalette.error,
                                    }}
                                />
                                <div
                                    title={`${diagnosticsCopy.baselineLabel} ${baseline}%`}
                                    style={{
                                        position: 'absolute',
                                        top: -2,
                                        bottom: -2,
                                        left: `${(baseline / ceiling) * 100}%`,
                                        width: 2,
                                        background: 'var(--wc-gray-700)',
                                    }}
                                />
                            </div>

                            <p
                                style={{
                                    margin: '4px 0 0',
                                    fontSize: 11,
                                    color: 'var(--wc-gray-500)',
                                }}
                            >
                                +{segment.lift}pp above baseline ·{' '}
                                {segment.contribution}% of all cancellations
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {dimension.suppressed > 0 && (
                <p
                    style={{
                        margin: 'var(--space-3) 0 0',
                        fontSize: 11,
                        color: 'var(--wc-gray-400)',
                    }}
                >
                    {dimension.suppressed} segment
                    {dimension.suppressed === 1 ? '' : 's'} (
                    {dimension.suppressedAppointments} appointment
                    {dimension.suppressedAppointments === 1 ? '' : 's'}) held
                    fewer than {minSample} bookings and were excluded as too
                    small to compare.
                </p>
            )}
        </div>
    );
}
