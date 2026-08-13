// resources/js/pages/hr/analytics/components/attention-list.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The prescriptive layer: what to do, ranked by severity, each item carrying
// the evidence that produced it.
//
// Two deliberate choices:
//
//   • The empty state is worded as good news. An action list that renders blank
//     is indistinguishable from one that failed to load, and on a clinic screen
//     "nothing needs attention" and "this page is broken" must never look alike.
//   • Items link out only when the viewer can reach the destination. The lab
//     items belong to nurse and doctor screens that admin and HR are barred
//     from, so those carry evidence and no link rather than a link to a 403.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import {
    diagnosticsCopy,
    severityBadge,
    severityLabel,
} from '@/pages/hr/analytics/analytics-data';
import type { AttentionItem } from '@/pages/hr/analytics/analytics-data';

export function AttentionList({
    items,
}: {
    items: AttentionItem[];
}): ReactElement {
    return (
        <div
            className="wc-card wc-card-body"
            style={{ marginBottom: 'var(--space-6)' }}
        >
            <h3
                style={{
                    margin: '0 0 var(--space-1)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--wc-gray-800)',
                }}
            >
                {diagnosticsCopy.attentionTitle}
            </h3>
            <p
                style={{
                    margin: '0 0 var(--space-4)',
                    fontSize: 11,
                    color: 'var(--wc-gray-500)',
                }}
            >
                {diagnosticsCopy.attentionIntro}
            </p>

            {items.length === 0 ? (
                <div
                    style={{
                        padding: 'var(--space-6)',
                        borderRadius: 10,
                        background: 'var(--wc-success-light)',
                        color: 'var(--wc-success-dark)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                    }}
                >
                    {diagnosticsCopy.attentionEmpty}
                </div>
            ) : (
                <ul
                    style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'grid',
                        gap: 'var(--space-3)',
                    }}
                >
                    {items.map((item) => (
                        <li
                            key={item.id}
                            style={{
                                border: '1px solid var(--wc-gray-200)',
                                borderRadius: 10,
                                padding: 'var(--space-4)',
                                display: 'grid',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: 'var(--space-3)',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span
                                    className={`wc-badge ${severityBadge[item.severity]}`}
                                >
                                    {severityLabel[item.severity]}
                                </span>
                                <strong
                                    style={{
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-dark)',
                                    }}
                                >
                                    {item.title}
                                </strong>
                            </div>

                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 12,
                                    color: 'var(--wc-gray-600)',
                                }}
                            >
                                {item.evidence}
                            </p>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--wc-gray-800)',
                                    }}
                                >
                                    {item.action}
                                </span>
                                {item.href && (
                                    <Link
                                        href={item.href}
                                        className="wc-btn wc-btn-xs wc-btn-outline"
                                    >
                                        Open queue
                                    </Link>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
