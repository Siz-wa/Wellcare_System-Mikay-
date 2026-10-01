// resources/js/pages/settings/security/sections/account-activity.tsx

import type { ReactElement } from 'react';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { securityCopy } from '@/pages/settings/settings-data';

export interface AccountActivityEntry {
    id: number;
    event: string | null;
    description: string;
    ip: string | null;
    user_agent: string | null;
    at: string | null;
    ago: string | null;
}

/**
 * A failed sign-in is the one entry a person must be able to pick out of the
 * list at a glance, so it is the only one given the warning treatment.
 */
const EVENT_TONE: Record<string, string> = {
    'sign-in-failed': 'wc-badge wc-badge-error',
    'sessions-revoked': 'wc-badge wc-badge-warning',
    'password-reset': 'wc-badge wc-badge-warning',
    'signed-in': 'wc-badge wc-badge-neutral',
    'signed-out': 'wc-badge wc-badge-neutral',
};

interface AccountActivityProps {
    entries: AccountActivityEntry[];
}

export function AccountActivity({
    entries,
}: AccountActivityProps): ReactElement {
    return (
        <SettingsCard
            title={securityCopy.activity.title}
            description={securityCopy.activity.description}
        >
            {entries.length === 0 ? (
                <p className="wc-settings-note">
                    {securityCopy.activity.empty}
                </p>
            ) : (
                <ul className="wc-activity-list">
                    {entries.map((entry) => (
                        <li key={entry.id} className="wc-activity-row">
                            <span
                                className={
                                    EVENT_TONE[entry.event ?? ''] ??
                                    'wc-badge wc-badge-neutral'
                                }
                            >
                                {entry.event ?? 'event'}
                            </span>

                            <div className="wc-activity-body">
                                <p className="wc-activity-title">
                                    {entry.description}
                                </p>
                                <p className="wc-activity-meta">
                                    {entry.ip ?? 'Unknown IP'} · {entry.ago}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </SettingsCard>
    );
}
