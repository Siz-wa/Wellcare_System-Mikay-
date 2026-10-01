// resources/js/pages/settings/professional/sections/public-preview.tsx

import type { ReactElement } from 'react';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { doctorRoleLabel } from '@/lib/specialties';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import type { DoctorPublicPreview } from '../professional-data';
import { professionalCopy } from '../professional-data';

interface PublicPreviewProps {
    preview: DoctorPublicPreview;
}

/**
 * The doctor's entry as a patient reads it.
 *
 * Rendered from the same payload the public page receives
 * (App\Http\Resources\DoctorResource), so it cannot promise something the
 * public page withholds — which is the failure a hand-built "preview" invites.
 * If a credential is missing here, it is missing there, and the reason is
 * always the same: the file is not currently verified.
 */
export function PublicPreview({ preview }: PublicPreviewProps): ReactElement {
    const copy = professionalCopy.preview;

    return (
        <SettingsCard
            title={copy.title}
            description={copy.description}
            aside={
                <a
                    href={preview.profile_url}
                    className="wc-link"
                    target="_blank"
                    rel="noreferrer"
                >
                    {copy.openLabel}
                </a>
            }
        >
            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-4)',
                    alignItems: 'flex-start',
                }}
            >
                <DoctorAvatar
                    photoUrl={preview.photo_url}
                    initials={preview.initials}
                    color={preview.color}
                    name={preview.name}
                    size={64}
                />

                <div style={{ minWidth: 0 }}>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            color: 'var(--wc-text-primary)',
                        }}
                    >
                        {preview.name}
                    </p>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {doctorRoleLabel(preview)}
                    </p>

                    {preview.credentials ? (
                        <p
                            style={{
                                margin: 'var(--space-2) 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-secondary)',
                            }}
                        >
                            PRC {preview.credentials.prc_license_no}
                            {preview.credentials.board
                                ? ` · ${preview.credentials.board}`
                                : ''}
                        </p>
                    ) : (
                        <p className="wc-settings-note">{copy.noCredentials}</p>
                    )}

                    {preview.languages && (
                        <p
                            style={{
                                margin: 'var(--space-2) 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-secondary)',
                            }}
                        >
                            Speaks {preview.languages}
                        </p>
                    )}

                    {preview.practising_since && (
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-secondary)',
                            }}
                        >
                            Practising since {preview.practising_since}
                        </p>
                    )}

                    {preview.bio && (
                        <p
                            style={{
                                margin: 'var(--space-3) 0 0',
                                fontSize: 'var(--text-sm)',
                                lineHeight: 'var(--leading-relaxed)',
                                color: 'var(--wc-text-secondary)',
                                maxWidth: '60ch',
                            }}
                        >
                            {preview.bio}
                        </p>
                    )}
                </div>
            </div>

            {!preview.is_active && (
                <p className="wc-settings-note">{copy.unpublished}</p>
            )}
        </SettingsCard>
    );
}
