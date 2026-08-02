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
                        fontSize: 24,
                        fontWeight: 700,
                        color: 'var(--wc-gray-900)',
                        margin: 0,
                        fontFamily:
                            'var(--font-display, "Bricolage Grotesque")',
                    }}
                >
                    {labResultsMeta.title}
                </h1>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 14,
                        color: 'var(--wc-gray-500)',
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
