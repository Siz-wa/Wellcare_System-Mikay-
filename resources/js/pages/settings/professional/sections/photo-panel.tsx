// resources/js/pages/settings/professional/sections/photo-panel.tsx

import { router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { Check } from '@/design-system';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import type { PageProps } from '@/types';
import type {
    PhotoLimits,
    ProfessionalProfileFields,
} from '../professional-data';
import { professionalCopy } from '../professional-data';

interface PhotoPanelProps {
    profile: ProfessionalProfileFields;
    initials: string;
    limits: PhotoLimits;
}

/**
 * The photograph, and the permission to show it.
 *
 * ## Why this renders no <form> of its own
 *
 * It sits inside the profile's PATCH form, so the consent tick-box posts with
 * the rest of the profile and needs no separate save. The upload and the delete
 * are different verbs against a different endpoint, and a nested <form> is
 * invalid HTML — so they go through `router.post` / `router.delete` directly,
 * with `forceFormData` for the multipart body.
 *
 * ## Uploading is not publishing
 *
 * The file lands on the server as soon as it is chosen, and the doctor sees it
 * here. Patients see nothing until the tick-box below is ticked and saved —
 * that box is the consent under RA 10173, and unticking it withdraws the
 * permission without deleting the file.
 *
 * ## Why the error is read from the page, not from the form
 *
 * The upload is its own visit (`router.post` above), NOT a submit of the
 * surrounding <Form>. Inertia keeps a Form's `errors` local to that form's own
 * submissions, so a rejection of the upload never appears there — which is
 * exactly how a refused upload managed to fail in total silence: the server
 * answered `errors.photo`, the page received it, and nothing on screen changed.
 * Shared page props are where a separate visit's errors land, so that is what
 * this reads.
 */
export function PhotoPanel({
    profile,
    initials,
    limits,
}: PhotoPanelProps): ReactElement {
    const copy = professionalCopy.photo;
    const fileInput = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const error = usePage<PageProps>().props.errors?.photo;

    function handleFile(event: ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setUploading(true);

        router.post(
            '/settings/professional/photo',
            { photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                // The page holds the doctor's unsaved practice statement and
                // consent tick; a rejected upload must not discard them.
                preserveState: true,
                onFinish: () => {
                    setUploading(false);

                    // Clearing the input matters: without it, choosing the same
                    // file twice fires no change event, so a doctor who
                    // re-picks after a rejected upload appears to be ignored.
                    if (fileInput.current) {
                        fileInput.current.value = '';
                    }
                },
            },
        );
    }

    function handleRemove(): void {
        router.delete('/settings/professional/photo', {
            preserveScroll: true,
        });
    }

    return (
        <SettingsCard title={copy.title} description={copy.description}>
            {error && (
                <div className="wc-alert wc-alert-error" role="alert">
                    {error}
                </div>
            )}

            <div className="wc-settings-photo">
                <div className="wc-settings-photo-frame">
                    {profile.photoUrl ? (
                        <img
                            src={profile.photoUrl}
                            alt={`Photo of ${profile.displayName}`}
                        />
                    ) : (
                        initials
                    )}
                </div>

                <div className="wc-settings-photo-actions">
                    <button
                        type="button"
                        className="wc-btn wc-btn-sm wc-btn-secondary"
                        onClick={() => fileInput.current?.click()}
                        disabled={uploading}
                    >
                        {uploading
                            ? 'Uploading…'
                            : profile.hasPhoto
                              ? copy.replaceLabel
                              : copy.uploadLabel}
                    </button>

                    {profile.hasPhoto && (
                        <button
                            type="button"
                            className="wc-btn wc-btn-sm wc-btn-ghost"
                            onClick={handleRemove}
                            disabled={uploading}
                        >
                            {copy.removeLabel}
                        </button>
                    )}

                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFile}
                        hidden
                    />
                </div>
            </div>

            {!profile.hasPhoto && (
                <p className="wc-settings-note">{copy.empty}</p>
            )}

            {profile.hasPhoto && !profile.publishPhoto && (
                <div className="wc-alert wc-alert-warning" role="status">
                    {copy.unpublished}
                </div>
            )}

            <p className="wc-settings-note">{copy.hint(limits)}</p>

            <Check
                name="publish_photo"
                value="1"
                defaultChecked={profile.publishPhoto}
                disabled={!profile.hasPhoto}
                label={copy.consentLabel}
            />

            <p className="wc-settings-note">{copy.consentHint}</p>
        </SettingsCard>
    );
}
