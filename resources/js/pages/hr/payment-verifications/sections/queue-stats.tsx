// resources/js/pages/hr/payment-verifications/sections/queue-stats.tsx

import { AlertTriangle, BadgeCheck, Coins, Search, Wallet } from 'lucide-react';
import type { ReactElement } from 'react';
import type { QueueStats } from '../payment-verifications-data';
import { formatPeso, queueMeta } from '../payment-verifications-data';

interface QueueStatsRowProps {
    stats: QueueStats;
}

export function QueueStatsRow({ stats }: QueueStatsRowProps): ReactElement {
    const { statsLabels } = queueMeta;

    const cards = [
        {
            label: statsLabels.pending,
            value: String(stats.pending),
            icon: <Search size={18} strokeWidth={1.8} />,
            color: '#1d4ed8',
            bg: '#eff6ff',
        },
        {
            label: statsLabels.outstanding,
            value: String(stats.outstanding),
            icon: <Wallet size={18} strokeWidth={1.8} />,
            color: '#b45309',
            bg: '#fffbeb',
        },
        {
            label: statsLabels.overdue,
            value: String(stats.overdue),
            icon: <AlertTriangle size={18} strokeWidth={1.8} />,
            color: '#b91c1c',
            bg: '#fef2f2',
        },
        {
            label: statsLabels.verifiedToday,
            value: String(stats.verifiedToday),
            icon: <BadgeCheck size={18} strokeWidth={1.8} />,
            color: '#16a34a',
            bg: '#f0fdf4',
        },
        {
            label: statsLabels.collectedToday,
            value: formatPeso(stats.collectedToday),
            icon: <Coins size={18} strokeWidth={1.8} />,
            color: 'var(--wc-blue-600)',
            bg: '#eff6ff',
        },
    ];

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
                        gap: 'var(--space-3)',
                        background: '#fff',
                        border: '1px solid var(--wc-gray-200)',
                        borderRadius: 'var(--radius-lg, 12px)',
                        padding: 'var(--space-4) var(--space-5)',
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            color: card.color,
                            background: card.bg,
                            flexShrink: 0,
                        }}
                    >
                        {card.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-lg)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                color: 'var(--wc-text-primary)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {card.value}
                        </p>
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {card.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
