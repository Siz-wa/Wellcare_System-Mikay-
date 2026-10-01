// resources/js/pages/user/lab-results/lab-results.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "View Laboratory Results" (Fig. 4 / Fig. 11). Composition only.
// The controller returns reviewed results exclusively — nothing here filters.

import type { ReactElement } from 'react';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { PageProps } from '@/types';
import type { LabResult, LabResultStats } from './lab-results-data';
import { labResultsMeta } from './lab-results-data';
import { ResultsList } from './sections/results-list';
import { ResultsStats } from './sections/results-stats';

interface PageData extends PageProps {
    results: LabResult[];
    stats: LabResultStats;
}

export default function LabResultsPage({
    results,
    stats,
}: PageData): ReactElement {
    return (
        <PatientDashboardLayout activeId="lab-results">
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 700,
                        color: 'var(--wc-text-primary)',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {labResultsMeta.title}
                </h1>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-muted)',
                        maxWidth: 640,
                    }}
                >
                    {labResultsMeta.subtitle}
                </p>
            </header>

            {results.length > 0 && <ResultsStats stats={stats} />}

            <ResultsList
                results={results}
                showPatientNames={stats.patients > 1}
            />
        </PatientDashboardLayout>
    );
}
