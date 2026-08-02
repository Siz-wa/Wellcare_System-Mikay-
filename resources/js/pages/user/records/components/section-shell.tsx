// resources/js/pages/user/records/components/section-shell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Titled card wrapper used by every section of the record detail page, with a
// built-in empty state so each section doesn't re-implement one.

import type { ReactElement, ReactNode } from 'react';

interface SectionShellProps {
    title: string;
    icon: ReactNode;
    accent: string;
    count?: number;
    isEmpty: boolean;
    emptyText: string;
    children: ReactNode;
}

export function SectionShell({
    title,
    icon,
    accent,
    count,
    isEmpty,
    emptyText,
    children,
}: SectionShellProps): ReactElement {
    return (
        <section
            style={{
                background: '#fff',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 'var(--radius-lg, 12px)',
                overflow: 'hidden',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--wc-gray-200)',
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        color: accent,
                        background: `${accent}14`,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </span>

                <h2
                    style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--wc-gray-900)',
                        margin: 0,
                    }}
                >
                    {title}
                </h2>

                {typeof count === 'number' && count > 0 && (
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--wc-gray-500)',
                            background: 'var(--wc-gray-100)',
                            borderRadius: 999,
                            padding: '2px 8px',
                        }}
                    >
                        {count}
                    </span>
                )}
            </header>

            <div style={{ padding: 'var(--space-5)' }}>
                {isEmpty ? (
                    <p
                        style={{
                            margin: 0,
                            fontSize: 14,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {emptyText}
                    </p>
                ) : (
                    children
                )}
            </div>
        </section>
    );
}
