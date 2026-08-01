// resources/js/pages/admin/users/sections/user-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The account list itself.

import type { ReactElement } from 'react';
import { Card, CardBody } from '@/design-system';
import { AdminTable } from '@/pages/admin/components/admin-table';
import { UserRow } from '@/pages/admin/users/components/user-row';
import { tableColumns, usersCopy } from '@/pages/admin/users/users-data';
import type { AdminUserRow } from '@/pages/admin/users/users-data';

interface UserTableProps {
    users: AdminUserRow[];
    onEdit: (user: AdminUserRow) => void;
    onChangeRole: (user: AdminUserRow) => void;
}

export function UserTable({
    users,
    onEdit,
    onChangeRole,
}: UserTableProps): ReactElement {
    return (
        <Card>
            <CardBody>
                <AdminTable
                    columns={tableColumns}
                    isEmpty={users.length === 0}
                    emptyMessage={usersCopy.tableEmpty}
                >
                    {users.map((user) => (
                        <UserRow
                            key={user.id}
                            user={user}
                            onEdit={onEdit}
                            onChangeRole={onChangeRole}
                        />
                    ))}
                </AdminTable>
            </CardBody>
        </Card>
    );
}
