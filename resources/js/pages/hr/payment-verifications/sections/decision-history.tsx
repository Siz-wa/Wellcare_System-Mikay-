// resources/js/pages/hr/payment-verifications/sections/decision-history.tsx
// The last decisions on the settlement queue, so a confirmed payment does not
// simply disappear from the page that confirmed it.

import type { ReactElement } from 'react';
import { Badge, Card, CardBody, CardHeader } from '@/design-system';
import type { DecidedPayment } from '../payment-verifications-data';
import { historyMeta } from '../payment-verifications-data';

const peso = (n: number | null): string =>
    n === null
        ? '—'
        : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export function DecisionHistory({
    history,
}: {
    history: DecidedPayment[];
}): ReactElement {
    return (
        <div style={{ marginTop: 'var(--space-6)' }}>
            <Card>
                <CardHeader>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700 }}>
                            {historyMeta.title}
                        </p>
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {historyMeta.subtitle}
                        </p>
                    </div>
                </CardHeader>
                <CardBody>
                    {history.length === 0 ? (
                        <p style={{ margin: 0, color: 'var(--wc-text-muted)' }}>
                            {historyMeta.empty}
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: 'var(--text-sm)',
                                    minWidth: 720,
                                }}
                            >
                                <thead>
                                    <tr>
                                        {historyMeta.columns.map((c) => (
                                            <th
                                                key={c}
                                                style={{
                                                    textAlign: 'left',
                                                    padding: '8px 10px',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--wc-text-muted)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    borderBottom:
                                                        '1px solid var(--wc-gray-200)',
                                                }}
                                            >
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((p) => (
                                        <tr
                                            key={p.id}
                                            style={{
                                                borderBottom:
                                                    '1px solid var(--wc-gray-100)',
                                            }}
                                        >
                                            <td style={cell}>{p.reference}</td>
                                            <td style={cell}>{p.patient}</td>
                                            <td style={cell}>
                                                <Badge
                                                    variant={
                                                        p.status === 'rejected'
                                                            ? 'error'
                                                            : 'success'
                                                    }
                                                >
                                                    {
                                                        historyMeta
                                                            .statusLabels[
                                                            p.status
                                                        ]
                                                    }
                                                </Badge>
                                            </td>
                                            <td style={cell}>
                                                {peso(
                                                    p.amountPaid ?? p.amountDue,
                                                )}
                                            </td>
                                            <td style={cell}>
                                                {p.methodLabel ?? '—'}
                                            </td>
                                            <td style={cell}>
                                                {p.decidedAt ?? '—'}
                                            </td>
                                            <td style={cell}>
                                                {p.decidedBy ?? '—'}
                                            </td>
                                            <td style={cell}>
                                                {p.remarks ?? '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

const cell: React.CSSProperties = {
    padding: '8px 10px',
    verticalAlign: 'top',
};
