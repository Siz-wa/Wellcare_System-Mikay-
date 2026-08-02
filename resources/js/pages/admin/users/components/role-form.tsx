// resources/js/pages/admin/users/components/role-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fig. 4's "Manage User/Roles". Its own dialog rather than a field on the edit
// form, because changing a role changes what an account can reach.

import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { Alert, Button, Field, Select } from '@/design-system';
import { roleLabels, usersCopy } from '@/pages/admin/users/users-data';
import type { AdminUserRow } from '@/pages/admin/users/users-data';

interface RoleFormProps {
    user: AdminUserRow;
    roles: string[];
    onDone: () => void;
}

export function RoleForm({ user, roles, onDone }: RoleFormProps): ReactElement {
    const { data, setData, post, processing, errors } = useForm({
        role: user.role,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        post(`/admin/users/${user.id}/role`, {
            preserveScroll: true,
            onSuccess: onDone,
        });
    };

    return (
        <form onSubmit={submit}>
            <p
                style={{
                    margin: '0 0 var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-gray-500)',
                }}
            >
                {user.name} — {user.email}
            </p>

            <Alert variant="info">{usersCopy.roleChangeHelp}</Alert>

            <div style={{ marginTop: 'var(--space-4)' }}>
                <Field label="Role" required error={errors.role}>
                    <Select
                        value={data.role}
                        onChange={(e) => setData('role', e.target.value)}
                        error={Boolean(errors.role)}
                        options={roles.map((role) => ({
                            value: role,
                            label: roleLabels[role] ?? role,
                        }))}
                    />
                </Field>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-3)',
                    marginTop: 'var(--space-6)',
                }}
            >
                <Button type="button" variant="ghost" onClick={onDone}>
                    {usersCopy.cancel}
                </Button>
                <Button
                    type="submit"
                    loading={processing}
                    disabled={data.role === user.role}
                >
                    {usersCopy.roleChangeTitle}
                </Button>
            </div>
        </form>
    );
}
