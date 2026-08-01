// resources/js/pages/user/records/sections/visits-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Completed consultations. Only the assessment and plan halves of the SOAP note
// are shown — subjective/objective are the doctor's working notes.

import { CalendarCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import { SectionShell } from '../components/section-shell';
import type { Visit } from '../records-data';
import { recordsMeta } from '../records-data';

interface VisitsSectionProps {
    visits: Visit[];
}

export function VisitsSection({ visits }: VisitsSectionProps): ReactElement {
    const { labels, sections, empty, vitalLabels } = recordsMeta;

    return (
        <SectionShell
            title={sections.visits}
            icon={<CalendarCheck size={17} strokeWidth={1.8} />}
            accent="#16a34a"
            count={visits.length}
            isEmpty={visits.length === 0}
            emptyText={empty.visits}
        >
            <ol
                style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                }}
            >
                {visits.map((visit) => {
                    const vitals = visit.vitals
                        ? (
                              Object.entries(vitalLabels) as Array<
                                  [keyof typeof vitalLabels, string]
                              >
                          ).filter(([key]) => Boolean(visit.vitals?.[key]))
                        : [];

                    return (
                        <li
                            key={visit.id}
                            style={{
                                padding: 'var(--space-4)',
                                borderRadius: 10,
                                border: '1px solid var(--wc-gray-200)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: 'var(--space-3)',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: 'var(--wc-gray-900)',
                                    }}
                                >
                                    {visit.service}
                                </span>
                                <span
                                    style={{
                                        fontSize: 13,
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    {visit.date} · {visit.time}
                                </span>
                            </div>

                            {visit.doctor && (
                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: 13,
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    {labels.seenBy} {visit.doctor}
                                </p>
                            )}

                            {visit.assessment && (
                                <Block
                                    label={labels.assessment}
                                    text={visit.assessment}
                                />
                            )}
                            {visit.plan && (
                                <Block label={labels.plan} text={visit.plan} />
                            )}

                            {vitals.length > 0 && (
                                <div style={{ marginTop: 'var(--space-3)' }}>
                                    <FieldLabel>{labels.vitals}</FieldLabel>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 'var(--space-2)',
                                            marginTop: 4,
                                        }}
                                    >
                                        {vitals.map(([key, label]) => (
                                            <span
                                                key={key}
                                                style={{
                                                    fontSize: 12,
                                                    color: 'var(--wc-gray-700)',
                                                    background:
                                                        'var(--wc-gray-100)',
                                                    borderRadius: 6,
                                                    padding: '3px 8px',
                                                }}
                                            >
                                                {label}: {visit.vitals?.[key]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {visit.prescriptions.length > 0 && (
                                <div style={{ marginTop: 'var(--space-3)' }}>
                                    <FieldLabel>
                                        {labels.prescriptions}
                                    </FieldLabel>
                                    <ul
                                        style={{
                                            margin: '4px 0 0',
                                            paddingLeft: 18,
                                            fontSize: 13,
                                            color: 'var(--wc-gray-700)',
                                        }}
                                    >
                                        {visit.prescriptions.map((rx, i) => (
                                            <li key={`${visit.id}-rx-${i}`}>
                                                <strong>{rx.name}</strong> —{' '}
                                                {rx.instructions}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </SectionShell>
    );
}

function FieldLabel({ children }: { children: string }): ReactElement {
    return (
        <span
            style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                color: 'var(--wc-gray-500)',
            }}
        >
            {children}
        </span>
    );
}

function Block({ label, text }: { label: string; text: string }): ReactElement {
    return (
        <div style={{ marginTop: 'var(--space-3)' }}>
            <FieldLabel>{label}</FieldLabel>
            <p
                style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: 'var(--wc-gray-700)',
                    whiteSpace: 'pre-wrap',
                }}
            >
                {text}
            </p>
        </div>
    );
}
