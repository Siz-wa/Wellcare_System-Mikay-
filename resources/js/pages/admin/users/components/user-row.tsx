// resources/js/pages/admin/users/components/user-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One account in the User Management table, with its own action buttons.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Button } from '@/design-system';
import { AdminTableCell } from '@/pages/admin/components/admin-table';
import { roleLabels, usersCopy } from '@/pages/admin/users/users-data';
import type { AdminUserRow } from '@/pages/admin/users/users-data';

interface UserRowProps {
    user: AdminUserRow;
    onEdit: (user: AdminUserRow) => void;
    onChangeRole: (user: AdminUserRow) => void;
}

export function UserRow({
    user,
    onEdit,
    onChangeRole,
}: UserRowProps): ReactElement {
    const toggleActive = () => {
        const action = user.isActive ? 'deactivate' : 'activate';
        const confirmText = user.isActive
            ? usersCopy.deactivateConfirm
            : usersCopy.activateConfirm;

        if (!window.confirm(confirmText)) {
            return;
        }

        router.post(
            `/admin/users/${user.id}/${action}`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <tr>
            <AdminTableCell>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#eff6ff',
                            color: '#0056b3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        {user.initials}
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--wc-gray-500)',
                            }}
                        >
                            {user.email}
                        </div>
                    </div>
                </div>
            </AdminTableCell>

            <AdminTableCell nowrap>
                <Badge variant={user.role === 'admin' ? 'dark' : 'neutral'}>
                    {roleLabels[user.role] ?? user.role}
                </Badge>
            </AdminTableCell>

            <AdminTableCell nowrap>
                {user.isActive ? (
                    <Badge variant="success" dot>
                        Active
                    </Badge>
                ) : (
                    <Badge variant="error" dot>
                        Deactivated
                    </Badge>
                )}
                {!user.verified && (
                    <div
                        style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        Email unverified
                    </div>
                )}
            </AdminTableCell>

            <AdminTableCell nowrap>{user.contactNumber ?? '—'}</AdminTableCell>

            <AdminTableCell nowrap>{user.createdAt ?? '—'}</AdminTableCell>

            <AdminTableCell nowrap>
                <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onEdit(user)}
                    >
                        Edit
                    </Button>
                    <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onChangeRole(user)}
                        // Matches the server-side refusal in
                        // StaffAccountService::changeRole().
                        disabled={user.isSelf}
                    >
                        Role
                    </Button>
                    <Button
                        size="xs"
                        variant={user.isActive ? 'danger' : 'secondary'}
                        onClick={toggleActive}
                        // The server refuses this too; disabling here just
                        // means the admin sees why before clicking.
                        disabled={user.isSelf && user.isActive}
                        title={
                            user.isSelf && user.isActive
                                ? usersCopy.selfDeactivateHint
                                : undefined
                        }
                    >
                        {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                </div>
            </AdminTableCell>
        </tr>
    );
}
