// resources/js/pages/generals/book-appointment/components/toggle-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Button card that toggles active state.
// Used for Coverage type and Patient Status selections.

import type { ReactElement } from 'react';
import { COVERAGE_ICONS, PATIENT_STATUS_ICONS } from './booking-icons';

interface ToggleCardProps {
    value: string;
    label: string;
    iconKey?: string;
    active: boolean;
    onClick: () => void;
}

export function ToggleCard({
    value,
    label,
    iconKey,
    active,
    onClick,
}: ToggleCardProps): ReactElement {
    const Icon = iconKey
        ? (COVERAGE_ICONS[iconKey] ?? PATIENT_STATUS_ICONS[iconKey] ?? null)
        : null;

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xl)',
                border: `2px solid ${active ? 'var(--wc-blue-600)' : 'var(--wc-gray-200)'}`,
                background: active ? 'var(--wc-blue-50)' : 'var(--wc-white)',
                color: active ? 'var(--wc-blue-600)' : 'var(--wc-gray-500)',
                fontWeight: active ? 600 : 400,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all var(--duration-base) var(--ease-out)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                textAlign: 'center',
                boxShadow: active ? '0 0 0 3px rgba(0,86,179,0.1)' : 'none',
            }}
        >
            {Icon && (
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-md)',
                        background: active
                            ? 'var(--wc-blue-100)'
                            : 'var(--wc-gray-100)',
                        flexShrink: 0,
                        transition:
                            'background var(--duration-base) var(--ease-out)',
                    }}
                >
                    <Icon />
                </span>
            )}
            {label}
        </button>
    );
}
