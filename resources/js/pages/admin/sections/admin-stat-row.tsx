// resources/js/pages/admin/sections/admin-stat-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A responsive row of StatCards, driven by the card definitions in
// dashboard-data.ts so the copy stays out of the markup.
//
// The design-system StatCard takes only `value` and `label`, so the hint is
// rendered beneath it rather than by extending the shared primitive for one
// caller.

import type { ReactElement } from 'react';
import { StatCard } from '@/design-system';
import type { AdminStats } from '@/pages/admin/dashboard-data';

interface AdminStatRowProps {
    stats: AdminStats;
    cards: { key: keyof AdminStats; label: string; hint: string }[];
}

export function AdminStatRow({
    stats,
    cards,
}: AdminStatRowProps): ReactElement {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
            }}
        >
            {cards.map((card) => (
                <div key={card.key}>
                    <StatCard value={stats[card.key] ?? 0} label={card.label} />
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
