// resources/js/pages/user/payments/components/payment-card.tsx

import { AlertTriangle, Paperclip } from 'lucide-react';
import type { ReactElement } from 'react';
import { proof } from '@/routes/user/payments';
import type { PaymentChannel, PaymentRecord } from '../payments-data';
import { formatPeso, paymentsMeta, statusStyles } from '../payments-data';
import { SettleForm } from './settle-form';

interface PaymentCardProps {
    payment: PaymentRecord;
    channels: PaymentChannel[];
    /** Shown only when the account guarantees more than one patient. */
    showPatientName: boolean;
}

export function PaymentCard({
    payment,
    channels,
    showPatientName,
}: PaymentCardProps): ReactElement {
    const { labels, statusLabels, statusHints, overdueNotice } = paymentsMeta;
    const style = statusStyles[payment.status];

    // The form appears only while something is actually owed. A verified or
    // waived record showing a "submit payment" form would invite a second
    // payment for a consultation already settled.
    const isOwed =
        payment.status === 'pending' || payment.status === 'rejected';

    const facts = [
        { label: labels.amountDue, value: formatPeso(payment.amountDue) },
        {
            label: labels.amountPaid,
            value:
                payment.amountPaid !== null
                    ? formatPeso(payment.amountPaid)
                    : '—',
        },
        { label: labels.method, value: payment.methodLabel ?? '—' },
        /*
         * Three states, not two. `submitted` is neither owed nor decided, and
         * collapsing it into the decided branch labelled it "Confirmed" —
         * directly contradicting the "Being checked" badge two inches away and
         * telling the patient their payment had been accepted when nobody had
         * looked at it yet.
         */
        isOwed
            ? { label: labels.dueBy, value: payment.dueAt ?? '—' }
            : payment.status === 'submitted'
              ? {
                    label: labels.submitted,
                    value: payment.submittedAt ?? '—',
                }
              : {
                    label: labels.decided,
                    value: payment.decidedAt ?? payment.submittedAt ?? '—',
                },
    ];

    return (
        <article
            style={{
                background: '#fff',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 'var(--radius-lg, 12px)',
                overflow: 'hidden',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--wc-gray-200)',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            color: 'var(--wc-text-primary)',
                        }}
                    >
                        {payment.appointment?.service ?? 'Video consultation'}
                    </h2>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {labels.reference}: {payment.reference}
                        {showPatientName && ` · ${payment.patientName}`}
                    </p>
                </div>

                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        color: style.color,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {statusLabels[payment.status]}
                </span>
            </header>

            <div style={{ padding: 'var(--space-5)' }}>
                {payment.isOverdue && isOwed && (
                    <div
                        role="alert"
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3)',
                            marginBottom: 'var(--space-4)',
                            borderRadius: 'var(--radius-md, 8px)',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            fontSize: 'var(--text-sm)',
                            lineHeight: 1.5,
                        }}
                    >
                        <AlertTriangle
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                            style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <span>{overdueNotice}</span>
                    </div>
                )}

                <dl
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: 'var(--space-4)',
                        margin: '0 0 var(--space-4)',
                    }}
                >
                    {facts.map((fact) => (
                        <div key={fact.label}>
                            <dt
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-text-muted)',
                                }}
                            >
                                {fact.label}
                            </dt>
                            <dd
                                style={{
                                    margin: '2px 0 0',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    color: 'var(--wc-text-primary)',
                                }}
                            >
                                {fact.value}
                            </dd>
                        </div>
                    ))}
                </dl>

                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.55,
                        color: 'var(--wc-text-secondary)',
                    }}
                >
                    {statusHints[payment.status]}
                </p>

                {payment.remarks && (
                    <div
                        style={{
                            marginTop: 'var(--space-4)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md, 8px)',
                            background: 'var(--wc-gray-50)',
                            border: '1px solid var(--wc-gray-200)',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {labels.remarks}
                        </p>
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {payment.remarks}
                        </p>
                    </div>
                )}

                {payment.hasProof && (
                    <p style={{ margin: 'var(--space-4) 0 0' }}>
                        <a
                            href={proof(payment.id).url}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-link)',
                            }}
                        >
                            <Paperclip
                                size={14}
                                strokeWidth={1.8}
                                aria-hidden="true"
                            />
                            {labels.proof}
                            {payment.proofName ? ` — ${payment.proofName}` : ''}
                        </a>
                    </p>
                )}
            </div>

            {isOwed && <SettleForm payment={payment} channels={channels} />}
        </article>
    );
}
