// resources/js/pages/hr/analytics/analytics.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Objective 1.5's analytics workspace and Figure 4's "Generate Reports" flow.
// Composition only; all copy lives in analytics-data.ts.
//
// Served from the HR route group, which admins are members of — the same way
// they already reach the HMO approvals queue. One page, one service, two roles.
//
// All four report payloads arrive with the page, so the tabs are client-side
// and only the reporting period costs a round trip.

import { useState } from 'react';
import type { ReactElement } from 'react';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { analyticsCopy } from '@/pages/hr/analytics/analytics-data';
import type {
    AppointmentVolume,
    ClinicPerformance,
    Diagnostics,
    LoaTurnaround,
    PatientTrends,
    RangeKey,
    ReportKey,
} from '@/pages/hr/analytics/analytics-data';
import { AnalyticsToolbar } from '@/pages/hr/analytics/components/analytics-toolbar';
import { ReportTabs } from '@/pages/hr/analytics/components/report-tabs';
import { AppointmentVolumeReport } from '@/pages/hr/analytics/sections/appointment-volume-report';
import { ClinicPerformanceReport } from '@/pages/hr/analytics/sections/clinic-performance-report';
import { DiagnosticsReport } from '@/pages/hr/analytics/sections/diagnostics-report';
import { LoaTurnaroundReport } from '@/pages/hr/analytics/sections/loa-turnaround-report';
import { PatientTrendsReport } from '@/pages/hr/analytics/sections/patient-trends-report';
import { HRDashboardLayout } from '@/pages/hr/layout/hr-dashboard-layout';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    range: RangeKey;
    rangeLabel: string;
    patientTrends: PatientTrends;
    appointmentVolume: AppointmentVolume;
    clinicPerformance: ClinicPerformance;
    loaTurnaround: LoaTurnaround;
    diagnostics: Diagnostics;
}

export default function AnalyticsPage({
    range,
    rangeLabel,
    patientTrends,
    appointmentVolume,
    clinicPerformance,
    loaTurnaround,
    diagnostics,
}: PageData): ReactElement {
    const [report, setReport] = useState<ReportKey>('patient-trends');

    return (
        <HRDashboardLayout activeId={analyticsCopy.activeNavId}>
            <AdminPageHeader
                title={analyticsCopy.pageTitle}
                subtitle={analyticsCopy.pageSubtitle}
                action={<AnalyticsToolbar range={range} report={report} />}
            />

            <ReportTabs active={report} onSelect={setReport} />

            {report === 'patient-trends' && (
                <PatientTrendsReport
                    data={patientTrends}
                    rangeLabel={rangeLabel}
                />
            )}
            {report === 'appointment-volume' && (
                <AppointmentVolumeReport
                    data={appointmentVolume}
                    rangeLabel={rangeLabel}
                />
            )}
            {report === 'clinic-performance' && (
                <ClinicPerformanceReport
                    data={clinicPerformance}
                    rangeLabel={rangeLabel}
                />
            )}
            {report === 'loa-turnaround' && (
                <LoaTurnaroundReport
                    data={loaTurnaround}
                    rangeLabel={rangeLabel}
                />
            )}
            {report === 'diagnostics' && (
                <DiagnosticsReport data={diagnostics} rangeLabel={rangeLabel} />
            )}
        </HRDashboardLayout>
    );
}
