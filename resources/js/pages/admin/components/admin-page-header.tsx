// resources/js/pages/admin/components/admin-page-header.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Title + subtitle block shared by every admin page, matching the heading
// treatment already used by the nurse and patient pages.

import type { ReactElement, ReactNode } from 'react';

interface AdminPageHeaderProps {
    title: string;
    subtitle: string;
    action?: ReactNode;
}

export function AdminPageHeader({
    title,
    subtitle,
    action,
}: AdminPageHeaderProps): ReactElement {
    return (
        <div
            style={{
                marginBottom: 'var(--space-8)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 'var(--space-4)',
                flexWrap: 'wrap',
            }}
        >
            <div>
                <h1
                    style={{
                        margin: '0 0 var(--space-1)',
                        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        color: 'var(--wc-dark)',
                        fontFamily: "var(--font-display,'Bricolage Grotesque')",
                    }}
                >
                    {title}
                </h1>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {subtitle}
                </p>
            </div>
            {action}
        </div>
    );
}
