// resources/js/pages/admin/staff/sections/staff-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Staff & Credentials list.

import type { ReactElement } from 'react';
import { Card } from '@/design-system';
import { AdminTable } from '@/pages/admin/components/admin-table';
import { StaffTableRow } from '@/pages/admin/staff/components/staff-row';
import { staffCopy, tableColumns } from '@/pages/admin/staff/staff-data';
import type { StaffRow } from '@/pages/admin/staff/staff-data';

interface StaffTableProps {
    staff: StaffRow[];
}

export function StaffTable({ staff }: StaffTableProps): ReactElement {
    return (
        <Card>
            <AdminTable
                columns={tableColumns}
                emptyMessage={staffCopy.tableEmpty}
                isEmpty={staff.length === 0}
            >
                {staff.map((member) => (
                    <StaffTableRow key={member.id} staff={member} />
                ))}
            </AdminTable>
        </Card>
    );
}
