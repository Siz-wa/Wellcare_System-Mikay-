// resources/js/pages/hr/analytics/components/analytics-stat-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Headline figures for a report, driven by the StatDef lists in
// analytics-data.ts. Same treatment as admin/sections/admin-stat-row.tsx — the
// shared StatCard takes value and label only, so the hint sits beneath it
// rather than widening the design-system primitive for one caller.

import type { ReactElement } from 'react';
import { StatCard } from '@/design-system';
import { formatStat } from '@/pages/hr/analytics/analytics-data';
import type { StatDef } from '@/pages/hr/analytics/analytics-data';

interface AnalyticsStatRowProps {
    stats: Record<string, number>;
    cards: StatDef[];
}

export function AnalyticsStatRow({
    stats,
    cards,
}: AnalyticsStatRowProps): ReactElement {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
            }}
        >
            {cards.map((card) => (
                <div key={card.key}>
                    <StatCard
                        value={formatStat(stats[card.key] ?? 0, card.format)}
                        label={card.label}
                    />
                    <p
                        style={{
                            margin: 'var(--space-2) 0 0',
                            paddingLeft: 2,
                            fontSize: '11px',
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {card.hint}
                    </p>
                </div>
            ))}
        </div>
    );
}
