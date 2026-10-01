// resources/js/pages/settings/professional/sections/credentials-panel.tsx

import type { ReactElement } from 'react';
import { Badge } from '@/design-system';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import type {
    CredentialFile,
    ProfessionalProfileFields,
} from '../professional-data';
import { credentialRows, professionalCopy } from '../professional-data';

interface CredentialsPanelProps {
    profile: ProfessionalProfileFields;
    credential: CredentialFile | null;
}

type BadgeVariant = 'primary' | 'sky' | 'success' | 'warning' | 'error';

/**
 * The credential status tone arrives from PHP as a design-system Badge variant
 * (CredentialStatus::tone()), so it crosses as-is. This narrows the string back
 * to the union rather than re-deriving the mapping in a second place that could
 * drift from the enum.
 */
function toneVariant(tone: string): BadgeVariant {
    const known: BadgeVariant[] = [
        'primary',
        'sky',
        'success',
        'warning',
        'error',
    ];

    return known.includes(tone as BadgeVariant)
        ? (tone as BadgeVariant)
        : 'primary';
}

function Row({
    label,
    value,
    publicToPatients,
}: {
    label: string;
    value: string;
    publicToPatients: boolean;
}): ReactElement {
    return (
        <div className="wc-settings-readonly-row">
            <span className="wc-settings-readonly-label">
                {label}
                {publicToPatients && (
                    <span
                        className="wc-settings-readonly-flag"
                        title="Shown on your public profile"
                    >
                        Public
                    </span>
                )}
            </span>
            <span className="wc-settings-readonly-value">{value}</span>
        </div>
    );
}

/**
 * The read-only half of a doctor's profile: everything an administrator
 * confers, and everything the clinic holds on file.
 *
 * Read-only is the whole point. A specialty is not self-declared and a licence
 * is not self-attested — CredentialingService is the only writer for both, and
 * this panel exists so the doctor can see what was recorded about them and
 * catch an error in it, not so they can correct it themselves.
 */
export function CredentialsPanel({
    profile,
    credential,
}: CredentialsPanelProps): ReactElement {
    const copy = professionalCopy;

    return (
        <>
            <SettingsCard
                title={copy.roster.title}
                description={copy.roster.description}
                aside={
                    <Badge
                        variant={profile.isPublished ? 'success' : 'warning'}
                    >
                        {profile.isPublished ? 'Published' : 'Not published'}
                    </Badge>
                }
            >
                <div className="wc-settings-readonly">
                    <Row
                        label="Listed as"
                        value={profile.displayName}
                        publicToPatients
                    />
                    <Row
                        label="Specialty"
                        value={profile.specialtyLabel}
                        publicToPatients
                    />
                    {profile.specialization && (
                        <Row
                            label="Specialization"
                            value={profile.specialization}
                            publicToPatients
                        />
                    )}
                </div>

                <p className="wc-settings-note">
                    {profile.isPublished
                        ? copy.roster.publishedYes
                        : copy.roster.publishedNo}
                </p>
            </SettingsCard>

            <SettingsCard
                title={copy.credentials.title}
                description={copy.credentials.description}
                aside={
                    credential && (
                        <Badge variant={toneVariant(credential.statusTone)}>
                            {credential.statusLabel}
                        </Badge>
                    )
                }
            >
                {credential === null ? (
                    <p className="wc-settings-note">{copy.credentials.empty}</p>
                ) : (
                    <>
                        <div className="wc-settings-readonly">
                            {credentialRows.map((row) => {
                                const value = credential[row.key];

                                if (value === null || value === '') {
                                    return null;
                                }

                                return (
                                    <Row
                                        key={row.key}
                                        label={row.label}
                                        value={String(value)}
                                        publicToPatients={row.publicToPatients}
                                    />
                                );
                            })}

                            {credential.verifiedAt && (
                                <Row
                                    label="Verified"
                                    value={
                                        credential.verifiedBy
                                            ? `${credential.verifiedAt} by ${credential.verifiedBy}`
                                            : credential.verifiedAt
                                    }
                                    publicToPatients={false}
                                />
                            )}
                        </div>

                        {credential.remarks && (
                            <p className="wc-settings-note">
                                <strong>Administrator’s remarks: </strong>
                                {credential.remarks}
                            </p>
                        )}

                        {/* The two states worth interrupting for. Everything
                            else on this panel is reference; these are the ones
                            the doctor has to act on, and nothing told them
                            before this page existed. */}
                        {credential.hasLapsed ? (
                            <div className="wc-alert wc-alert-danger">
                                {copy.credentials.lapsed}
                            </div>
                        ) : (
                            credential.daysUntilExpiry !== null &&
                            credential.daysUntilExpiry <= 60 && (
                                <div className="wc-alert wc-alert-warning">
                                    Your earliest licence expiry is in{' '}
                                    {credential.daysUntilExpiry}{' '}
                                    {credential.daysUntilExpiry === 1
                                        ? 'day'
                                        : 'days'}
                                    . {copy.credentials.expiryWarning}
                                </div>
                            )
                        )}

                        <p className="wc-settings-note">
                            {copy.credentials.published}
                        </p>
                    </>
                )}
            </SettingsCard>
        </>
    );
}
