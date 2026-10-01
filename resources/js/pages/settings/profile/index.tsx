// resources/js/pages/settings/profile/index.tsx
// Composition only — sections carry the markup, settings-data.ts the copy.

import type { ReactElement } from 'react';
import { SettingsShell } from '@/pages/settings/layout/settings-shell';
import type { PageProps } from '@/types';
import { IdentitySummary } from './sections/identity-summary';
import type { ProfileFields } from './sections/profile-form';
import { ProfileForm } from './sections/profile-form';

interface PageData extends PageProps {
    profile: ProfileFields;
    mustVerifyEmail: boolean;
    emailVerified: boolean;
    status?: string;
    clientNumber: string | null;
    memberSince: string | null;
    roles: string[];
}

export default function ProfileSettingsPage({
    profile,
    mustVerifyEmail,
    emailVerified,
    status,
    clientNumber,
    memberSince,
    roles,
    auth,
}: PageData): ReactElement {
    return (
        <SettingsShell active="profile" title="Profile settings">
            <IdentitySummary
                firstName={profile.first_name}
                lastName={profile.last_name}
                email={profile.email}
                roles={roles}
                clientNumber={clientNumber}
                memberSince={memberSince}
                photoUrl={auth?.user?.photo_url ?? null}
            />

            <ProfileForm
                profile={profile}
                mustVerifyEmail={mustVerifyEmail}
                emailVerified={emailVerified}
                status={status}
            />
        </SettingsShell>
    );
}
