// resources/js/pages/hr/payment-verifications/components/queue-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One settlement, laid out around the single thing the officer needs: the
// reference they will paste into the clinic's own GCash app or bank statement.
// It is given its own block, tabular figures and a wide track, because a
// transcription slip here means a real payment gets refused.

import { AlertTriangle, Paperclip } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/design-system';
import { proof } from '@/routes/hr/payment-verifications';
import type { QueuePayment } from '../payment-verifications-data';
import {
    formatPeso,
    queueMeta,
    statusStyles,
} from '../payment-verifications-data';
import type { DecisionKind } from './decision-dialog';

interface QueueRowProps {
    payment: QueuePayment;
    canDecide: boolean;
    onDecide: (payment: QueuePayment, kind: DecisionKind) => void;
}

export function QueueRow({
    payment,
    canDecide,
    onDecide,
}: QueueRowProps): ReactElement {
    const { labels, statusLabels, actions } = queueMeta;
    const style = statusStyles[payment.status];

    const isDeclared = payment.status === 'submitted';

    return (
        <article
            style={{
                background: '#fff',
                border: '1px solid var(--wc-gray-200)',
                borderLeft: `3px solid ${style.color}`,
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 'var(--space-5)',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--space-4)',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            color: 'var(--wc-text-primary)',
                        }}
                    >
                        {payment.patient}
                    </h3>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {payment.reference}
                        {payment.appointment &&
                            ` · ${payment.appointment.service} · ${payment.appointment.date} ${payment.appointment.time}`}
                    </p>
                    {payment.contactNumber && (
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {labels.contact}: {payment.contactNumber}
                        </p>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                    }}
                >
                    {payment.isOverdue && (
                        <span
                            title={labels.dueBy}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: '#b91c1c',
                            }}
                        >
                            <AlertTriangle
                                size={13}
                                strokeWidth={2}
                                aria-hidden="true"
                            />
                            {labels.dueBy} passed
                        </span>
                    )}
                    <span
                        style={{
                            display: 'inline-flex',
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
                </div>
            </header>

            {/* The search key. */}
            <div
                style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: isDeclared ? '#eff6ff' : 'var(--wc-gray-50)',
                    border: `1px solid ${isDeclared ? '#bfdbfe' : 'var(--wc-gray-200)'}`,
                    marginBottom: 'var(--space-4)',
                }}
            >
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {labels.remittance}
                    {payment.methodLabel ? ` · ${payment.methodLabel}` : ''}
                </p>
                <p
                    style={{
                        margin: '2px 0 0',
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--wc-text-primary)',
                        wordBreak: 'break-all',
                    }}
                >
                    {payment.remittanceReference ?? labels.noRemittance}
                </p>
            </div>

            <dl
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 'var(--space-4)',
                    margin: '0 0 var(--space-4)',
                }}
            >
                <Fact
                    label={labels.amountDue}
                    value={formatPeso(payment.amountDue)}
                />
                <Fact
                    label={labels.amountPaid}
                    value={
                        payment.amountPaid !== null
                            ? formatPeso(payment.amountPaid)
                            : '—'
                    }
                    // The mismatch is the whole reason a human is looking at
                    // this row, so it is coloured rather than left to be
                    // spotted by subtracting two columns by eye.
                    tone={payment.shortfall !== null ? '#b91c1c' : undefined}
                    note={
                        payment.shortfall === null
                            ? undefined
                            : payment.shortfall > 0
                              ? `${labels.shortfallShort} ${formatPeso(payment.shortfall)}`
                              : `${labels.overpaidBy} ${formatPeso(Math.abs(payment.shortfall))}`
                    }
                />
                <Fact
                    label={labels.submitted}
                    value={payment.submittedAt ?? '—'}
                />
                <Fact label={labels.dueBy} value={payment.dueAt ?? '—'} />
            </dl>

            {payment.remarks && (
                <p
                    style={{
                        margin: '0 0 var(--space-4)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-secondary)',
                    }}
                >
                    <span style={{ color: 'var(--wc-text-muted)' }}>
                        {labels.remarks}:{' '}
                    </span>
                    {payment.remarks}
                </p>
            )}

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                }}
            >
                {payment.hasProof && (
                    <a
                        href={proof(payment.id).url}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            marginRight: 'auto',
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
                    </a>
                )}

                {canDecide && (
                    <>
                        {isDeclared && (
                            <>
                                <Button
                                    onClick={() => onDecide(payment, 'verify')}
                                >
                                    {actions.verify}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onDecide(payment, 'reject')}
                                >
                                    {actions.reject}
                                </Button>
                            </>
                        )}
                        {/* Always offered while anything is owed, including on
                            a row the patient declared by GCash — someone who
                            said they would transfer and then walked in with
                            cash is an ordinary sequence, and the notes in the
                            drawer are the better evidence. */}
                        <Button
                            variant="outline"
                            onClick={() => onDecide(payment, 'counter')}
                        >
                            {actions.counter}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => onDecide(payment, 'waive')}
                        >
                            {actions.waive}
                        </Button>
                    </>
                )}
            </div>
        </article>
    );
}

function Fact({
    label,
    value,
    note,
    tone,
}: {
    label: string;
    value: string;
    note?: string;
    tone?: string;
}): ReactElement {
    return (
        <div>
            <dt
                style={{
                    margin: 0,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--wc-text-muted)',
                }}
            >
                {label}
            </dt>
            <dd
                style={{
                    margin: '2px 0 0',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: tone ?? 'var(--wc-text-primary)',
                }}
            >
                {value}
            </dd>
            {note && (
                <p
                    style={{
                        margin: '2px 0 0',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: tone ?? 'var(--wc-text-muted)',
                    }}
                >
                    {note}
                </p>
            )}
        </div>
    );
}
