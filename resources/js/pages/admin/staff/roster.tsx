// resources/js/pages/admin/staff/roster.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Schedule Approvals — Phase 9. Composition only.
//
// The clinic's half of the roster agreement: a doctor states the hours they can
// attend, and nothing becomes bookable until an administrator publishes it.

import type { ReactElement } from 'react';
import { Alert, StatCard } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { RosterQueue } from '@/pages/admin/staff/sections/roster-queue';
import { staffCopy, staffStatCards } from '@/pages/admin/staff/staff-data';
import type { PendingRoster, StaffStats } from '@/pages/admin/staff/staff-data';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    pending: PendingRoster[];
    stats: StaffStats;
}

export default function AdminRosterPage({
    pending,
    stats,
}: PageData): ReactElement {
    return (
        <AdminDashboardLayout activeId={staffCopy.rosterNavId}>
            <AdminPageHeader
                title={staffCopy.rosterTitle}
                subtitle={staffCopy.rosterSubtitle}
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-5)',
                }}
            >
                {staffStatCards.map((card) => (
                    <StatCard
                        key={card.key}
                        value={stats[card.key] ?? 0}
                        label={card.label}
                    />
                ))}
            </div>

            <div style={{ marginBottom: 'var(--space-5)' }}>
                <Alert variant="info">
                    Time off is not queued here. A doctor who cannot attend can
                    close a day immediately — a safety cancellation never waits
                    on approval.
                </Alert>
            </div>

            <RosterQueue pending={pending} />

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
