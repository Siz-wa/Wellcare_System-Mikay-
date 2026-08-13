// resources/js/components/SearchFilterBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Search input + optional Filters button.
// Used by: Consultations, LabReviews, PatientRecords (3+ pages).

import type { ReactElement, ChangeEvent } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconSearch = (): ReactElement => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const IconFilter = (): ReactElement => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface SearchFilterBarProps {
    /** Input placeholder text. Now optional to prevent TS errors. */
    placeholder?: string;
    /** Controlled value */
    value?: string;
    /** onChange handler */
    onChange?: (value: string) => void;
    /** Show the Filters button. Default: true */
    showFilter?: boolean;
    /** Label for the Filters button. Default: "Filters" */
    filterLabel?: string;
    /** Click handler for the Filters button */
    onFilterClick?: () => void;
    /** Bottom margin applied to the bar container. Default: var(--space-6) */
    marginBottom?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchFilterBar({
    placeholder = 'Search...', // Default value added here
    value,
    onChange,
    showFilter = true,
    filterLabel = 'Filters',
    onFilterClick,
    marginBottom = 'var(--space-6)',
}: SearchFilterBarProps): ReactElement {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value);
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom,
            }}
        >
            {/* ── Search input ──────────────────────────────────────────────── */}
            <div style={{ flex: 1, position: 'relative' }}>
                <span
                    style={{
                        position: 'absolute',
                        left: 'var(--space-4)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--wc-gray-400)',
                        display: 'flex',
                        pointerEvents: 'none',
                    }}
                >
                    <IconSearch />
                </span>
                <input
                    type="search"
                    className="wc-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    style={{
                        paddingLeft: 'calc(var(--space-4) + 22px)',
                        fontSize: 'var(--text-sm)',
                        background: 'var(--wc-white)',
                        border: '1px solid var(--wc-gray-200)',
                        height: 44,
                    }}
                />
            </div>

            {/* ── Filter button ─────────────────────────────────────────────── */}
            {showFilter && (
                <button
                    type="button"
                    className="wc-btn wc-btn-outline wc-btn-md"
                    onClick={onFilterClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        flexShrink: 0,
                        height: 44,
                        paddingInline: 'var(--space-5)',
                    }}
                >
                    <IconFilter />
                    {filterLabel}
                </button>
            )}
        </div>
    );
}
