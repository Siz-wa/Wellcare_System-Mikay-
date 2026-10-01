// resources/js/components/PageHeader.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Standard page header used at the top of every dashboard page.
// Renders: optional back link → h1 title → subtitle → optional CTA button.
//
// Used by: every dashboard page (Dashboard, MySchedule, MyPatients,
//          Consultations, LabReviews, PatientRecords).
//
// Previously duplicated inline across all page composers.
//
// New canonical import:
//   import { PageHeader } from "@/components/PageHeader";

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CtaButton {
    label: string;
    href?: string;
    onClick?: () => void;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    /** If provided renders a ← chevron that navigates back */
    backHref?: string;
    /** If provided renders a primary CTA button top-right */
    cta?: CtaButton;
}

// ── Back chevron ──────────────────────────────────────────────────────────────

function BackChevron({ href }: { href: string }): ReactElement {
    return (
        <Link
            href={href}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
                color: 'var(--wc-text-muted)',
                textDecoration: 'none',
                width: 'fit-content',
                transition: `color var(--duration-base) var(--ease-out)`,
            }}
            // Hover handled via CSS — inline style can't express :hover in TSX
            className="page-header__back"
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="15 18 9 12 15 6" />
            </svg>
        </Link>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PageHeader({
    title,
    subtitle,
    backHref,
    cta,
}: PageHeaderProps): ReactElement {
    return (
        // Stacks on a phone. The CTA is a pill button and the title runs up to
        // 36px, so side by side the title took the squeeze and wrapped to three
        // lines. Every doctor page that uses this header inherits the fix.
        <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: back + title + subtitle */}
            <div>
                {backHref && <BackChevron href={backHref} />}

                <h1
                    style={{
                        margin: '0 0 var(--space-1)',
                        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        color: 'var(--wc-text-primary)',
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {title}
                </h1>

                {subtitle && (
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Right: CTA */}
            {/* Full width on its own row below `sm`, auto beside the title
                above it. */}
            {cta &&
                (cta.href ? (
                    <Link
                        href={cta.href}
                        className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill w-full shrink-0 justify-center sm:w-auto"
                    >
                        {cta.label}
                    </Link>
                ) : (
                    <button
                        type="button"
                        className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill w-full shrink-0 justify-center sm:w-auto"
                        onClick={cta.onClick}
                    >
                        {cta.label}
                    </button>
                ))}
        </div>
    );
}
