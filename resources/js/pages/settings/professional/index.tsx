// resources/js/pages/settings/professional/index.tsx
// Composition only — sections carry the markup, professional-data.ts the copy.

import type { ReactElement } from 'react';
import { SettingsShell } from '@/pages/settings/layout/settings-shell';
import type { PageProps } from '@/types';
import type {
    CredentialFile,
    DoctorPublicPreview,
    PhotoLimits,
    ProfessionalProfileFields,
} from './professional-data';
import { CredentialsPanel } from './sections/credentials-panel';
import { PracticeForm } from './sections/practice-form';
import { PublicPreview } from './sections/public-preview';

interface PageData extends PageProps {
    profile: ProfessionalProfileFields;
    credential: CredentialFile | null;
    publicPreview: DoctorPublicPreview;
    bioMaxLength: number;
    photoLimits: PhotoLimits;
}

export default function ProfessionalProfilePage({
    profile,
    credential,
    publicPreview,
    bioMaxLength,
    photoLimits,
}: PageData): ReactElement {
    return (
        <SettingsShell active="professional" title="Professional profile">
            <CredentialsPanel profile={profile} credential={credential} />

            <PracticeForm
                profile={profile}
                initials={publicPreview.initials}
                bioMaxLength={bioMaxLength}
                photoLimits={photoLimits}
            />

            <PublicPreview preview={publicPreview} />
        </SettingsShell>
    );
}
