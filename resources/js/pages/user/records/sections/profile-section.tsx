// resources/js/pages/user/records/sections/profile-section.tsx

import { UserRound } from 'lucide-react';
import type { ReactElement } from 'react';
import { SectionShell } from '../components/section-shell';
import type { Profile } from '../records-data';
import { recordsMeta } from '../records-data';

interface ProfileSectionProps {
    profile: Profile;
}

export function ProfileSection({ profile }: ProfileSectionProps): ReactElement {
    const { labels, sections } = recordsMeta;

    const rows: Array<[string, string | null]> = [
        [labels.clinicId, profile.clinicId],
        [labels.birthdate, profile.birthdate],
        [labels.age, profile.age ? String(profile.age) : null],
        [labels.gender, profile.gender],
        [labels.civilStatus, profile.civilStatus],
        [labels.contactNumber, profile.contactNumber],
        [labels.email, profile.email],
        [labels.address, profile.address],
        [labels.hmoProvider, profile.hmoProvider],
    ];

    const filled = rows.filter(([, value]) => Boolean(value));

    return (
        <SectionShell
            title={sections.profile}
            icon={<UserRound size={17} strokeWidth={1.8} />}
            accent="var(--wc-blue-600)"
            isEmpty={filled.length === 0}
            emptyText="No personal details on file."
        >
            <dl
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4) var(--space-6)',
                    margin: 0,
                }}
            >
                {filled.map(([label, value]) => (
                    <div key={label}>
                        <dt
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '.04em',
                                color: 'var(--wc-gray-500)',
                            }}
                        >
                            {label}
                        </dt>
                        <dd
                            style={{
                                margin: '4px 0 0',
                                fontSize: 14,
                                color: 'var(--wc-gray-900)',
                                textTransform:
                                    label === recordsMeta.labels.gender ||
                                    label === recordsMeta.labels.civilStatus
                                        ? 'capitalize'
                                        : 'none',
                            }}
                        >
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </SectionShell>
    );
}
