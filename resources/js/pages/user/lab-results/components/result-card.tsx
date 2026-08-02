// resources/js/pages/user/lab-results/components/result-card.tsx

import type { ReactElement } from 'react';
import type { LabResult } from '../lab-results-data';
import { labResultsMeta, severityStyles } from '../lab-results-data';
import { ParameterTable } from './parameter-table';

interface ResultCardProps {
    result: LabResult;
    /** Shown only when the account guarantees more than one patient. */
    showPatientName: boolean;
}

export function ResultCard({
    result,
    showPatientName,
}: ResultCardProps): ReactElement {
    const { labels, severityLabels } = labResultsMeta;
    const severity = result.severity ?? 'normal';
    const style = severityStyles[severity];

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
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--wc-gray-900)',
                        }}
                    >
                        {result.testName}
                    </h2>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 13,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {[
                            showPatientName ? result.patientName : null,
                            result.reviewedAt,
                            result.reviewedBy
                                ? `${labels.reviewedBy} ${result.reviewedBy}`
                                : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>

                <span
                    style={{
                        fontSize: 11,
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
                    {severityLabels[severity]}
                </span>
            </header>

            <div style={{ padding: 'var(--space-5)' }}>
                <ParameterTable parameters={result.parameters} />

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
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '.05em',
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {labels.interpretation}
                    </p>
                    <p
                        style={{
                            margin: '6px 0 0',
                            fontSize: 14,
                            color: 'var(--wc-gray-800)',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {result.interpretation || labels.noInterpretation}
                    </p>
                </div>
            </div>
        </article>
    );
}
