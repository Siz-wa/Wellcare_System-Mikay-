// resources/js/pages/settings/profile/sections/profile-form.tsx

import { Form, Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { DateField, Field, Input, Select, Textarea } from '@/design-system';
import { normalizePhMobile, sanitizeOnInput } from '@/lib/input-masks';
import { SaveBar } from '@/pages/settings/components/save-bar';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import {
    civilStatusOptions,
    genderOptions,
    profileCopy,
} from '@/pages/settings/settings-data';
import { send } from '@/routes/verification';

export interface ProfileFields {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
    address: string;
    company: string;
    gender: string;
    birthdate: string;
    civil_status: string;
}

interface ProfileFormProps {
    profile: ProfileFields;
    mustVerifyEmail: boolean;
    emailVerified: boolean;
    status?: string;
}

export function ProfileForm({
    profile,
    mustVerifyEmail,
    emailVerified,
    status,
}: ProfileFormProps): ReactElement {
    return (
        <Form
            {...ProfileController.update.form()}
            options={{ preserveScroll: true }}
            className="wc-settings-stack"
        >
            {({ processing, recentlySuccessful, errors }) => (
                <>
                    <SettingsCard
                        title={profileCopy.identity.title}
                        description={profileCopy.identity.description}
                    >
                        <div className="wc-settings-fields">
                            <Field
                                label="First name"
                                required
                                error={errors.first_name}
                            >
                                <Input
                                    name="first_name"
                                    defaultValue={profile.first_name}
                                    autoComplete="given-name"
                                    error={Boolean(errors.first_name)}
                                    required
                                />
                            </Field>

                            <Field
                                label="Last name"
                                required
                                error={errors.last_name}
                            >
                                <Input
                                    name="last_name"
                                    defaultValue={profile.last_name}
                                    autoComplete="family-name"
                                    error={Boolean(errors.last_name)}
                                    required
                                />
                            </Field>

                            <Field
                                label="Date of birth"
                                error={errors.birthdate}
                            >
                                <DateField
                                    kind="date"
                                    name="birthdate"
                                    defaultValue={profile.birthdate}
                                    autoComplete="bday"
                                    invalid={Boolean(errors.birthdate)}
                                />
                            </Field>

                            <Field label="Sex" error={errors.gender}>
                                <Select
                                    name="gender"
                                    defaultValue={profile.gender}
                                    options={genderOptions}
                                    invalid={Boolean(errors.gender)}
                                />
                            </Field>

                            <Field
                                label="Civil status"
                                error={errors.civil_status}
                            >
                                <Select
                                    name="civil_status"
                                    defaultValue={profile.civil_status}
                                    options={civilStatusOptions}
                                    invalid={Boolean(errors.civil_status)}
                                />
                            </Field>
                        </div>
                    </SettingsCard>

                    <SettingsCard
                        title={profileCopy.contact.title}
                        description={profileCopy.contact.description}
                    >
                        <div className="wc-settings-fields">
                            <Field
                                label="Mobile number"
                                hint="Philippine mobile, e.g. 09XXXXXXXXX"
                                error={errors.contact_number}
                            >
                                {/* `inputMode="tel"` gets the phone pad,
                                    which carries `* # +` a PH mobile has no
                                    use for; `numeric` gets plain digits.
                                    This field is uncontrolled, so the
                                    sanitizer writes back to the DOM node. */}
                                <Input
                                    type="tel"
                                    name="contact_number"
                                    defaultValue={profile.contact_number}
                                    autoComplete="tel"
                                    inputMode="numeric"
                                    onInput={sanitizeOnInput(normalizePhMobile)}
                                    placeholder="09171234567"
                                    error={Boolean(errors.contact_number)}
                                />
                            </Field>

                            <Field
                                label="Company / employer"
                                hint="Used when your visit is billed to a corporate account."
                                error={errors.company}
                            >
                                <Input
                                    name="company"
                                    defaultValue={profile.company}
                                    autoComplete="organization"
                                    error={Boolean(errors.company)}
                                />
                            </Field>

                            <Field
                                label="Home address"
                                error={errors.address}
                                className="wc-settings-field--full"
                            >
                                <Textarea
                                    name="address"
                                    rows={3}
                                    defaultValue={profile.address}
                                    autoComplete="street-address"
                                    error={Boolean(errors.address)}
                                />
                            </Field>
                        </div>
                    </SettingsCard>

                    <SettingsCard
                        title={profileCopy.account.title}
                        description={profileCopy.account.description}
                    >
                        <div className="wc-settings-fields">
                            <Field
                                label="Email address"
                                required
                                error={errors.email}
                                className="wc-settings-field--full"
                            >
                                <Input
                                    type="email"
                                    name="email"
                                    defaultValue={profile.email}
                                    autoComplete="username"
                                    error={Boolean(errors.email)}
                                    required
                                />
                            </Field>
                        </div>

                        {mustVerifyEmail && !emailVerified && (
                            <div className="wc-alert wc-alert-warning">
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600 }}>
                                        Your email address is unverified.
                                    </p>
                                    <p
                                        style={{
                                            margin: '4px 0 0',
                                            fontSize: 'var(--text-sm)',
                                        }}
                                    >
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="wc-link"
                                        >
                                            Resend the verification email
                                        </Link>
                                        {status ===
                                            'verification-link-sent' && (
                                            <span
                                                style={{
                                                    marginLeft: 8,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                — a new link has been sent.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </SettingsCard>

                    <SaveBar
                        processing={processing}
                        recentlySuccessful={recentlySuccessful}
                    />
                </>
            )}
        </Form>
    );
}
