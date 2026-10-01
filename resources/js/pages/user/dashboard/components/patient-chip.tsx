// resources/js/pages/user/dashboard/components/patient-chip.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The answer to "who does this belong to". A booking account can guarantee a
// spouse, three children and a parent, so every appointment leads with the
// person it is for — colour-coded off `patientKey` so the same face keeps the
// same colour on the board, in the filter chips and in the history panel.

import type { ReactElement } from 'react';
import { avatarColor } from '../dashboard-data';

interface PatientChipProps {
    name: string;
    initials: string;
    /** The stable key the colour is derived from (not the display name). */
    colorKey: string;
    relation?: string | null;
    size?: 'md' | 'lg';
}

export function PatientChip({
    name,
    initials,
    colorKey,
    relation,
    size = 'md',
}: PatientChipProps): ReactElement {
    const color = avatarColor(colorKey);

    return (
        <div className="wc-who">
            <span
                aria-hidden="true"
                className={
                    size === 'lg'
                        ? 'wc-who-avatar wc-who-avatar--lg'
                        : 'wc-who-avatar'
                }
                style={{ background: color.bg, color: color.fg }}
            >
                {initials}
            </span>

            <span style={{ minWidth: 0 }}>
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        minWidth: 0,
                    }}
                >
                    <span
                        className="wc-who-name"
                        style={
                            size === 'lg'
                                ? { fontSize: 'var(--text-base)' }
                                : undefined
                        }
                    >
                        {name}
                    </span>
                    {relation && <span className="wc-who-rel">{relation}</span>}
                </span>
            </span>
        </div>
    );
}
