// resources/js/pages/hr/analytics/components/chart-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Titled card wrapper for one chart, and the shared chart primitives built on
// recharts.
//
// Everything here renders an explicit empty state rather than an axis with no
// marks: a clinic reading a report needs "no data in this range" to look
// different from "the chart failed to draw".

import type { ReactElement, ReactNode } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    analyticsCopy,
    categoricalPalette,
    chartPalette,
} from '@/pages/hr/analytics/analytics-data';
import type { Slice } from '@/pages/hr/analytics/analytics-data';

const CHART_HEIGHT = 260;

const axisProps = {
    stroke: chartPalette.axis,
    tick: { fontSize: 11, fill: chartPalette.axis },
    tickLine: false,
} as const;

const tooltipProps = {
    contentStyle: {
        borderRadius: 10,
        border: '1px solid var(--wc-gray-200)',
        fontSize: 12,
        fontFamily: "var(--font-body,'DM Sans')",
    },
} as const;

interface ChartCardProps {
    title: string;
    hint?: string;
    children: ReactNode;
    /** Renders the empty state instead of the chart when false. */
    hasData: boolean;
}

export function ChartCard({
    title,
    hint,
    children,
    hasData,
}: ChartCardProps): ReactElement {
    return (
        <div className="wc-card wc-card-body" style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <h3
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--wc-gray-800)',
                    }}
                >
                    {title}
                </h3>
                {hint && (
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 11,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {hint}
                    </p>
                )}
            </div>

            {hasData ? (
                children
            ) : (
                <div
                    style={{
                        height: CHART_HEIGHT,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-400)',
                    }}
                >
                    {analyticsCopy.emptyChart}
                </div>
            )}
        </div>
    );
}

/** A single-series trend line over the period's buckets. */
export function TrendLine({ data }: { data: Slice[] }): ReactElement {
    return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0 }}>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartPalette.grid}
                />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} width={32} {...axisProps} />
                <Tooltip {...tooltipProps} />
                <Line
                    type="monotone"
                    dataKey="value"
                    name="Count"
                    stroke={chartPalette.primary}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

interface DualLineProps {
    data: Record<string, string | number>[];
    keys: [string, string];
    names: [string, string];
}

/** Two comparable series on one axis — new vs. returning, submitted vs. decided. */
export function DualTrendLine({
    data,
    keys,
    names,
}: DualLineProps): ReactElement {
    return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0 }}>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartPalette.grid}
                />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} width={32} {...axisProps} />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                    type="monotone"
                    dataKey={keys[0]}
                    name={names[0]}
                    stroke={chartPalette.primary}
                    strokeWidth={2}
                    dot={false}
                />
                <Line
                    type="monotone"
                    dataKey={keys[1]}
                    name={names[1]}
                    stroke={chartPalette.secondary}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

/** Horizontal bars — used wherever the category labels are long enough to collide. */
export function CategoryBars({
    data,
    horizontal = false,
}: {
    data: Slice[];
    horizontal?: boolean;
}): ReactElement {
    return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart
                data={data}
                layout={horizontal ? 'vertical' : 'horizontal'}
                margin={{
                    top: 4,
                    right: 12,
                    bottom: 0,
                    left: horizontal ? 8 : 0,
                }}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartPalette.grid}
                />
                {horizontal ? (
                    <>
                        <XAxis
                            type="number"
                            allowDecimals={false}
                            {...axisProps}
                        />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={110}
                            {...axisProps}
                        />
                    </>
                ) : (
                    <>
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis
                            allowDecimals={false}
                            width={32}
                            {...axisProps}
                        />
                    </>
                )}
                {/* The hover cursor is an SVG rect, so it needs a literal. */}
                <Tooltip
                    {...tooltipProps}
                    cursor={{ fill: chartPalette.cursor }}
                />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                    {data.map((slice, index) => (
                        <Cell
                            key={slice.label}
                            fill={
                                categoricalPalette[
                                    index % categoricalPalette.length
                                ]
                            }
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

/** Composition donut for the small categorical splits. */
export function SplitDonut({ data }: { data: Slice[] }): ReactElement {
    return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <PieChart>
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={2}
                >
                    {data.map((slice, index) => (
                        <Cell
                            key={slice.label}
                            fill={
                                categoricalPalette[
                                    index % categoricalPalette.length
                                ]
                            }
                        />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
}

/** True when a chart has at least one non-zero mark to draw. */
export function hasMarks(data: { value: number }[]): boolean {
    return data.some((slice) => slice.value > 0);
}

/** Responsive two-up card grid shared by all four report sections. */
export function ChartGrid({
    children,
    minWidth = 380,
}: {
    children: ReactNode;
    minWidth?: number;
}): ReactElement {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`,
                gap: 'var(--space-6)',
                marginBottom: 'var(--space-6)',
            }}
        >
            {children}
        </div>
    );
}
