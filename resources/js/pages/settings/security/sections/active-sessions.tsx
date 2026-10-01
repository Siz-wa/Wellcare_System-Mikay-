// resources/js/pages/settings/security/sections/active-sessions.tsx

import { Form } from '@inertiajs/react';
import { Laptop, Smartphone, Tablet } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import PasswordInput from '@/components/password-input';
import { Field } from '@/design-system';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { securityCopy } from '@/pages/settings/settings-data';
import { destroy } from '@/routes/settings/sessions';

export interface BrowserSession {
    id: string;
    is_current_device: boolean;
    device: string;
    browser: string;
    platform: string;
    ip_address: string | null;
    last_active: string;
    last_active_at: string;
}

const DEVICE_ICONS: Record<string, ReactNode> = {
    Phone: <Smartphone size={18} strokeWidth={1.7} />,
    Tablet: <Tablet size={18} strokeWidth={1.7} />,
};

interface ActiveSessionsProps {
    sessions: BrowserSession[];
    supported: boolean;
}

export function ActiveSessions({
    sessions,
    supported,
}: ActiveSessionsProps): ReactElement {
    const otherSessions = sessions.filter(
        (session) => !session.is_current_device,
    );

    return (
        <SettingsCard
            title={securityCopy.sessions.title}
            description={securityCopy.sessions.description}
        >
            {!supported ? (
                <p className="wc-settings-note">
                    {securityCopy.sessions.unsupported}
                </p>
            ) : (
                <>
                    <ul className="wc-session-list">
                        {sessions.map((session) => (
                            <li key={session.id} className="wc-session-row">
                                <span
                                    className="wc-session-icon"
                                    aria-hidden="true"
                                >
                                    {DEVICE_ICONS[session.device] ?? (
                                        <Laptop size={18} strokeWidth={1.7} />
                                    )}
                                </span>

                                <div className="wc-session-body">
                                    <p className="wc-session-title">
                                        {session.browser} on {session.platform}
                                        {session.is_current_device && (
                                            <span className="wc-badge wc-badge-success">
                                                This device
                                            </span>
                                        )}
                                    </p>
                                    <p className="wc-session-meta">
                                        {session.ip_address ?? 'Unknown IP'} ·
                                        last active {session.last_active}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {otherSessions.length > 0 && (
                        <Form
                            {...destroy.form()}
                            options={{ preserveScroll: true }}
                            resetOnSuccess
                            className="wc-settings-inline-form"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <Field
                                        label="Confirm your password to sign the others out"
                                        error={errors.password}
                                        className="wc-settings-field--full"
                                    >
                                        <PasswordInput
                                            name="password"
                                            autoComplete="current-password"
                                            placeholder="Your password"
                                        />
                                    </Field>

                                    <button
                                        type="submit"
                                        className="wc-btn wc-btn-md wc-btn-danger"
                                        disabled={processing}
                                    >
                                        {processing
                                            ? 'Signing out…'
                                            : `Sign out ${otherSessions.length} other session${otherSessions.length === 1 ? '' : 's'}`}
                                    </button>
                                </>
                            )}
                        </Form>
                    )}
                </>
            )}
        </SettingsCard>
    );
}
