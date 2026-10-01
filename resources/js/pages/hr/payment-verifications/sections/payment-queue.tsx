// resources/js/pages/hr/payment-verifications/sections/payment-queue.tsx
//
// Two lists, not one filtered table. They are different jobs: the first is work
// an officer does now, the second is money the clinic is about to lose a slot
// over. Collapsing them behind a filter hides the second, which is the one
// nobody thinks to look for.

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { DecisionKind } from '../components/decision-dialog';
import { QueueRow } from '../components/queue-row';
import type { QueuePayment } from '../payment-verifications-data';
import { queueMeta } from '../payment-verifications-data';

interface PaymentQueueProps {
    payments: QueuePayment[];
    outstanding: QueuePayment[];
    canDecide: boolean;
    onDecide: (payment: QueuePayment, kind: DecisionKind) => void;
}

type TabId = 'queue' | 'outstanding';

export function PaymentQueue({
    payments,
    outstanding,
    canDecide,
    onDecide,
}: PaymentQueueProps): ReactElement {
    const [tab, setTab] = useState<TabId>('queue');

    const rows = tab === 'queue' ? payments : outstanding;
    const emptyCopy = queueMeta.empty[tab];

    const tabs: { id: TabId; label: string; count: number }[] = [
        { id: 'queue', label: queueMeta.tabs.queue, count: payments.length },
        {
            id: 'outstanding',
            label: queueMeta.tabs.outstanding,
            count: outstanding.length,
        },
    ];

    return (
        <section>
            <div
                role="tablist"
                style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-4)',
                    borderBottom: '1px solid var(--wc-gray-200)',
                }}
            >
                {tabs.map((item) => {
                    const active = item.id === tab;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(item.id)}
                            style={{
                                appearance: 'none',
                                background: 'none',
                                border: 'none',
                                borderBottom: `2px solid ${active ? 'var(--wc-blue-600)' : 'transparent'}`,
                                padding: '10px 14px',
                                cursor: 'pointer',
                                fontSize: 'var(--text-sm)',
                                fontWeight: active ? 700 : 500,
                                color: active
                                    ? 'var(--wc-text-primary)'
                                    : 'var(--wc-text-muted)',
                            }}
                        >
                            {item.label}
                            <span
                                style={{
                                    marginLeft: 6,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                ({item.count})
                            </span>
                        </button>
                    );
                })}
            </div>

            {rows.length === 0 ? (
                <p
                    style={{
                        margin: 0,
                        padding: 'var(--space-8)',
                        textAlign: 'center',
                        background: '#fff',
                        border: '1px dashed var(--wc-gray-300)',
                        borderRadius: 'var(--radius-lg, 12px)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {emptyCopy}
                </p>
            ) : (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-3)',
                    }}
                >
                    {rows.map((payment) => (
                        <QueueRow
                            key={payment.id}
                            payment={payment}
                            canDecide={canDecide}
                            onDecide={onDecide}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
