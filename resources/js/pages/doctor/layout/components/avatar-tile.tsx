// resources/js/components/AvatarTile.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Initials-based avatar tile used everywhere a person needs to be represented.
// Used by: AppointmentList, Consultations, MyPatients, PatientRecords, LabReviews.
//
// Previously duplicated inline across:
//   dashboard/components/appointment-list.tsx
//   my-patients/patient-list-card.tsx
//   lab-reviews/lab-submissions-card.tsx
//
// New canonical import:
//   import { AvatarTile } from "@/components/AvatarTile";

import type { ReactElement } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────

interface AvatarTileProps {
    /** 1–2 uppercase initials to display */
    initials: string;
    /** Background color — any CSS color string or var(--wc-*) token */
    color: string;
    /** px size of the tile. Default: 40 */
    size?: number;
    /**
     * Shape variant:
     *  - "circle"  → fully round (var(--radius-full)) — used in appointment rows
     *  - "rounded" → rounded square (var(--radius-lg)) — used in patient tables
     * Default: "circle"
     */
    shape?: 'circle' | 'rounded';
    /** Optional image src — renders <img> instead of initials when provided */
    src?: string;
    /** Alt text for the image (only used when src is set) */
    alt?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AvatarTile({
    initials,
    color,
    size = 40,
    shape = 'circle',
    src,
    alt,
}: AvatarTileProps): ReactElement {
    const radius =
        shape === 'circle' ? 'var(--radius-full)' : 'var(--radius-lg)';

    const base: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    };

    // Photo avatar
    if (src) {
        return (
            <img
                src={src}
                alt={alt ?? initials}
                style={{ ...base, objectFit: 'cover' }}
            />
        );
    }

    // Initials avatar
    return (
        <div
            style={{
                ...base,
                background: color,
                color: '#ffffff',
                fontSize: size <= 36 ? 'var(--text-xs)' : 'var(--text-sm)',
                fontWeight: 700,
                letterSpacing: '0.03em',
            }}
        >
            {initials}
        </div>
    );
}
