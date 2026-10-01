// resources/js/pages/settings/security/sections/two-factor-panel.tsx

import { Form } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { securityCopy } from '@/pages/settings/settings-data';
import { disable, enable } from '@/routes/two-factor';

interface TwoFactorPanelProps {
    enabled: boolean;
    /** Server-side truth: a secret exists but has never been confirmed. */
    pending: boolean;
    /** A stale pending setup was discarded while rendering this page. */
    setupExpired: boolean;
    requiresConfirmation: boolean;
}

export function TwoFactorPanel({
    enabled,
    pending,
    setupExpired,
    requiresConfirmation,
}: TwoFactorPanelProps): ReactElement {
    const {
        qrCodeSvg,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();

    const [showSetupModal, setShowSetupModal] = useState(false);

    // The QR code lives in hook state, and hook state survives an Inertia visit
    // to the same page component. So a setup the server has since discarded
    // could still be offered as "Continue setup", handing the person a QR code
    // for a secret that no longer exists — every code from it rejected as
    // invalid, with nothing on screen explaining why. `pending` is read from
    // the database, so it is the one that gets to decide.
    const holdsSetupData = qrCodeSvg !== null || manualSetupKey !== null;

    useEffect(() => {
        if (!pending && holdsSetupData) {
            clearSetupData();
            setShowSetupModal(false);
        }
        // Guarded on holdsSetupData so this is a no-op on every render where
        // there is nothing stale to drop; clearSetupData is not in the deps
        // because it is reallocated each render and would re-run the effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pending, holdsSetupData]);

    return (
        <SettingsCard
            title={securityCopy.twoFactor.title}
            description={securityCopy.twoFactor.description}
            aside={
                <span
                    className={
                        enabled
                            ? 'wc-badge wc-badge-success'
                            : pending
                              ? 'wc-badge wc-badge-warning'
                              : 'wc-badge wc-badge-neutral'
                    }
                >
                    {enabled
                        ? 'Enabled'
                        : pending
                          ? 'Setup unfinished'
                          : 'Not enabled'}
                </span>
            }
        >
            {enabled ? (
                <div className="wc-settings-stack-sm">
                    <p className="wc-settings-note">
                        You will be asked for a six-digit code from your
                        authenticator app each time you sign in.
                    </p>

                    <TwoFactorRecoveryCodes
                        recoveryCodesList={recoveryCodesList}
                        fetchRecoveryCodes={fetchRecoveryCodes}
                        errors={errors}
                    />

                    <Form {...disable.form()}>
                        {({ processing }) => (
                            <button
                                type="submit"
                                className="wc-btn wc-btn-md wc-btn-danger"
                                disabled={processing}
                            >
                                Disable two-factor authentication
                            </button>
                        )}
                    </Form>
                </div>
            ) : (
                <div className="wc-settings-stack-sm">
                    {setupExpired && (
                        <p className="wc-settings-note" role="status">
                            {securityCopy.twoFactor.setupExpired}
                        </p>
                    )}

                    <p className="wc-settings-note">
                        {pending
                            ? securityCopy.twoFactor.pending
                            : 'Set this up with any TOTP authenticator — Google Authenticator, Microsoft Authenticator or 1Password all work.'}
                    </p>

                    {pending ? (
                        <button
                            type="button"
                            className="wc-btn wc-btn-md wc-btn-primary"
                            onClick={() => setShowSetupModal(true)}
                        >
                            <ShieldCheck size={16} />
                            Continue setup
                        </button>
                    ) : (
                        <Form
                            {...enable.form()}
                            onSuccess={() => setShowSetupModal(true)}
                        >
                            {({ processing }) => (
                                <button
                                    type="submit"
                                    className="wc-btn wc-btn-md wc-btn-primary"
                                    disabled={processing}
                                >
                                    <ShieldCheck size={16} />
                                    Enable two-factor authentication
                                </button>
                            )}
                        </Form>
                    )}
                </div>
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={enabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </SettingsCard>
    );
}
