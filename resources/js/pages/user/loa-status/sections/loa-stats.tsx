// resources/js/pages/user/loa-status/sections/loa-stats.tsx

import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import type { ReactElement } from 'react';
import type { LoaStats } from '../loa-status-data';
import { loaStatusMeta } from '../loa-status-data';

interface LoaStatsRowProps {
    stats: LoaStats;
}

export function LoaStatsRow({ stats }: LoaStatsRowProps): ReactElement {
    const { statsLabels } = loaStatusMeta;

    const cards = [
        {
            label: statsLabels.total,
            value: stats.total,
            icon: <FileText size={18} strokeWidth={1.8} />,
            color: 'var(--wc-blue-600)',
            bg: '#eff6ff',
        },
        {
            label: statsLabels.pending,
            value: stats.pending,
            icon: <Clock size={18} strokeWidth={1.8} />,
            color: '#b45309',
            bg: '#fffbeb',
        },
        {
            label: statsLabels.approved,
            value: stats.approved,
            icon: <CheckCircle2 size={18} strokeWidth={1.8} />,
            color: '#16a34a',
            bg: '#f0fdf4',
        },
        {
            label: statsLabels.rejected,
            value: stats.rejected,
            icon: <XCircle size={18} strokeWidth={1.8} />,
            color: '#b91c1c',
            bg: '#fef2f2',
        },
    ];

    // Two up on a phone, then as many as fit. `auto-fit` with a 180px minimum
    // cannot place two columns in a 358px content box, so on the device most of
    // this portal is read on it produced one tall column of counts and pushed
    // the actual list below the fold.
    return (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                    <div>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-xl)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                color: 'var(--wc-text-primary)',
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
