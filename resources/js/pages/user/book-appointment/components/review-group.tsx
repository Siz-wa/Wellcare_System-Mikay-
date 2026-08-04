// resources/js/pages/generals/book-appointment/components/review-group.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Card wrapper for a group of ReviewRow items in the review step.
// Shows an icon tile + title + Edit button in the header.

import type { ReactElement, ReactNode } from 'react';
import { REVIEW_GROUP_ICONS, IconEdit } from './booking-icons';

interface ReviewGroupProps {
    iconKey: string;
    title: string;
    onEdit: () => void;
    children: ReactNode;
    fullWidth?: boolean;
}

export function ReviewGroup({
    iconKey,
    title,
    onEdit,
    children,
    fullWidth,
}: ReviewGroupProps): ReactElement {
    const Icon = REVIEW_GROUP_ICONS[iconKey] ?? null;

    return (
        <div
            style={{
                padding: 'var(--space-5)',
                background: 'var(--wc-gray-50)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--wc-gray-200)',
                gridColumn: fullWidth ? '1 / -1' : undefined,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-3)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
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
                                background: 'var(--wc-blue-100)',
                                color: 'var(--wc-blue-600)',
                                flexShrink: 0,
                            }}
                        >
                            <Icon />
                        </span>
                    )}
                    <p
                        style={{
                            fontWeight: 700,
                            fontSize: 'var(--text-sm)',
                            margin: 0,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {title}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onEdit}
                    className="wc-btn wc-btn-ghost wc-btn-xs wc-btn-pill"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 'var(--text-xs)',
                    }}
                >
                    <IconEdit /> Edit
                </button>
            </div>

            {children}
        </div>
    );
}
