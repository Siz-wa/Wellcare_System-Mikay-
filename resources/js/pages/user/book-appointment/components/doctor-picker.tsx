// resources/js/pages/generals/book-appointment/components/doctor-picker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Searchable dropdown driven by the DB doctor_profiles prop.
// Uses numeric id (user_id) as value — not display name strings.

import type { ReactElement } from 'react';
import { useState, useRef, useEffect } from 'react';
import type { DoctorOption } from '@/pages/user/book-appointment/sections/bookingdata';

export interface DoctorPickerProps {
    doctors: DoctorOption[]; // from Inertia page prop (DB-driven)
    value: number | null; // selected doctor's user_id, null = no preference
    onChange: (id: number | null) => void;
    error?: string;
}

export function DoctorPicker({
    doctors,
    value,
    onChange,
    error,
}: DoctorPickerProps): ReactElement {
    // Derive the display string for the current value
    const selectedDoctor = doctors.find((d) => d.id === value) ?? null;

    const [query, setQuery] = useState(selectedDoctor?.name ?? '');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync display when parent resets the value
    useEffect(() => {
        setQuery(doctors.find((d) => d.id === value)?.name ?? '');
    }, [value, doctors]);

    // Close on outside click
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (containerRef.current?.contains(e.target as Node)) {
return;
}

            setOpen(false);
            // Revert to last confirmed display name if user typed but didn't select
            setQuery(doctors.find((d) => d.id === value)?.name ?? '');
        };
        document.addEventListener('mousedown', onMouseDown);

        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [value, doctors]);

    // Filter by name or specialization — both guarded against null
    const q = query.toLowerCase();
    const filtered = doctors.filter(
        (d) =>
            (d.name ?? '').toLowerCase().includes(q) ||
            (d.specialization ?? '').toLowerCase().includes(q),
    );

    const handleSelect = (id: number | null, name: string) => {
        setQuery(name);
        onChange(id);
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setQuery('');
        onChange(null);
        setOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Search input */}
            <div style={{ position: 'relative' }}>
                <input
                    className={`wc-input${error ? 'wc-input-error' : ''}`}
                    type="text"
                    placeholder="Search by name or specialization…"
                    value={query}
                    autoComplete="off"
                    style={{
                        paddingRight: query ? 'var(--space-10)' : undefined,
                    }}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(null); // clear confirmed selection while typing
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                />

                {/* Clear × button */}
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Clear doctor selection"
                        style={{
                            position: 'absolute',
                            right: 'var(--space-3)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--wc-gray-400)',
                            fontSize: 'var(--text-lg)',
                            lineHeight: 1,
                            padding: 0,
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {open && query.length > 0 && (
                <div
                    role="listbox"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'var(--wc-white)',
                        border: '1.5px solid var(--wc-gray-200)',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: 'var(--shadow-xl)',
                        zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
                        maxHeight: 260,
                        overflowY: 'auto',
                    }}
                >
                    {filtered.length === 0 ? (
                        <div
                            style={{
                                padding: 'var(--space-4) var(--space-5)',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-gray-400)',
                            }}
                        >
                            No doctors found matching "{query}"
                        </div>
                    ) : (
                        filtered.map((doc) => {
                            const isSelected = value === doc.id;

                            return (
                                <button
                                    key={doc.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() =>
                                        handleSelect(doc.id, doc.name ?? '')
                                    }
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                        width: '100%',
                                        padding:
                                            'var(--space-3) var(--space-4)',
                                        background: isSelected
                                            ? 'var(--wc-blue-50)'
                                            : 'transparent',
                                        border: 'none',
                                        borderBottom:
                                            '1px solid var(--wc-gray-100)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition:
                                            'background var(--duration-fast) var(--ease-out)',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
(
                                                e.currentTarget as HTMLButtonElement
                                            ).style.background =
                                                'var(--wc-gray-50)';
}
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
(
                                                e.currentTarget as HTMLButtonElement
                                            ).style.background = 'transparent';
}
                                    }}
                                >
                                    {/* Avatar */}
                                    <div
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 'var(--radius-full)',
                                            background: doc.color ?? '#0056b3',
                                            color: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 700,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {doc.initials ?? (doc.name ?? '?')[0]}
                                    </div>

                                    {/* Name + specialization */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p
                                            style={{
                                                fontSize: 'var(--text-sm)',
                                                fontWeight: 600,
                                                color: 'var(--wc-dark)',
                                                margin: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {doc.name}
                                        </p>
                                        {doc.specialization && (
                                            <p
                                                style={{
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--wc-gray-400)',
                                                    margin: 0,
                                                }}
                                            >
                                                {doc.specialization}
                                            </p>
                                        )}
                                    </div>

                                    {isSelected && (
                                        <span
                                            style={{
                                                color: 'var(--wc-blue-600)',
                                                fontWeight: 700,
                                                fontSize: 'var(--text-sm)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            ✓
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}

                    {/* No preference option */}
                    <button
                        type="button"
                        role="option"
                        aria-selected={value === null}
                        onClick={() => handleSelect(null, '')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: 'var(--space-3) var(--space-4)',
                            background:
                                value === null
                                    ? 'var(--wc-blue-50)'
                                    : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-gray-400)',
                            fontStyle: 'italic',
                        }}
                    >
                        No preference — assign next available doctor
                    </button>
                </div>
            )}
        </div>
    );
}
