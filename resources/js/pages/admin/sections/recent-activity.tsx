// resources/js/pages/admin/sections/recent-activity.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The last few audit entries, as a preview of /admin/activity-log.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Card, CardBody, CardFooter, CardHeader } from '@/design-system';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import { adminDashboardCopy } from '@/pages/admin/dashboard-data';
import type { ActivityRow } from '@/pages/admin/dashboard-data';

interface RecentActivityProps {
    rows: ActivityRow[];
}

export function RecentActivity({ rows }: RecentActivityProps): ReactElement {
    return (
        <Card>
            <CardHeader>{adminDashboardCopy.activityCardTitle}</CardHeader>
            <CardBody>
                <AdminTable
                    columns={['What changed', 'Who', 'Event', 'When']}
                    isEmpty={rows.length === 0}
                    emptyMessage={adminDashboardCopy.activityCardEmpty}
                >
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <AdminTableCell>{row.description}</AdminTableCell>
                            <AdminTableCell nowrap>{row.causer}</AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.event ? (
                                    <Badge variant="neutral">{row.event}</Badge>
                                ) : (
                                    '—'
                                )}
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.ago ?? '—'}
                            </AdminTableCell>
                        </tr>
                    ))}
                </AdminTable>
            </CardBody>
            <CardFooter>
                <Link
                    href="/admin/activity-log"
                    style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--wc-blue-600, #0056b3)',
                        textDecoration: 'none',
                    }}
                >
                    {adminDashboardCopy.activityCardLink} →
                </Link>
            </CardFooter>
        </Card>
    );
}
