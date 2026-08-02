// resources/js/pages/nurse/dashboard/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Staff Nurse dashboard — thin composer. All copy lives in dashboard-data.ts.

import type { ReactElement } from 'react';
import { NurseDashboardLayout } from '@/pages/nurse/layout/nurse-dashboard-layout';
import type { PageProps } from '@/types';
import type {
    NurseDashboardStats,
    UpcomingAppointment,
} from './dashboard-data';
import { nurseDashboardPageMeta } from './dashboard-data';
import { DashboardStats } from './sections/dashboard-stats';
import { QuickLinks } from './sections/quick-links';
import { UpcomingList } from './sections/upcoming-list';

interface PageData extends PageProps {
    stats: NurseDashboardStats;
    upcoming: UpcomingAppointment[];
}

export default function NurseDashboardPage({
    stats,
    upcoming,
}: PageData): ReactElement {
    const meta = nurseDashboardPageMeta;

    return (
        <NurseDashboardLayout activeId={meta.activeNavId}>
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1
                    style={{
                        margin: '0 0 var(--space-1)',
                        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        color: 'var(--wc-dark)',
                        fontFamily: "var(--font-display,'Bricolage Grotesque')",
                    }}
                >
                    {meta.pageTitle}
                </h1>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.pageSubtitle}
                </p>
            </div>

            <DashboardStats stats={stats} />
            <UpcomingList appointments={upcoming} />
            <QuickLinks />
        </NurseDashboardLayout>
    );
}
