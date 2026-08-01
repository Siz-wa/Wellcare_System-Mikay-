// resources/js/pages/user/doctors/sections/WhyOurDoctorsSection.tsx

import { useInView } from '@/hooks/useInView';
import { whyDoctorsData } from '@/pages/generals/doctors/sections/doctors-data'; // ✅ fixed import path

const GraduationIcon = () => (
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
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
);

const SearchIcon = () => (
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
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const ChatIcon = () => (
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const RefreshIcon = () => (
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
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
);

import type { ReactElement } from 'react';

const STEP_ICONS: ReactElement[] = [
    <GraduationIcon />,
    <SearchIcon />,
    <ChatIcon />,
    <RefreshIcon />,
];

export default function WhyOurDoctorsSection() {
    const { ref, inView } = useInView();
    const { pill, heading, desc, steps } = whyDoctorsData;

    return (
        <section className="wc-section">
            <div className="wc-container">
                {/* Header */}
                <div
                    ref={ref}
                    className="mx-auto mb-14 max-w-[600px] text-center transition-all duration-700"
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
                    <p
                        className="text-lg leading-relaxed"
                        style={{ color: 'var(--wc-gray-500)' }}
                    >
                        {desc}
                    </p>
                </div>

                {/* Steps grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step, i) => (
                        <div
                            key={step.title}
                            className="wc-card wc-card-hover transition-all duration-500"
                            style={{
                                opacity: inView ? 1 : 0,
                                transform: inView
                                    ? 'translateY(0)'
                                    : 'translateY(20px)',
                                transitionDelay: `${100 + i * 90}ms`,
                                transitionTimingFunction: 'var(--ease-out)',
                            }}
                        >
                            <div className="wc-card-body">
                                <div className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary mb-4">
                                    {STEP_ICONS[i]}
                                </div>
                                <h3 className="mb-2 text-base">{step.title}</h3>
                                <p
                                    className="m-0 text-sm leading-relaxed"
                                    style={{ color: 'var(--wc-gray-500)' }}
                                >
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
