// resources/js/pages/user/records/sections/diagnoses-section.tsx

import { Stethoscope } from 'lucide-react';
import type { ReactElement } from 'react';
import { SectionShell } from '../components/section-shell';
import type { Diagnosis } from '../records-data';
import { diagnosisStatusStyles, recordsMeta } from '../records-data';

interface DiagnosesSectionProps {
    diagnoses: Diagnosis[];
}

export function DiagnosesSection({
    diagnoses,
}: DiagnosesSectionProps): ReactElement {
    const { labels, sections, empty } = recordsMeta;

    return (
        <SectionShell
            title={sections.diagnoses}
            icon={<Stethoscope size={17} strokeWidth={1.8} />}
            accent="#7c3aed"
            count={diagnoses.length}
            isEmpty={diagnoses.length === 0}
            emptyText={empty.diagnoses}
        >
            <ul
                style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                }}
            >
                {diagnoses.map((diagnosis) => {
                    const style = diagnosisStatusStyles[diagnosis.status];

                    return (
                        <li
                            key={diagnosis.id}
                            style={{
                                padding: 'var(--space-4)',
                                borderRadius: 10,
                                border: '1px solid var(--wc-gray-200)',
                            }}
                        >
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
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: 'var(--wc-gray-900)',
                                    }}
                                >
                                    {diagnosis.diagnosis}
                                </span>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '.05em',
                                        color: style.color,
                                        background: style.bg,
                                        borderRadius: 999,
                                        padding: '2px 8px',
                                    }}
                                >
                                    {style.label}
                                </span>
                                {diagnosis.icdCode && (
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontFamily:
                                                'ui-monospace, monospace',
                                            color: 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {labels.icdCode} {diagnosis.icdCode}
                                    </span>
                                )}
                            </div>

                            <p
                                style={{
                                    margin: '6px 0 0',
                                    fontSize: 13,
                                    color: 'var(--wc-gray-500)',
                                }}
                            >
                                {labels.diagnosedOn} {diagnosis.diagnosedAt}
                            </p>

                            {diagnosis.notes && (
                                <p
                                    style={{
                                        margin: '6px 0 0',
                                        fontSize: 13,
                                        color: 'var(--wc-gray-700)',
                                    }}
                                >
                                    {diagnosis.notes}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </SectionShell>
    );
}
