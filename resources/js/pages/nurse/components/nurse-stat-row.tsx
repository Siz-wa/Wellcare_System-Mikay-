// resources/js/pages/nurse/components/nurse-stat-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared stat row for the nurse portal. Same visual spec as the lab queue's
// QueueStats, generalised so the dashboard and the appointment monitor do not
// each grow their own copy.

import type { ReactElement, ReactNode } from 'react';

export interface NurseStat {
    key: string;
    label: string;
    value: number | string;
    icon: ReactNode;
    color: string;
    bg: string;
}

interface NurseStatRowProps {
    stats: NurseStat[];
    minWidth?: number;
}

export function NurseStatRow({
    stats,
    minWidth = 200,
}: NurseStatRowProps): ReactElement {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
            }}
        >
            {stats.map((stat) => (
                <div
                    key={stat.key}
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
                            background: stat.bg,
                            color: stat.color,
                        }}
                    >
                        {stat.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                color: 'var(--wc-gray-500)',
                            }}
                        >
                            {stat.label}
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
                            {stat.value}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
