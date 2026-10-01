// resources/js/pages/owner/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// System Owner (Tier 0) dashboard — GV-6 and §5.1 of
// WELLCARE-GOVERNANCE-PLAN.md.
//
// Composition only; all copy lives in owner-data.ts, per the project's
// four-part page convention.

import type { ReactElement } from 'react';
import { Alert, Badge, Card, CardBody, StatCard } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { ownerCopy, ownerNavGroups } from '@/pages/owner/owner-data';
import type {
    GovernanceActivity,
    OwnerStats,
    PrivilegedAccount,
} from '@/pages/owner/owner-data';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    privilegedAccounts: PrivilegedAccount[];
    stats: OwnerStats;
    recentActivity: GovernanceActivity[];
}

export default function OwnerDashboardPage({
    privilegedAccounts,
    stats,
    recentActivity,
}: PageData): ReactElement {
    return (
        <AdminDashboardLayout activeId="dashboard" groups={ownerNavGroups}>
            <AdminPageHeader
                title={ownerCopy.pageTitle}
                subtitle={ownerCopy.pageSubtitle}
            />

            {/* The scope of this tier, stated on its own dashboard rather than
                only in a plan nobody opens. An owner who does not know they
                have no patient access will read every 403 as a bug. */}
            <Alert variant="info" title={ownerCopy.scopeNoticeTitle}>
                {ownerCopy.scopeNoticeBody}
            </Alert>

            {stats.withoutTwoFactor > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                    <Alert
                        variant="warning"
                        title="Unprotected privileged access"
                    >
                        {stats.withoutTwoFactor} {ownerCopy.twoFactorWarning}
                    </Alert>
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    margin: 'var(--space-6) 0',
                }}
            >
                <StatCard label="Administrators" value={stats.admins} />
                <StatCard label="Active now" value={stats.activeAdmins} />
                <StatCard label="Data Protection Officers" value={stats.dpos} />
                <StatCard
                    label="Without 2FA"
                    value={stats.withoutTwoFactor}
                    iconVariant={
                        stats.withoutTwoFactor > 0 ? 'error' : 'success'
                    }
                />
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: 'var(--space-6)',
                }}
            >
                <Card>
                    <CardBody>
                        <h2
                            style={{
                                margin: '0 0 var(--space-4)',
                                fontSize: 'var(--text-base)',
                                fontWeight: 700,
                            }}
                        >
                            {ownerCopy.rosterTitle}
                        </h2>

                        {privilegedAccounts.length === 0 ? (
                            <p style={{ color: 'var(--wc-text-muted)' }}>
                                {ownerCopy.rosterEmpty}
                            </p>
                        ) : (
                            <ul
                                style={{
                                    listStyle: 'none',
                                    margin: 0,
                                    padding: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-3)',
                                }}
                            >
                                {privilegedAccounts.map((account) => (
                                    <li
                                        key={account.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 'var(--space-3)',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600 }}>
                                                {account.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--wc-text-muted)',
                                                }}
                                            >
                                                {account.email}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Badge variant="neutral">
                                                {ownerCopy.roleLabels[
                                                    account.role
                                                ] ?? account.role}
                                            </Badge>
                                            {!account.twoFactor && (
                                                <Badge variant="error" dot>
                                                    No 2FA
                                                </Badge>
                                            )}
                                            {!account.isActive && (
                                                <Badge variant="error">
                                                    Suspended
                                                </Badge>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h2
                            style={{
                                margin: '0 0 var(--space-4)',
                                fontSize: 'var(--text-base)',
                                fontWeight: 700,
                            }}
                        >
                            {ownerCopy.activityTitle}
                        </h2>

                        {recentActivity.length === 0 ? (
                            <p style={{ color: 'var(--wc-text-muted)' }}>
                                {ownerCopy.activityEmpty}
                            </p>
                        ) : (
                            <ul
                                style={{
                                    listStyle: 'none',
                                    margin: 0,
                                    padding: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-3)',
                                }}
                            >
                                {recentActivity.map((row) => (
                                    <li key={row.id}>
                                        <div style={{ fontWeight: 500 }}>
                                            {row.description}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 'var(--text-xs)',
                                                color: 'var(--wc-text-muted)',
                                            }}
                                        >
                                            {row.causer} · {row.ago}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            </div>

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
