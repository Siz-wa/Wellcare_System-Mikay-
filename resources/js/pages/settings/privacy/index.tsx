// resources/js/pages/settings/privacy/index.tsx

import type { ReactElement } from 'react';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { SettingsShell } from '@/pages/settings/layout/settings-shell';
import { holdingsLabels, privacyCopy } from '@/pages/settings/settings-data';
import type { PageProps } from '@/types';
import { ConsentManager } from './sections/consent-manager';
import type { ConsentStatus } from './sections/consent-manager';
import { DeleteAccount } from './sections/delete-account';

interface PageData extends PageProps {
    summary: Record<string, number>;
    memberSince: string | null;
    canDeleteAccount: boolean;
    consents: ConsentStatus[];
}

export default function PrivacySettingsPage({
    summary,
    canDeleteAccount,
    consents,
}: PageData): ReactElement {
    return (
        <SettingsShell active="privacy" title="Privacy & data">
            <div className="wc-settings-stack">
                <SettingsCard
                    title={privacyCopy.holdings.title}
                    description={privacyCopy.holdings.description}
                >
                    <dl className="wc-holdings">
                        {Object.entries(summary).map(([key, count]) => (
                            <div key={key} className="wc-holdings-item">
                                <dt>{holdingsLabels[key] ?? key}</dt>
                                <dd>{count}</dd>
                            </div>
                        ))}
                    </dl>
                </SettingsCard>

                <ConsentManager consents={consents} />

                <SettingsCard
                    title={privacyCopy.export.title}
                    description={privacyCopy.export.description}
                >
                    {/*
                      A plain anchor, not an Inertia <Link>. The response is a
                      streamed file download, and Inertia's visit would treat
                      the non-Inertia response as a hard error rather than
                      handing the browser a file.
                    */}
                    <a
                        href="/settings/privacy/export"
                        className="wc-btn wc-btn-md wc-btn-primary"
                        download
                    >
                        {privacyCopy.export.action}
                    </a>
                </SettingsCard>

                <SettingsCard
                    title={privacyCopy.rights.title}
                    description={privacyCopy.rights.description}
                >
                    <p className="wc-settings-note">
                        Questions about how your data is handled go to the
                        WellCare Dasmariñas branch, or see the{' '}
                        <a href="/privacy" className="wc-link">
                            privacy policy
                        </a>
                        .
                    </p>
                </SettingsCard>

                <DeleteAccount canDelete={canDeleteAccount} />
            </div>
        </SettingsShell>
    );
}
