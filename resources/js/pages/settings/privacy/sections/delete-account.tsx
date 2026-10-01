// resources/js/pages/settings/privacy/sections/delete-account.tsx

import { Form } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import PasswordInput from '@/components/password-input';
import { Field } from '@/design-system';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { profileCopy } from '@/pages/settings/settings-data';

interface DeleteAccountProps {
    canDelete: boolean;
}

/**
 * Account closure.
 *
 * Two-step by design: the destructive form is not on screen until the person
 * asks for it, and it still requires the password. Both the button and the
 * route are gated for staff — ProfileController refuses the delete for any
 * account holding a clinical role, so hiding the form here is presentation,
 * not the control.
 */
export function DeleteAccount({ canDelete }: DeleteAccountProps): ReactElement {
    const [confirming, setConfirming] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    if (!canDelete) {
        return (
            <SettingsCard
                title={profileCopy.danger.title}
                description="Staff accounts are attached to appointments, consultations and validated results, so they cannot be self-deleted."
            >
                <p className="wc-settings-note">
                    To close a staff account, ask an administrator to deactivate
                    it. Deactivation ends access immediately and leaves the
                    clinical record intact.
                </p>
            </SettingsCard>
        );
    }

    return (
        <SettingsCard
            title={profileCopy.danger.title}
            description={profileCopy.danger.description}
            danger
        >
            {!confirming ? (
                <button
                    type="button"
                    className="wc-btn wc-btn-md wc-btn-danger"
                    onClick={() => setConfirming(true)}
                >
                    Delete my account
                </button>
            ) : (
                <Form
                    {...ProfileController.destroy.form()}
                    options={{ preserveScroll: true }}
                    onError={() => passwordInput.current?.focus()}
                    className="wc-settings-inline-form"
                >
                    {({ processing, errors }) => (
                        <>
                            <p className="wc-settings-note">
                                This permanently removes your profile, your
                                saved patients and your booking history. It
                                cannot be undone.
                            </p>

                            <Field
                                label="Enter your password to confirm"
                                error={errors.password}
                                className="wc-settings-field--full"
                            >
                                <PasswordInput
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="current-password"
                                    placeholder="Your password"
                                />
                            </Field>

                            <div className="wc-settings-actions">
                                <button
                                    type="submit"
                                    className="wc-btn wc-btn-md wc-btn-danger"
                                    disabled={processing}
                                >
                                    {processing
                                        ? 'Deleting…'
                                        : 'Permanently delete my account'}
                                </button>
                                <button
                                    type="button"
                                    className="wc-btn wc-btn-md wc-btn-outline"
                                    onClick={() => setConfirming(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            )}
        </SettingsCard>
    );
}
