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
            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {filled.map(([label, value]) => (
                    <div key={label}>
                        <dt
                            style={{
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '.04em',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {label}
                        </dt>
                        <dd
                            style={{
                                margin: '4px 0 0',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-primary)',
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
