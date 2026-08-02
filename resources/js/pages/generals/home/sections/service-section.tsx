// resources/js/pages/user/home/sections/ServicesSection.tsx
import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useInView } from '@/hooks/useInView';
import {
    servicesData,
    servicesSectionMeta,
} from '@/pages/generals/home/sections/homedata';
import { services } from '@/routes';

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS: Record<string, ReactElement> = {
    activity: (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    ),
    flask: (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H3m6 0h6m6-9v9m0 0h-6m6 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        </svg>
    ),
    users: (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    package: (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
        </svg>
    ),
    shield: (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    clock: (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ServicesSection() {
    const { ref, inView } = useInView();
    const { pill, heading, desc } = servicesSectionMeta;

    return (
        <section className="wc-section bg-[var(--wc-gray-50)]">
            <div className="wc-container">
                {/* Header */}
                <div
                    ref={ref}
                    className="mx-auto mb-12 max-w-[640px] text-center transition-all duration-600"
                    style={{
                        opacity: inView ? 1 : 0,
                        transform: inView
                            ? 'translateY(0)'
                            : 'translateY(20px)',
                        transitionTimingFunction: 'var(--ease-out)',
                    }}
                >
                    <span className="wc-pill wc-pill-primary">{pill}</span>
                    <h2 className="mt-4 mb-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
                        {heading.plain}
                        <span className="wc-gradient-text">
                            {heading.gradient}
                        </span>
                    </h2>
                    <p className="text-lg leading-relaxed text-[var(--wc-gray-500)]">
                        {desc}
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {servicesData.map((s, i) => (
                        <div
                            key={s.title}
                            className="wc-card wc-card-hover transition-all duration-500"
                            style={{
                                opacity: inView ? 1 : 0,
                                transform: inView
                                    ? 'translateY(0)'
                                    : 'translateY(20px)',
                                transitionDelay: `${120 + i * 80}ms`,
                                transitionTimingFunction: 'var(--ease-out)',
                            }}
                        >
                            <div className="wc-card-body">
                                <div
                                    className={`wc-icon-tile wc-icon-tile-lg wc-icon-tile-${s.color}`}
                                >
                                    {ICONS[s.iconKey]}
                                </div>
                                <h3 className="mt-5 mb-3 text-xl text-[var(--wc-dark)]">
                                    {s.title}
                                </h3>
                                <p className="mb-5 text-sm leading-relaxed text-[var(--wc-gray-500)]">
                                    {s.desc}
                                </p>
                                {/* ✅ internal link → <Link> */}
                                <Link
                                    href={services.url()}
                                    className="inline-flex items-center gap-2 text-sm font-bold text-[var(--wc-blue-600)] no-underline transition-all duration-[var(--duration-fast)] hover:gap-3 hover:text-[var(--wc-sky-500)]"
                                >
                                    Learn more
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
