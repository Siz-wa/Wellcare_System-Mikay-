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
import {
    Button,
    Check,
    DateField,
    Field,
    Input,
    Select,
} from '@/design-system';
import { normalizePhMobile } from '@/lib/input-masks';
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

    const { data, setData, post, put, processing, errors, reset, transform } =
        useForm({
            first_name: user?.name?.split(' ')[0] ?? '',
            last_name: user?.name?.split(' ').slice(1).join(' ') ?? '',
            email: user?.email ?? '',
            password: '',
            password_confirmation: '',
            send_invite: true,
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
            // GV-1: send an explicit allow-list on the edit path rather than
            // the whole form. The credential and role fields are not rendered
            // here, but an unrendered field still travels, and a password that
            // reaches the server is a password that can reach a log.
            //
            // An allow-list rather than an omit, so that a field added to this
            // form later has to be opted IN to the edit request — the safe
            // direction, and the one that survives somebody forgetting.
            transform((payload) => ({
                first_name: payload.first_name,
                last_name: payload.last_name,
                email: payload.email,
                contact_number: payload.contact_number,
                address: payload.address,
                company: payload.company,
                gender: payload.gender,
                birthdate: payload.birthdate,
                civil_status: payload.civil_status,
            }));
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
                            onChange={(value) => setData('role', value)}
                            invalid={Boolean(errors.role)}
                            options={roles.map((role) => ({
                                value: role,
                                label: roleLabels[role] ?? role,
                            }))}
                        />
                    </Field>
                )}

                {/* GV-1: the password fields exist ONLY when creating. An
                    administrator sets the initial credential for an account
                    nobody holds yet; they never set one for an account that
                    already has an owner. Editing offers "Send reset link"
                    instead, which mails the account holder a signed link.
                    Do not add these fields back to the edit path. */}
                {!isEdit && (
                    <Field hint={usersCopy.sendInviteHint}>
                        <Check
                            checked={data.send_invite}
                            onChange={(e) =>
                                setData('send_invite', e.target.checked)
                            }
                            label={usersCopy.sendInviteLabel}
                        />
                    </Field>
                )}

                {!isEdit && !data.send_invite && (
                    <>
                        <Field
                            label="Password"
                            required
                            error={errors.password}
                            hint={usersCopy.passwordHelpCreate}
                        >
                            <Input
                                type="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                error={Boolean(errors.password)}
                                autoComplete="new-password"
                            />
                        </Field>

                        <Field label="Confirm password" required>
                            <Input
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                autoComplete="new-password"
                            />
                        </Field>
                    </>
                )}

                <Field label="Contact number" error={errors.contact_number}>
                    {/* `type="tel"` only hints at a keyboard; the sanitizer is
                        what keeps letters out, and `inputMode="numeric"` gets
                        the digit pad rather than the phone pad's `* # +`. */}
                    <Input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={data.contact_number}
                        onChange={(e) =>
                            setData(
                                'contact_number',
                                normalizePhMobile(e.target.value),
                            )
                        }
                        error={Boolean(errors.contact_number)}
                        placeholder="09171234567"
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
                        onChange={(value) => setData('gender', value)}
                        invalid={Boolean(errors.gender)}
                        options={genderOptions}
                    />
                </Field>

                <Field label="Birthdate" error={errors.birthdate}>
                    <DateField
                        kind="date"
                        value={data.birthdate}
                        onChange={(e) => setData('birthdate', e.target.value)}
                        invalid={Boolean(errors.birthdate)}
                    />
                </Field>

                <Field label="Civil status" error={errors.civil_status}>
                    <Select
                        value={data.civil_status}
                        onChange={(value) => setData('civil_status', value)}
                        invalid={Boolean(errors.civil_status)}
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
