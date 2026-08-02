// resources/js/pages/admin/users/users.tsx
// ─────────────────────────────────────────────────────────────────────────────
// User Management — composition only. Copy lives in users-data.ts.
//
// Fig. 3 "User Management"; Fig. 4 "Add New User", "Manage User Acc",
// "Manage User/Roles", "Deactivate/Reactivate Acc"; Objectives 1.1 and 1.3.

import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Button, StatCard } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminModal } from '@/pages/admin/components/admin-modal';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { RoleForm } from '@/pages/admin/users/components/role-form';
import { UserForm } from '@/pages/admin/users/components/user-form';
import { UserFiltersBar } from '@/pages/admin/users/sections/user-filters';
import { UserTable } from '@/pages/admin/users/sections/user-table';
import { userStatCards, usersCopy } from '@/pages/admin/users/users-data';
import type {
    AdminUserRow,
    UserFilters,
    UserStats,
} from '@/pages/admin/users/users-data';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    users: AdminUserRow[];
    roles: string[];
    stats: UserStats;
    filters: UserFilters;
}

type ModalState =
    | { kind: 'none' }
    | { kind: 'create' }
    | { kind: 'edit'; user: AdminUserRow }
    | { kind: 'role'; user: AdminUserRow };

export default function AdminUsersPage({
    users,
    roles,
    stats,
    filters,
}: PageData): ReactElement {
    const [modal, setModal] = useState<ModalState>({ kind: 'none' });
    const close = () => setModal({ kind: 'none' });

    return (
        <AdminDashboardLayout activeId={usersCopy.activeNavId}>
            <AdminPageHeader
                title={usersCopy.pageTitle}
                subtitle={usersCopy.pageSubtitle}
                action={
                    <Button
                        leftIcon={<Plus size={16} strokeWidth={2.4} />}
                        onClick={() => setModal({ kind: 'create' })}
                    >
                        {usersCopy.addButton}
                    </Button>
                }
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                {userStatCards.map((card) => (
                    <StatCard
                        key={card.key}
                        value={stats[card.key] ?? 0}
                        label={card.label}
                    />
                ))}
            </div>

            <UserFiltersBar filters={filters} roles={roles} />

            <UserTable
                users={users}
                onEdit={(user) => setModal({ kind: 'edit', user })}
                onChangeRole={(user) => setModal({ kind: 'role', user })}
            />

            <AdminModal
                title={usersCopy.createTitle}
                open={modal.kind === 'create'}
                onClose={close}
            >
                <UserForm roles={roles} onDone={close} />
            </AdminModal>

            <AdminModal
                title={usersCopy.editTitle}
                open={modal.kind === 'edit'}
                onClose={close}
            >
                {modal.kind === 'edit' && (
                    // Keyed on the row id so switching between two accounts
                    // remounts the form instead of keeping the first one's
                    // useForm state.
                    <UserForm
                        key={modal.user.id}
                        user={modal.user}
                        roles={roles}
                        onDone={close}
                    />
                )}
            </AdminModal>

            <AdminModal
                title={usersCopy.roleChangeTitle}
                open={modal.kind === 'role'}
                onClose={close}
            >
                {modal.kind === 'role' && (
                    <RoleForm
                        key={modal.user.id}
                        user={modal.user}
                        roles={roles}
                        onDone={close}
                    />
                )}
            </AdminModal>

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
