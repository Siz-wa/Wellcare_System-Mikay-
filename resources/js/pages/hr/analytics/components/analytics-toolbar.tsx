// resources/js/pages/hr/analytics/components/analytics-toolbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reporting-period selector plus the CSV download for the report on screen.
//
// The range is a server round trip, not a client filter: every aggregate is
// computed in SQL, so narrowing the window has to re-ask the database. The
// export link carries the same range, which is what keeps a downloaded file
// matching the screen it was downloaded from.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import {
    analyticsCopy,
    rangeOptions,
} from '@/pages/hr/analytics/analytics-data';
import type { RangeKey, ReportKey } from '@/pages/hr/analytics/analytics-data';

interface AnalyticsToolbarProps {
    range: RangeKey;
    report: ReportKey;
}

export function AnalyticsToolbar({
    range,
    report,
}: AnalyticsToolbarProps): ReactElement {
    function selectRange(next: RangeKey): void {
        if (next === range) {
            return;
        }

        router.get(
            '/hr/analytics',
            { range: next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
            }}
        >
            <div
                role="group"
                aria-label={analyticsCopy.rangeLegend}
                style={{
                    display: 'inline-flex',
                    padding: 3,
                    borderRadius: 10,
                    background: 'var(--wc-gray-100)',
                    border: '1px solid var(--wc-gray-200)',
                }}
            >
                {rangeOptions.map((option) => {
                    const isActive = option.key === range;

                    return (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => selectRange(option.key)}
                            aria-pressed={isActive}
                            style={{
                                border: 0,
                                cursor: 'pointer',
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: 'var(--text-sm)',
                                fontWeight: isActive ? 700 : 500,
                                fontFamily: 'inherit',
                                color: isActive
                                    ? 'var(--wc-blue-700)'
                                    : 'var(--wc-gray-600)',
                                background: isActive
                                    ? 'var(--wc-white)'
                                    : 'transparent',
                                boxShadow: isActive
                                    ? '0 1px 2px rgba(0,0,0,0.08)'
                                    : 'none',
                            }}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            {/*
              A plain anchor, not an Inertia <Link>: this is a file download, and
              an Inertia visit would try to parse the CSV as a page response.
            */}
            <a
                className="wc-btn wc-btn-sm wc-btn-outline"
                href={`/hr/analytics/export/${report}?range=${range}`}
            >
                {analyticsCopy.exportLabel}
            </a>
        </div>
    );
}
