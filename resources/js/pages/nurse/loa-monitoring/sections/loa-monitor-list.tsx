// resources/js/pages/nurse/loa-monitoring/sections/loa-monitor-list.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A titled card wrapping a list of LOA requests. Used twice: once for the
// pending queue, once for the recently-decided list. Neither is actionable —
// the nurse monitors, HR decides.

import type { ReactElement } from 'react';
import { LoaMonitorRow } from '../components/loa-monitor-row';
import type { LoaMonitorItem } from '../loa-monitoring-data';

interface LoaMonitorListProps {
    title: string;
    items: LoaMonitorItem[];
    emptyMessage: string;
}

export function LoaMonitorList({
    title,
    items,
    emptyMessage,
}: LoaMonitorListProps): ReactElement {
    return (
        <section
            style={{
                background: 'var(--wc-white)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 16,
                padding: 'var(--space-6)',
                marginBottom: 'var(--space-6)',
            }}
        >
            <h2
                style={{
                    margin: '0 0 var(--space-2)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                    color: 'var(--wc-dark)',
                    fontFamily: "var(--font-display,'Bricolage Grotesque')",
                }}
            >
                {title}
            </h2>

            {items.length === 0 ? (
                <p
                    style={{
                        margin: 'var(--space-4) 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {emptyMessage}
                </p>
            ) : (
                <div>
                    {items.map((item, i) => (
                        <LoaMonitorRow
                            key={item.id}
                            item={item}
                            isLast={i === items.length - 1}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
