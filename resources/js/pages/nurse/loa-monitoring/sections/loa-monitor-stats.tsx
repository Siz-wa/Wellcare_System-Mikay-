// resources/js/pages/nurse/loa-monitoring/sections/loa-monitor-stats.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Three-up stat row across the top of the LOA monitor.

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { ReactElement } from 'react';
import { loaMonitoringMeta } from '../loa-monitoring-data';
import type { LoaMonitorStats } from '../loa-monitoring-data';

interface LoaMonitorStatsRowProps {
    stats: LoaMonitorStats;
}

export function LoaMonitorStatsRow({
    stats,
}: LoaMonitorStatsRowProps): ReactElement {
    const cards = [
        {
            label: loaMonitoringMeta.statsLabels.pending,
            value: stats.pending,
            icon: <Clock size={18} strokeWidth={1.8} />,
            color: 'var(--wc-blue-600)',
            bg: '#eff6ff',
        },
        {
            label: loaMonitoringMeta.statsLabels.approvedToday,
            value: stats.approvedToday,
            icon: <CheckCircle2 size={18} strokeWidth={1.8} />,
            color: '#16a34a',
            bg: '#f0fdf4',
        },
        {
            label: loaMonitoringMeta.statsLabels.rejectedToday,
            value: stats.rejectedToday,
            icon: <XCircle size={18} strokeWidth={1.8} />,
            color: '#dc2626',
            bg: '#fef2f2',
        },
    ];

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
            }}
        >
            {cards.map((card) => (
                <div
                    key={card.label}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-5)',
                        background: 'var(--wc-white)',
                        border: '1px solid var(--wc-gray-200)',
                        borderRadius: 16,
                    }}
                >
                    <div
                        style={{
                            width: 42,
                            height: 42,
                            flexShrink: 0,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: card.bg,
                            color: card.color,
                        }}
                    >
                        {card.icon}
                    </div>
                    <div>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                color: 'var(--wc-gray-500)',
                            }}
                        >
                            {card.label}
                        </p>
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-2xl)',
                                fontWeight: 800,
                                lineHeight: 1.1,
                                color: 'var(--wc-dark)',
                                fontFamily:
                                    "var(--font-display,'Bricolage Grotesque')",
                            }}
                        >
                            {card.value}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
