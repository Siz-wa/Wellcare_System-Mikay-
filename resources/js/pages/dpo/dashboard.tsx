// resources/js/pages/dpo/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Data Protection Officer oversight dashboard — GV-5 and §5.3 of
// WELLCARE-GOVERNANCE-PLAN.md. Composition only; copy lives in dpo-data.ts.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Alert, Badge, Card, CardBody, StatCard } from '@/design-system';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminTable } from '@/pages/admin/components/admin-table';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { AccessRow } from '@/pages/dpo/components/access-row';
import { dpoCopy, dpoNavGroups } from '@/pages/dpo/dpo-data';
import type {
    AccessLogRow,
    ChangeLogRow,
    DpoStats,
    EmergencyAccessRow,
} from '@/pages/dpo/dpo-data';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    stats: DpoStats;
    breakGlass: AccessLogRow[];
    emergencyAccess: EmergencyAccessRow[];
    recentChanges: ChangeLogRow[];
}

const BREAK_GLASS_COLUMNS = [
    'Staff',
    'Patient',
    'Action',
    'Relationship',
    'When',
    'Origin',
];

export default function DpoDashboardPage({
    stats,
    breakGlass,
    emergencyAccess,
    recentChanges,
}: PageData): ReactElement {
    return (
        <AdminDashboardLayout activeId="dashboard" groups={dpoNavGroups}>
            <AdminPageHeader
                title={dpoCopy.dashboardTitle}
                subtitle={dpoCopy.dashboardSubtitle}
            />

            {/* Stated on the screen, not only in the plan: a DPO who does not
                know the role is intentionally powerless over accounts will read
                the missing User Management link as a broken deployment. */}
            <Alert variant="info" title={dpoCopy.independenceTitle}>
                {dpoCopy.independenceBody}
            </Alert>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'var(--space-4)',
                    margin: 'var(--space-6) 0',
                }}
            >
                <StatCard
                    label="Access events today"
                    value={stats.accessEventsToday}
                />
                <StatCard
                    label="Break-glass today"
                    value={stats.breakGlassToday}
                    iconVariant={
                        stats.breakGlassToday > 0 ? 'warning' : 'success'
                    }
                />
                <StatCard
                    label="Break-glass total"
                    value={stats.breakGlassTotal}
                />
                <StatCard label="Downloads" value={stats.downloads} />
                <StatCard label="Exports" value={stats.exports} />
                <StatCard
                    label="Emergency recoveries"
                    value={stats.emergencyEvents}
                    iconVariant={
                        stats.emergencyEvents > 0 ? 'error' : 'success'
                    }
                />
            </div>

            <Card>
                <CardBody>
                    <h2
                        style={{
                            margin: '0 0 var(--space-2)',
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                        }}
                    >
                        {dpoCopy.breakGlassTitle}
                    </h2>
                    <p
                        style={{
                            margin: '0 0 var(--space-4)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                            maxWidth: '70ch',
                        }}
                    >
                        {dpoCopy.breakGlassBody}
                    </p>

                    <AdminTable
                        columns={BREAK_GLASS_COLUMNS}
                        emptyMessage={dpoCopy.breakGlassEmpty}
                        isEmpty={breakGlass.length === 0}
                    >
                        {breakGlass.map((row) => (
                            <AccessRow key={row.id} row={row} />
                        ))}
                    </AdminTable>

                    <div style={{ marginTop: 'var(--space-4)' }}>
                        <Link
                            href="/dpo/access-log?breakGlass=1"
                            style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: 600,
                                color: 'var(--wc-blue-600, #0056b3)',
                            }}
                        >
                            See every break-glass event →
                        </Link>
                    </div>
                </CardBody>
            </Card>

            {/* GV-10. Its own panel rather than a line in the change log:
                a break-glass event buried among a thousand routine update
                entries is a break-glass event nobody reviews. */}
            <div style={{ marginTop: 'var(--space-6)' }}>
                <Card>
                    <CardBody>
                        <h2
                            style={{
                                margin: '0 0 var(--space-2)',
                                fontSize: 'var(--text-base)',
                                fontWeight: 700,
                            }}
                        >
                            {dpoCopy.emergencyTitle}
                        </h2>
                        <p
                            style={{
                                margin: '0 0 var(--space-4)',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-muted)',
                                maxWidth: '70ch',
                            }}
                        >
                            {dpoCopy.emergencyBody}
                        </p>

                        {emergencyAccess.length === 0 ? (
                            <p
                                style={{
                                    color: 'var(--wc-text-muted)',
                                    fontSize: 'var(--text-sm)',
                                }}
                            >
                                {dpoCopy.emergencyEmpty}
                            </p>
                        ) : (
                            <ul
                                style={{
                                    listStyle: 'none',
                                    margin: 0,
                                    padding: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-4)',
                                }}
                            >
                                {emergencyAccess.map((row) => (
                                    <li
                                        key={row.id}
                                        style={{
                                            borderLeft:
                                                '3px solid var(--wc-error, #dc2626)',
                                            paddingLeft: 'var(--space-4)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 8,
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span style={{ fontWeight: 600 }}>
                                                {row.description}
                                            </span>
                                            {row.forced && (
                                                <Badge variant="error" dot>
                                                    Forced override
                                                </Badge>
                                            )}
                                        </div>
                                        {row.reason && (
                                            <div
                                                style={{
                                                    marginTop: 4,
                                                    fontSize: 'var(--text-sm)',
                                                    fontStyle: 'italic',
                                                }}
                                            >
                                                “{row.reason}”
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                marginTop: 4,
                                                fontSize: 'var(--text-xs)',
                                                color: 'var(--wc-text-muted)',
                                            }}
                                        >
                                            {row.operator}
                                            {row.osUser
                                                ? ` (shell: ${row.osUser}${row.hostname ? '@' + row.hostname : ''})`
                                                : ''}{' '}
                                            · {row.at}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            </div>

            <div style={{ marginTop: 'var(--space-6)' }}>
                <Card>
                    <CardBody>
                        <h2
                            style={{
                                margin: '0 0 var(--space-4)',
                                fontSize: 'var(--text-base)',
                                fontWeight: 700,
                            }}
                        >
                            {dpoCopy.recentChangesTitle}
                        </h2>

                        {recentChanges.length === 0 ? (
                            <p style={{ color: 'var(--wc-text-muted)' }}>
                                {dpoCopy.changeLogEmpty}
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
                                {recentChanges.map((row) => (
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
                                            {row.causer} · {row.logName} ·{' '}
                                            {row.ago ?? row.event}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            </div>
        </AdminDashboardLayout>
    );
}
