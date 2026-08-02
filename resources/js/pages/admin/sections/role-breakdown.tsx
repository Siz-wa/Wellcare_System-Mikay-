// resources/js/pages/admin/sections/role-breakdown.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Accounts per role, with the active count alongside the total — Objective 1.3
// ("user roles") made visible in one place.

import type { ReactElement } from 'react';
import { Badge, Card, CardBody, CardHeader } from '@/design-system';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import { adminDashboardCopy, roleLabels } from '@/pages/admin/dashboard-data';
import type { RoleBreakdownRow } from '@/pages/admin/dashboard-data';

interface RoleBreakdownProps {
    rows: RoleBreakdownRow[];
}

export function RoleBreakdown({ rows }: RoleBreakdownProps): ReactElement {
    return (
        <Card>
            <CardHeader>{adminDashboardCopy.roleCardTitle}</CardHeader>
            <CardBody>
                <AdminTable
                    columns={['Role', 'Total', 'Active', 'Deactivated']}
                    isEmpty={rows.length === 0}
                    emptyMessage={adminDashboardCopy.roleCardEmpty}
                >
                    {rows.map((row) => {
                        const inactive = row.total - row.active;

                        return (
                            <tr key={row.role}>
                                <AdminTableCell nowrap>
                                    <strong>
                                        {roleLabels[row.role] ?? row.role}
                                    </strong>
                                </AdminTableCell>
                                <AdminTableCell nowrap>
                                    {row.total}
                                </AdminTableCell>
                                <AdminTableCell nowrap>
                                    {row.active}
                                </AdminTableCell>
                                <AdminTableCell nowrap>
                                    {inactive > 0 ? (
                                        <Badge variant="warning">
                                            {inactive}
                                        </Badge>
                                    ) : (
                                        '0'
                                    )}
                                </AdminTableCell>
                            </tr>
                        );
                    })}
                </AdminTable>
            </CardBody>
        </Card>
    );
}
