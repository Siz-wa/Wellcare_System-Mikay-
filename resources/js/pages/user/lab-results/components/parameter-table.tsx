// resources/js/pages/user/lab-results/components/parameter-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The measured values inside one test. Scrolls horizontally on narrow screens
// rather than forcing the page body to scroll.

import type { ReactElement } from 'react';
import type { LabParameter } from '../lab-results-data';
import { labResultsMeta } from '../lab-results-data';

interface ParameterTableProps {
    parameters: LabParameter[];
}

export function ParameterTable({
    parameters,
}: ParameterTableProps): ReactElement {
    const { labels } = labResultsMeta;

    if (parameters.length === 0) {
        return (
            <p
                style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--wc-gray-500)',
                }}
            >
                {labels.noParameters}
            </p>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                    minWidth: 420,
                }}
            >
                <thead>
                    <tr>
                        {[
                            labels.parameter,
                            labels.result,
                            labels.reference,
                        ].map((heading) => (
                            <th
                                key={heading}
                                style={{
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '.05em',
                                    color: 'var(--wc-gray-500)',
                                    borderBottom:
                                        '1px solid var(--wc-gray-200)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {heading}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {parameters.map((param, index) => {
                        const isAbnormal = param.status === 'abnormal';

                        return (
                            <tr key={`${param.name}-${index}`}>
                                <td
                                    style={{
                                        padding: '10px 12px',
                                        color: 'var(--wc-gray-700)',
                                        borderBottom:
                                            '1px solid var(--wc-gray-100)',
                                    }}
                                >
                                    {param.name}
                                </td>
                                <td
                                    style={{
                                        padding: '10px 12px',
                                        fontWeight: 600,
                                        // Colour alone never carries the signal —
                                        // the • marker repeats it non-visually.
                                        color: isAbnormal
                                            ? '#b45309'
                                            : 'var(--wc-gray-900)',
                                        borderBottom:
                                            '1px solid var(--wc-gray-100)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {param.result}
                                    {param.unit ? ` ${param.unit}` : ''}
                                    {isAbnormal && (
                                        <span
                                            title="Outside reference range"
                                            style={{ marginLeft: 6 }}
                                        >
                                            •
                                        </span>
                                    )}
                                </td>
                                <td
                                    style={{
                                        padding: '10px 12px',
                                        color: 'var(--wc-gray-500)',
                                        borderBottom:
                                            '1px solid var(--wc-gray-100)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {param.refRange || '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
