// resources/js/pages/user/dashboard/components/empty-state.tsx

import type { ReactElement, ReactNode } from 'react';

interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    body: string;
    action?: ReactNode;
}

export function EmptyState({
    icon,
    title,
    body,
    action,
}: EmptyStateProps): ReactElement {
    return (
        <div
            style={{
                padding: 'var(--space-10) var(--space-6)',
                textAlign: 'center',
                borderRadius: 'var(--radius-xl)',
                border: '1px dashed var(--wc-gray-200)',
                background: '#fff',
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-2xl)',
                    background: 'var(--wc-blue-50)',
                    color: 'var(--wc-blue-600)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                }}
            >
                {icon}
            </span>
            <p
                style={{
                    margin: '0 0 4px',
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 800,
                    color: 'var(--wc-text-secondary)',
                }}
            >
                {title}
            </p>
            <p
                style={{
                    margin: '0 auto var(--space-5)',
                    maxWidth: 380,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-text-muted)',
                }}
            >
                {body}
            </p>
            {action}
        </div>
    );
}
