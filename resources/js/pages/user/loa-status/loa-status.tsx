// resources/js/pages/user/loa-status/loa-status.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Check LOA status" (Objective 1.6, Fig. 11). Composition only.
// The controller scopes to the patients this account guarantees.

import type { ReactElement } from 'react';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { PageProps } from '@/types';
import type { LoaRequest, LoaStats } from './loa-status-data';
import { loaStatusMeta } from './loa-status-data';
import { LoaList } from './sections/loa-list';
import { LoaStatsRow } from './sections/loa-stats';

interface PageData extends PageProps {
    requests: LoaRequest[];
    stats: LoaStats;
}

export default function LoaStatusPage({
    requests,
    stats,
}: PageData): ReactElement {
    // Only worth naming the patient on each card when the account covers
    // more than one person — same rule the lab results page uses.
    const showPatientNames =
        new Set(requests.map((request) => request.patientName)).size > 1;

    return (
        <PatientDashboardLayout activeId="loa-status">
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
                    {loaStatusMeta.title}
                </h1>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 14,
                        color: 'var(--wc-gray-500)',
                        maxWidth: 640,
                    }}
                >
                    {loaStatusMeta.subtitle}
                </p>
            </header>

            {requests.length > 0 && <LoaStatsRow stats={stats} />}

            <LoaList requests={requests} showPatientNames={showPatientNames} />
        </PatientDashboardLayout>
    );
}
