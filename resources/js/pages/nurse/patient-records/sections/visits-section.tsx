// resources/js/pages/nurse/patient-records/sections/visits-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Completed visit history with the doctor's SOAP assessment and prescriptions.
// Read-only.

import type { ReactElement } from 'react';
import { EmptyNote, RecordSection } from '../components/record-section';
import type { Visit } from '../patient-records-data';
import { nursePatientRecordsMeta } from '../patient-records-data';

interface VisitsSectionProps {
    visits: Visit[];
}

export function VisitsSection({ visits }: VisitsSectionProps): ReactElement {
    const meta = nursePatientRecordsMeta;

    return (
        <RecordSection title={meta.visitsTitle}>
            {visits.length === 0 ? (
                <EmptyNote>{meta.visitsEmpty}</EmptyNote>
            ) : (
                <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {visits.map((visit, index) => (
                        <li
                            key={visit.id}
                            style={{
                                padding: 'var(--space-4) 0',
                                borderTop:
                                    index === 0
                                        ? 'none'
                                        : '1px solid var(--wc-gray-100)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'baseline',
                                    gap: 'var(--space-2)',
                                    marginBottom: 'var(--space-2)',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 700,
                                        color: 'var(--wc-dark)',
                                    }}
                                >
                                    {visit.service}
                                </span>
                                <span
                                    style={{
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    {visit.date}
                                </span>
                            </div>

                            {visit.soap?.assessment && (
                                <p
                                    style={{
                                        margin: '0 0 4px',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-gray-700)',
                                    }}
                                >
                                    <strong
                                        style={{
                                            color: 'var(--wc-gray-500)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {meta.visitAssessmentLabel}:{' '}
                                    </strong>
                                    {visit.soap.assessment}
                                </p>
                            )}

                            {visit.soap?.plan && (
                                <p
                                    style={{
                                        margin: '0 0 4px',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-gray-700)',
                                    }}
                                >
                                    <strong
                                        style={{
                                            color: 'var(--wc-gray-500)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {meta.visitPlanLabel}:{' '}
                                    </strong>
                                    {visit.soap.plan}
                                </p>
                            )}

                            {visit.prescriptions.length > 0 && (
                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    <strong style={{ fontWeight: 700 }}>
                                        {meta.visitPrescriptionsLabel}:{' '}
                                    </strong>
                                    {visit.prescriptions
                                        .map((p) =>
                                            p.instructions
                                                ? `${p.name} (${p.instructions})`
                                                : p.name,
                                        )
                                        .join(', ')}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </RecordSection>
    );
}
