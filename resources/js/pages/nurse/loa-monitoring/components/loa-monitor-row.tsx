// resources/js/pages/nurse/loa-monitoring/components/loa-monitor-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One LOA request in either monitor list. No action button anywhere — Fig. 10
// gives the nurse visibility, Fig. 8 gives HR the decision.

import { ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import { loaMonitoringMeta, statusStyles } from '../loa-monitoring-data';
import type { LoaMonitorItem } from '../loa-monitoring-data';

interface LoaMonitorRowProps {
    item: LoaMonitorItem;
    isLast: boolean;
}

export function LoaMonitorRow({
    item,
    isLast,
}: LoaMonitorRowProps): ReactElement {
    const style = statusStyles[item.status];

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4) 0',
                borderBottom: isLast ? 'none' : '1px solid var(--wc-gray-100)',
            }}
        >
            {/* Coverage avatar */}
            <div
                style={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: style.bg,
                    color: style.color,
                }}
            >
                <ShieldCheck size={19} strokeWidth={1.8} />
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--wc-dark)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {item.name}
                </p>
                <p
                    style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {item.loaNumber} · {item.patientId} · {item.hmoProvider}
                    {item.hmoId !== '—' ? ` · ${item.hmoId}` : ''}
                </p>
                <p
                    style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: 'var(--wc-gray-400)',
                    }}
                >
                    {item.service} · {item.appointmentDate}
                    {item.validUntil
                        ? ` · ${loaMonitoringMeta.labels.validUntil} ${item.validUntil}`
                        : ''}
                </p>
            </div>

            {/* Status */}
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <span
                    style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: '11px',
                        fontWeight: 700,
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`,
                    }}
                >
                    {loaMonitoringMeta.statusLabels[item.status].toUpperCase()}
                </span>
                <p
                    style={{
                        margin: '4px 0 0',
                        fontSize: '11px',
                        color: 'var(--wc-gray-400)',
                    }}
                >
                    {item.timeAgo}
                </p>
            </div>
        </div>
    );
}
