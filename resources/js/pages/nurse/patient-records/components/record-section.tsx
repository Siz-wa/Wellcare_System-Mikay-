// resources/js/pages/nurse/patient-records/components/record-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Card shell every record section sits in.

import type { ReactElement, ReactNode } from 'react';

interface RecordSectionProps {
    title: string;
    /** Right-hand slot — an action button, or a read-only notice. */
    action?: ReactNode;
    note?: string;
    children: ReactNode;
}

export function RecordSection({
    title,
    action,
    note,
    children,
}: RecordSectionProps): ReactElement {
    return (
        <section
            style={{
                background: 'var(--wc-white)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 16,
                marginBottom: 'var(--space-5)',
                overflow: 'hidden',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-5)',
                    borderBottom: '1px solid var(--wc-gray-200)',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            color: 'var(--wc-dark)',
                            fontFamily:
                                "var(--font-display,'Bricolage Grotesque')",
                        }}
                    >
                        {title}
                    </h2>
                    {note && (
                        <p
                            style={{
                                margin: '4px 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-gray-500)',
                            }}
                        >
                            {note}
                        </p>
                    )}
                </div>
                {action}
            </header>

            <div style={{ padding: 'var(--space-5)' }}>{children}</div>
        </section>
    );
}

export function EmptyNote({ children }: { children: ReactNode }): ReactElement {
    return (
        <p
            style={{
                margin: 0,
                padding: 'var(--space-4) 0',
                textAlign: 'center',
                fontSize: 'var(--text-sm)',
                color: 'var(--wc-gray-500)',
            }}
        >
            {children}
        </p>
    );
}

export function ActionButton({
    label,
    onClick,
    tone = 'primary',
    disabled = false,
}: {
    label: string;
    onClick: () => void;
    tone?: 'primary' | 'ghost' | 'danger';
    disabled?: boolean;
}): ReactElement {
    const tones = {
        primary: { bg: 'var(--wc-blue-600)', color: '#fff', border: 'none' },
        ghost: {
            bg: 'var(--wc-gray-50)',
            color: 'var(--wc-gray-600)',
            border: '1px solid var(--wc-gray-200)',
        },
        danger: { bg: '#fef2f2', color: '#dc2626', border: 'none' },
    } as const;

    const style = tones[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '7px 14px',
                borderRadius: 10,
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                fontFamily: 'var(--font-sans)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                background: style.bg,
                color: style.color,
                border: style.border,
            }}
        >
            {label}
        </button>
    );
}
