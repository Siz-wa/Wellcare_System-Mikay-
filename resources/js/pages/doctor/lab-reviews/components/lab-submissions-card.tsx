// resources/js/pages/user/lab-reviews/components/lab-submissions-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Recent Lab Submissions" card — reuses the same card/row pattern
// from appointment-list.tsx and pending-lab-reviews.tsx.

import type { ReactElement } from 'react';
import { labReviewsMeta } from '../lab-reviews-data';
import type { LabSubmission, LabResultStatus } from '../lab-reviews-data';

// ── Lab flask icon (matches image — small blue flask SVG) ─────────────────────

function FlaskAvatar({ color }: { color: string }): ReactElement {
    return (
        <div
            style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-xl)',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: 0.9,
            }}
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H3m6 0h6m6-9v9m0 0h-6m6 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            </svg>
        </div>
    );
}

// ── Status badge (optional — image shows no per-row badge, kept for filtering) ─

const STATUS_CONFIG: Record<
    LabResultStatus,
    { label: string; bg: string; color: string }
> = {
    pending: {
        label: 'Pending',
        bg: 'var(--wc-blue-50)',
        color: 'var(--wc-blue-600)',
    },
    reviewed: { label: 'Reviewed', bg: '#dcfce7', color: '#15803d' },
    critical: { label: 'Critical', bg: '#fee2e2', color: '#b91c1c' },
    normal: { label: 'Normal', bg: '#f0fdf4', color: '#15803d' },
};

// ── Single submission row ─────────────────────────────────────────────────────

function SubmissionRow({
    item,
    isLast,
    onReview,
}: {
    item: LabSubmission;
    isLast: boolean;
    onReview: (id: string) => void;
}): ReactElement {
    const meta = labReviewsMeta;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-5) var(--space-6)',
                borderBottom: isLast ? 'none' : '1px solid var(--wc-gray-100)',
                transition: `background var(--duration-base) var(--ease-out)`,
                cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                    'var(--wc-gray-50)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                    'transparent';
            }}
        >
            {/* Flask avatar */}
            <FlaskAvatar color={item.iconColor} />

            {/* Patient name + test type + time */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--wc-dark)',
                        lineHeight: 1.3,
                    }}
                >
                    {item.name}
                </p>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-500)',
                        lineHeight: 1.3,
                    }}
                >
                    {item.test}
                </p>
                <p
                    style={{
                        margin: 'var(--space-1) 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-400)',
                        lineHeight: 1,
                    }}
                >
                    {item.timeAgo}
                </p>
            </div>

            {/* Review button — triggers modal instead of navigating */}
            <button
                type="button"
                onClick={() => onReview(item.id)}
                style={{
                    flexShrink: 0,
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--wc-sky-500)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-lg)',
                    transition: `all var(--duration-base) var(--ease-out)`,
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                        'var(--wc-blue-50)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--wc-blue-600)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                        'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--wc-sky-500)';
                }}
            >
                {meta.reviewLabel}
            </button>
        </div>
    );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function LabSubmissionsCard({
    items,
    onReview,
}: {
    items: LabSubmission[];
    onReview: (id: string) => void;
}): ReactElement {
    const meta = labReviewsMeta;

    return (
        <div className="wc-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Card header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-5) var(--space-6)',
                    borderBottom: '1px solid var(--wc-gray-100)',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        color: 'var(--wc-dark)',
                    }}
                >
                    {meta.cardTitle}
                </h2>
                <a
                    href={meta.viewAllHref}
                    style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        color: 'var(--wc-sky-500)',
                        textDecoration: 'none',
                        letterSpacing: '0.06em',
                    }}
                >
                    {meta.viewAllLabel}
                </a>
            </div>

            {/* Rows */}
            <div>
                {items.length === 0 ? (
                    <p
                        style={{
                            margin: 0,
                            padding: 'var(--space-6)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {meta.emptyMessage}
                    </p>
                ) : (
                    items.map((item, i) => (
                        <SubmissionRow
                            key={item.id}
                            item={item}
                            isLast={i === items.length - 1}
                            onReview={onReview}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
