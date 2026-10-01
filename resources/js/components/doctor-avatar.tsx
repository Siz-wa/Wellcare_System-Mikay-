// resources/js/components/doctor-avatar.tsx

import type { CSSProperties, ReactElement } from 'react';

interface DoctorAvatarProps {
    /** Null whenever the doctor has no published photograph — see DoctorResource. */
    photoUrl: string | null;
    initials: string;
    /** The doctor's brand colour, used as the ground for the initials fallback. */
    color: string;
    name: string;
    /** Edge length in pixels. */
    size: number;
    className?: string;
    style?: CSSProperties;
}

/**
 * The initials size for a given box, taken from the shared type scale.
 *
 * Bucketed rather than computed as a fraction of the box: a px font size
 * ignores both the browser's font-size setting and the in-app Text size
 * control, which is the rule tests/Unit/TypographyScaleTest.php exists to hold.
 */
function initialsSize(box: number): string {
    if (box <= 36) {
        return 'var(--text-xs)';
    }

    if (box <= 56) {
        return 'var(--text-base)';
    }

    if (box <= 80) {
        return 'var(--text-lg)';
    }

    return 'var(--text-2xl)';
}

/**
 * A doctor's face, or their initials in the same box.
 *
 * Exists because four surfaces show a doctor — the public directory, the
 * individual profile page, the booking picker and the doctor's own settings
 * preview — and each had written its own coloured circle. Once a photograph can
 * be published, four copies means four chances for one of them to keep
 * rendering initials for a doctor who has a photo, or worse, to render a photo
 * for one who has withdrawn consent.
 *
 * The fallback is not a placeholder silhouette on purpose: initials on the
 * doctor's own colour is what every one of these surfaces showed before
 * photographs existed, and most doctors will not upload one.
 */
export function DoctorAvatar({
    photoUrl,
    initials,
    color,
    name,
    size,
    className = '',
    style,
}: DoctorAvatarProps): ReactElement {
    return (
        <div
            className={`wc-doctor-avatar ${className}`.trim()}
            style={{
                width: size,
                height: size,
                background: photoUrl ? 'var(--wc-gray-100)' : color,
                fontSize: initialsSize(size),
                ...style,
            }}
        >
            {photoUrl ? (
                <img src={photoUrl} alt={name} loading="lazy" />
            ) : (
                <span aria-hidden="true">{initials}</span>
            )}
        </div>
    );
}
