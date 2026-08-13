// resources/js/pages/hr/analytics/components/report-tabs.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Switches between Objective 1.5's four reports.
//
// Purely client-side: all four payloads ship with the page, so switching tabs
// costs nothing and the range picker stays the only thing that hits the server.

import type { ReactElement } from 'react';
import { reportTabs } from '@/pages/hr/analytics/analytics-data';
import type { ReportKey } from '@/pages/hr/analytics/analytics-data';

interface ReportTabsProps {
    active: ReportKey;
    onSelect: (key: ReportKey) => void;
}

export function ReportTabs({
    active,
    onSelect,
}: ReportTabsProps): ReactElement {
    return (
        <div
            role="tablist"
            style={{
                display: 'flex',
                gap: 'var(--space-1)',
                marginBottom: 'var(--space-6)',
                borderBottom: '1px solid var(--wc-gray-200)',
                overflowX: 'auto',
            }}
        >
            {reportTabs.map((tab) => {
                const isActive = tab.key === active;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelect(tab.key)}
                        style={{
                            border: 0,
                            background: 'transparent',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            padding: '10px 16px',
                            fontFamily: 'inherit',
                            fontSize: 'var(--text-sm)',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive
                                ? 'var(--wc-blue-700)'
                                : 'var(--wc-gray-500)',
                            borderBottom: `2px solid ${
                                isActive ? 'var(--wc-blue-600)' : 'transparent'
                            }`,
                            marginBottom: -1,
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
