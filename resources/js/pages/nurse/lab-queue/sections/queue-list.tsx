// resources/js/pages/nurse/lab-queue/sections/queue-list.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A titled card wrapping a list of lab requests. Used twice: once for the
// actionable pending queue, once for the read-only recent list.

import type { ReactElement } from 'react';
import { QueueRow } from '../components/queue-row';
import type { LabQueueItem } from '../lab-queue-data';

interface QueueListProps {
    title: string;
    items: LabQueueItem[];
    emptyMessage: string;
    onRecord?: (item: LabQueueItem) => void;
}

export function QueueList({
    title,
    items,
    emptyMessage,
    onRecord,
}: QueueListProps): ReactElement {
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
                        <QueueRow
                            key={item.id}
                            item={item}
                            isLast={i === items.length - 1}
                            onRecord={onRecord}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
