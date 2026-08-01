// resources/js/pages/user/lab-results/sections/results-list.tsx

import { FlaskConical } from 'lucide-react';
import type { ReactElement } from 'react';
import { ResultCard } from '../components/result-card';
import type { LabResult } from '../lab-results-data';
import { labResultsMeta } from '../lab-results-data';

interface ResultsListProps {
    results: LabResult[];
    showPatientNames: boolean;
}

export function ResultsList({
    results,
    showPatientNames,
}: ResultsListProps): ReactElement {
    if (results.length === 0) {
        return <EmptyResults />;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
            }}
        >
            {results.map((result) => (
                <ResultCard
                    key={result.id}
                    result={result}
                    showPatientName={showPatientNames}
                />
            ))}
        </div>
    );
}

function EmptyResults(): ReactElement {
    const { empty } = labResultsMeta;

    return (
        <div
            style={{
                background: '#fff',
                border: '1px dashed var(--wc-gray-300)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 'var(--space-10) var(--space-6)',
                textAlign: 'center',
            }}
        >
            <FlaskConical
                size={32}
                strokeWidth={1.5}
                style={{ color: 'var(--wc-gray-400)' }}
            />
            <h2
                style={{
                    margin: 'var(--space-4) 0 0',
                    fontSize: 17,
                    fontWeight: 600,
                    color: 'var(--wc-gray-900)',
                }}
            >
                {empty.title}
            </h2>
            <p
                style={{
                    margin: '6px auto 0',
                    fontSize: 14,
                    color: 'var(--wc-gray-500)',
                    maxWidth: 460,
                }}
            >
                {empty.body}
            </p>
        </div>
    );
}
