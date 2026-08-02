// resources/js/pages/nurse/loa-monitoring/loa-monitoring.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Staff Nurse LOA monitor — thin composer. Copy lives in loa-monitoring-data.ts.
// Read-only by design: Fig. 10 has the nurse *checking* approval status, while
// the approve/reject decision belongs to HR (Fig. 8).

import type { ReactElement } from 'react';
import { NurseDashboardLayout } from '@/pages/nurse/layout/nurse-dashboard-layout';
import type { PageProps } from '@/types';
import { loaMonitoringMeta } from './loa-monitoring-data';
import type { LoaMonitorItem, LoaMonitorStats } from './loa-monitoring-data';
import { LoaMonitorList } from './sections/loa-monitor-list';
import { LoaMonitorStatsRow } from './sections/loa-monitor-stats';

interface PageData extends PageProps {
    pending: LoaMonitorItem[];
    recent: LoaMonitorItem[];
    stats: LoaMonitorStats;
}

export default function LoaMonitoringPage({
    pending,
    recent,
    stats,
}: PageData): ReactElement {
    const meta = loaMonitoringMeta;

    return (
        <NurseDashboardLayout activeId={meta.activeNavId}>
            {/* ── Page header ─────────────────────────────────────────────── */}
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

            <LoaMonitorStatsRow stats={stats} />

            <LoaMonitorList
                title={meta.pendingCardTitle}
                items={pending}
                emptyMessage={meta.emptyPending}
            />

            <LoaMonitorList
                title={meta.recentCardTitle}
                items={recent}
                emptyMessage={meta.emptyRecent}
            />
        </NurseDashboardLayout>
    );
}
