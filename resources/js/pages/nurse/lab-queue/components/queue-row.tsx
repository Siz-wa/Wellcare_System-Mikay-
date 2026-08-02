// resources/js/pages/nurse/lab-queue/components/queue-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One lab request in either queue list. Used by both sections, so the action
// button is optional — the "recently recorded" list is read-only.

import { FlaskConical } from 'lucide-react';
import type { ReactElement } from 'react';
import { labQueueMeta, severityColors, statusLabels } from '../lab-queue-data';
import type { LabQueueItem } from '../lab-queue-data';

interface QueueRowProps {
    item: LabQueueItem;
    isLast: boolean;
    onRecord?: (item: LabQueueItem) => void;
}

export function QueueRow({
    item,
    isLast,
    onRecord,
}: QueueRowProps): ReactElement {
    const accent = item.severity
        ? severityColors[item.severity]
        : 'var(--wc-blue-600)';

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
            {/* Flask avatar */}
            <div
                style={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${accent}15`,
                    color: accent,
                }}
            >
                <FlaskConical size={19} strokeWidth={1.8} />
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
                    {item.test} · {item.patientId}
                    {item.requestedBy
                        ? ` · ${labQueueMeta.requestedByLabel} ${item.requestedBy}`
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
                        background: `${accent}15`,
                        color: accent,
                    }}
                >
                    {item.severity
                        ? item.severity.toUpperCase()
                        : statusLabels[item.status].toUpperCase()}
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

            {onRecord && (
                <button
                    type="button"
                    className="wc-btn wc-btn-primary wc-btn-sm"
                    onClick={() => onRecord(item)}
                    style={{ flexShrink: 0 }}
                >
                    {labQueueMeta.recordLabel}
                </button>
            )}
        </div>
    );
}
