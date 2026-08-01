// resources/js/pages/admin/users/components/user-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The create/edit account form. One component for both because the fields are
// identical — only the endpoint, the method, and whether the role and password
// are required differ.
//
// The role select is absent when editing: a role change is a separate,
// explicitly confirmed action (POST /admin/users/{user}/role), so that an
// authorization change can never be an accidental side effect of fixing
// somebody's phone number.

import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { Button, Field, Input, Select } from '@/design-system';
import {
    civilStatusOptions,
    genderOptions,
    roleLabels,
    usersCopy,
} from '@/pages/admin/users/users-data';
import type { AdminUserRow } from '@/pages/admin/users/users-data';

interface UserFormProps {
    /** Omitted when creating. */
    user?: AdminUserRow;
    roles: string[];
    onDone: () => void;
}

export function UserForm({ user, roles, onDone }: UserFormProps): ReactElement {
    const isEdit = Boolean(user);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        first_name: user?.name?.split(' ')[0] ?? '',
        last_name: user?.name?.split(' ').slice(1).join(' ') ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        role: user?.role ?? 'user',
        contact_number: user?.contactNumber ?? '',
        address: user?.address ?? '',
        company: user?.company ?? '',
        gender: user?.gender ?? '',
        birthdate: user?.birthdate ?? '',
        civil_status: user?.civilStatus ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset('password', 'password_confirmation');
                onDone();
            },
        };

        if (isEdit && user) {
            put(`/admin/users/${user.id}`, options);
        } else {
            post('/admin/users', options);
        }
    };

    return (
        <form onSubmit={submit}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--space-4)',
                }}
            >
                <Field label="First name" required error={errors.first_name}>
                    <Input
                        value={data.first_name}
                        onChange={(e) => setData('first_name', e.target.value)}
                        error={Boolean(errors.first_name)}
                        autoComplete="off"
                    />
                </Field>

                <Field label="Last name" required error={errors.last_name}>
                    <Input
                        value={data.last_name}
                        onChange={(e) => setData('last_name', e.target.value)}
                        error={Boolean(errors.last_name)}
                        autoComplete="off"
                    />
                </Field>

                <Field label="Email" required error={errors.email}>
                    <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        error={Boolean(errors.email)}
                        autoComplete="off"
                    />
                </Field>

                {!isEdit && (
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
                )}

                <Field
                    label="Password"
                    required={!isEdit}
                    error={errors.password}
                    hint={
                        isEdit
                            ? usersCopy.passwordHelpEdit
                            : usersCopy.passwordHelpCreate
                    }
                >
                    <Input
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        error={Boolean(errors.password)}
                        autoComplete="new-password"
                    />
                </Field>

                <Field label="Confirm password" required={!isEdit}>
                    <Input
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        autoComplete="new-password"
                    />
                </Field>

                <Field label="Contact number" error={errors.contact_number}>
                    <Input
                        value={data.contact_number}
                        onChange={(e) =>
                            setData('contact_number', e.target.value)
                        }
                        error={Boolean(errors.contact_number)}
                        placeholder="09XXXXXXXXX"
                    />
                </Field>

                <Field label="Company" error={errors.company}>
                    <Input
                        value={data.company}
                        onChange={(e) => setData('company', e.target.value)}
                        error={Boolean(errors.company)}
                    />
                </Field>

                <Field label="Gender" error={errors.gender}>
                    <Select
                        value={data.gender}
                        onChange={(e) => setData('gender', e.target.value)}
                        error={Boolean(errors.gender)}
                        options={genderOptions}
                    />
                </Field>

                <Field label="Birthdate" error={errors.birthdate}>
                    <Input
                        type="date"
                        value={data.birthdate}
                        onChange={(e) => setData('birthdate', e.target.value)}
                        error={Boolean(errors.birthdate)}
                    />
                </Field>

                <Field label="Civil status" error={errors.civil_status}>
                    <Select
                        value={data.civil_status}
                        onChange={(e) =>
                            setData('civil_status', e.target.value)
                        }
                        error={Boolean(errors.civil_status)}
                        options={civilStatusOptions}
                    />
                </Field>

                <Field label="Address" error={errors.address}>
                    <Input
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        error={Boolean(errors.address)}
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
                <Button type="submit" loading={processing}>
                    {isEdit ? usersCopy.editSubmit : usersCopy.createSubmit}
                </Button>
            </div>
        </form>
    );
}
