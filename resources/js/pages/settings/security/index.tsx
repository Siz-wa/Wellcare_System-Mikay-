// resources/js/pages/settings/security/index.tsx
// Composition only.

import type { ReactElement } from 'react';
import { SettingsShell } from '@/pages/settings/layout/settings-shell';
import type { PageProps } from '@/types';
import type { AccountActivityEntry } from './sections/account-activity';
import { AccountActivity } from './sections/account-activity';
import type { BrowserSession } from './sections/active-sessions';
import { ActiveSessions } from './sections/active-sessions';
import { PasswordChangeRequiredNotice } from './sections/password-change-required-notice';
import { PasswordForm } from './sections/password-form';
import { TwoFactorPanel } from './sections/two-factor-panel';
import { TwoFactorRequiredNotice } from './sections/two-factor-required-notice';

interface PageData extends PageProps {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
    /** A secret has been generated but no code has been confirmed yet. */
    twoFactorPending?: boolean;
    /** A pending setup was discarded on this request for going stale. */
    twoFactorSetupExpired?: boolean;
    /** This account cannot use the app until it enrols. */
    twoFactorRequired?: boolean;
    /** The page the enrolment gate turned them away from. */
    twoFactorReturnLabel?: string | null;
    /** GV-9. This account is still on the password it was provisioned with. */
    mustChangePassword?: boolean;
    /** The page the password gate turned them away from. */
    mustChangePasswordReturnLabel?: string | null;
    sessions: BrowserSession[];
    sessionsSupported: boolean;
    recentActivity: AccountActivityEntry[];
}

export default function SecuritySettingsPage({
    canManageTwoFactor = false,
    requiresConfirmation = false,
    twoFactorEnabled = false,
    twoFactorPending = false,
    twoFactorSetupExpired = false,
    twoFactorRequired = false,
    twoFactorReturnLabel = null,
    mustChangePassword = false,
    mustChangePasswordReturnLabel = null,
    sessions,
    sessionsSupported,
    recentActivity,
}: PageData): ReactElement {
    return (
        <SettingsShell active="security" title="Security settings">
            <div className="wc-settings-stack">
                {/* Ordered the way the middleware is: EnsurePasswordIsChanged
                    runs before EnsureTwoFactorEnrolled, so an account caught by
                    both should read the password notice first — that is the
                    gate it has to clear first. */}
                {mustChangePassword && (
                    <PasswordChangeRequiredNotice
                        returnLabel={mustChangePasswordReturnLabel}
                    />
                )}

                {twoFactorRequired && (
                    <TwoFactorRequiredNotice
                        returnLabel={twoFactorReturnLabel}
                    />
                )}

                {/* Ordered so the thing being asked for is the first card, not
                    the third. The password form led the page while 2FA was
                    optional; for an account held at this screen until it
                    enrols, that buries the only control that lets them out.
                    An account held by the GV-9 gate has the opposite problem —
                    its way out is the password form — so whichever gate is
                    actually holding this account leads. */}
                {mustChangePassword ? (
                    <>
                        <PasswordForm />

                        {canManageTwoFactor && (
                            <TwoFactorPanel
                                enabled={twoFactorEnabled}
                                pending={twoFactorPending}
                                setupExpired={twoFactorSetupExpired}
                                requiresConfirmation={requiresConfirmation}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {canManageTwoFactor && (
                            <TwoFactorPanel
                                enabled={twoFactorEnabled}
                                pending={twoFactorPending}
                                setupExpired={twoFactorSetupExpired}
                                requiresConfirmation={requiresConfirmation}
                            />
                        )}

                        <PasswordForm />
                    </>
                )}

                <ActiveSessions
                    sessions={sessions}
                    supported={sessionsSupported}
                />

                <AccountActivity entries={recentActivity} />
            </div>
        </SettingsShell>
    );
}
