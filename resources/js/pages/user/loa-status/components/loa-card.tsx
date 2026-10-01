// resources/js/pages/user/loa-status/components/loa-card.tsx

import type { ReactElement } from 'react';
import { hmoLabel } from '@/lib/hmo-providers';
import type { LoaRequest } from '../loa-status-data';
import { loaStatusMeta, statusStyles } from '../loa-status-data';

interface LoaCardProps {
    request: LoaRequest;
    /** Shown only when the account guarantees more than one patient. */
    showPatientName: boolean;
}

export function LoaCard({
    request,
    showPatientName,
}: LoaCardProps): ReactElement {
    const { labels, statusLabels, statusHints } = loaStatusMeta;
    const style = statusStyles[request.status];

    const facts = [
        {
            label: labels.provider,
            value: request.hmoProvider
                ? hmoLabel(request.hmoProvider)
                : labels.noProvider,
        },
        { label: labels.memberId, value: request.hmoId ?? '—' },
        { label: labels.requested, value: request.requestedAt ?? '—' },
        {
            label:
                request.status === 'rejected'
                    ? labels.decided
                    : labels.validUntil,
            value:
                (request.status === 'rejected'
                    ? request.decidedAt
                    : request.validUntil) ?? '—',
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
                            fontWeight: 600,
                            color: 'var(--wc-text-primary)',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {request.loaNumber}
                    </h2>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {[
                            showPatientName ? request.patientName : null,
                            request.requestedAgo,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>

                <span
                    style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.05em',
                        color: style.color,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        borderRadius: 999,
                        padding: '4px 10px',
                        flexShrink: 0,
                    }}
                >
                    {statusLabels[request.status]}
                </span>
            </header>

            <div style={{ padding: 'var(--space-5)' }}>
                <dl
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 'var(--space-4)',
                        margin: 0,
                    }}
                >
                    {facts.map((fact) => (
                        <div key={fact.label}>
                            <dt
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '.05em',
                                    color: 'var(--wc-text-muted)',
                                }}
                            >
                                {fact.label}
                            </dt>
                            <dd
                                style={{
                                    margin: '4px 0 0',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--wc-text-primary)',
                                }}
                            >
                                {fact.value}
                            </dd>
                        </div>
                    ))}
                </dl>

                {request.appointment && (
                    <p
                        style={{
                            margin: 'var(--space-4) 0 0',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-secondary)',
                        }}
                    >
                        <strong style={{ color: 'var(--wc-text-primary)' }}>
                            {labels.appointment}:
                        </strong>{' '}
                        {[
                            request.appointment.service,
                            request.appointment.date,
                            request.appointment.time,
                            request.appointment.doctor,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                )}

                {/* What to do next. Without this a rejected LOA is a dead end. */}
                <p
                    style={{
                        margin: 'var(--space-4) 0 0',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 10,
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.5,
                        color: style.color,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                    }}
                >
                    {statusHints[request.status]}
                </p>

                {request.remarks && (
                    <div
                        style={{
                            marginTop: 'var(--space-4)',
                            padding: 'var(--space-4)',
                            borderRadius: 10,
                            background: 'var(--wc-gray-50)',
                            border: '1px solid var(--wc-gray-200)',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '.05em',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {labels.remarks}
                        </p>
                        <p
                            style={{
                                margin: '6px 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-primary)',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {request.remarks}
                        </p>
                    </div>
                )}
            </div>
        </article>
    );
}
