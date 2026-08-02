// resources/js/pages/admin/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// System Administrator dashboard — Fig. 4's admin "Dashboard" flow.
// Composition only; all copy lives in dashboard-data.ts.

import type { ReactElement } from 'react';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import {
    adminDashboardCopy,
    secondaryStatCards,
    statCards,
} from '@/pages/admin/dashboard-data';
import type {
    ActivityRow,
    AdminStats,
    RoleBreakdownRow,
} from '@/pages/admin/dashboard-data';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { AdminStatRow } from '@/pages/admin/sections/admin-stat-row';
import { RecentActivity } from '@/pages/admin/sections/recent-activity';
import { RoleBreakdown } from '@/pages/admin/sections/role-breakdown';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    stats: AdminStats;
    roleBreakdown: RoleBreakdownRow[];
    recentActivity: ActivityRow[];
}

export default function AdminDashboardPage({
    stats,
    roleBreakdown,
    recentActivity,
}: PageData): ReactElement {
    return (
        <AdminDashboardLayout activeId={adminDashboardCopy.activeNavId}>
            <AdminPageHeader
                title={adminDashboardCopy.pageTitle}
                subtitle={adminDashboardCopy.pageSubtitle}
            />

            <AdminStatRow stats={stats} cards={statCards} />
            <AdminStatRow stats={stats} cards={secondaryStatCards} />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: 'var(--space-6)',
                }}
            >
                <RoleBreakdown rows={roleBreakdown} />
                <RecentActivity rows={recentActivity} />
            </div>

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
