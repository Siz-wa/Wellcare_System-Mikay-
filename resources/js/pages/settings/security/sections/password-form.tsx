// resources/js/pages/settings/security/sections/password-form.tsx

import { Form } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import PasswordInput from '@/components/password-input';
import { Field } from '@/design-system';
import { SaveBar } from '@/pages/settings/components/save-bar';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { securityCopy } from '@/pages/settings/settings-data';

export function PasswordForm(): ReactElement {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <SettingsCard
            title={securityCopy.password.title}
            description={securityCopy.password.description}
        >
            <Form
                {...SecurityController.update.form()}
                options={{ preserveScroll: true }}
                resetOnError={[
                    'password',
                    'password_confirmation',
                    'current_password',
                ]}
                resetOnSuccess
                onError={(errors) => {
                    if (errors.password) {
                        passwordInput.current?.focus();
                    }

                    if (errors.current_password) {
                        currentPasswordInput.current?.focus();
                    }
                }}
            >
                {({ errors, processing, recentlySuccessful }) => (
                    <>
                        <div className="wc-settings-fields">
                            <Field
                                label="Current password"
                                required
                                error={errors.current_password}
                                className="wc-settings-field--full"
                            >
                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    autoComplete="current-password"
                                    placeholder="Current password"
                                />
                            </Field>

                            <Field
                                label="New password"
                                required
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="new-password"
                                    placeholder="New password"
                                />
                            </Field>

                            <Field
                                label="Confirm new password"
                                required
                                error={errors.password_confirmation}
                            >
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    placeholder="Repeat new password"
                                />
                            </Field>
                        </div>

                        <SaveBar
                            processing={processing}
                            recentlySuccessful={recentlySuccessful}
                            label="Update password"
                            savedLabel="Password updated"
                        />
                    </>
                )}
            </Form>
        </SettingsCard>
    );
}
