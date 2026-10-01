// resources/js/pages/settings/professional/sections/practice-form.tsx

import { Form } from '@inertiajs/react';
import type { ReactElement } from 'react';
import ProfessionalProfileController from '@/actions/App/Http/Controllers/Settings/ProfessionalProfileController';
import { Field, Input, Textarea } from '@/design-system';
import { SaveBar } from '@/pages/settings/components/save-bar';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import type {
    PhotoLimits,
    ProfessionalProfileFields,
} from '../professional-data';
import { professionalCopy } from '../professional-data';
import { PhotoPanel } from './photo-panel';

interface PracticeFormProps {
    profile: ProfessionalProfileFields;
    initials: string;
    bioMaxLength: number;
    photoLimits: PhotoLimits;
}

/**
 * Everything on a doctor's entry that the doctor themselves owns.
 *
 * The photograph panel is inside this form on purpose: the consent tick-box is
 * a field of this profile, so it saves with the rest of it rather than being a
 * second switch with its own confirmation.
 *
 * Nothing conferred appears here — no specialty, no display name, no licence
 * number. Those are read-only in CredentialsPanel, and
 * ProfessionalProfileUpdateRequest does not accept them even if a form posts
 * them.
 */
export function PracticeForm({
    profile,
    initials,
    bioMaxLength,
    photoLimits,
}: PracticeFormProps): ReactElement {
    const copy = professionalCopy.practice;

    return (
        <Form
            {...ProfessionalProfileController.update.form()}
            options={{ preserveScroll: true }}
            className="wc-settings-stack"
        >
            {({ processing, recentlySuccessful, errors }) => (
                <>
                    {/* Reads its own error from shared page props — the
                        upload is a separate visit, not a submit of this form. */}
                    <PhotoPanel
                        profile={profile}
                        initials={initials}
                        limits={photoLimits}
                    />

                    <SettingsCard
                        title={copy.title}
                        description={copy.description}
                    >
                        <div className="wc-settings-fields">
                            <Field
                                label={copy.bioLabel}
                                hint={copy.bioHint}
                                error={errors.bio}
                                className="wc-settings-field--full"
                            >
                                <Textarea
                                    name="bio"
                                    rows={4}
                                    maxLength={bioMaxLength}
                                    defaultValue={profile.bio}
                                    placeholder={copy.bioPlaceholder}
                                    error={Boolean(errors.bio)}
                                />
                            </Field>

                            <Field
                                label={copy.languagesLabel}
                                hint={copy.languagesHint}
                                error={errors.languages}
                            >
                                <Input
                                    name="languages"
                                    defaultValue={profile.languages}
                                    placeholder={copy.languagesPlaceholder}
                                    error={Boolean(errors.languages)}
                                />
                            </Field>

                            <Field
                                label={copy.sinceLabel}
                                hint={copy.sinceHint}
                                error={errors.practising_since}
                            >
                                <Input
                                    type="number"
                                    name="practising_since"
                                    inputMode="numeric"
                                    min={1950}
                                    max={new Date().getFullYear()}
                                    defaultValue={
                                        profile.practisingSince ?? undefined
                                    }
                                    placeholder="2015"
                                    error={Boolean(errors.practising_since)}
                                />
                            </Field>
                        </div>

                        <SaveBar
                            processing={processing}
                            recentlySuccessful={recentlySuccessful}
                        />
                    </SettingsCard>
                </>
            )}
        </Form>
    );
}
