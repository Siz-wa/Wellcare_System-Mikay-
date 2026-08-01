// resources/js/pages/user/home/sections/HeroSection.tsx
import { useState, useEffect } from 'react';
import { heroData } from './homedata';

// ─── SVG icons ────────────────────────────────────────────────────────────────
const ArrowRight = () => (
    <svg
        width="18"
        height="18"
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
);

const ShieldIcon = () => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const ShieldLgIcon = ({ color }: { color: string }) => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const ActivityIcon = ({ color }: { color: string }) => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroSection() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 80);

        return () => clearTimeout(t);
    }, []);

    const { label, heading, body, ctas, socialProof, floats, image } = heroData;

    return (
        <section className="mx-auto grid min-h-[calc(100vh-var(--header-height))] max-w-[var(--container-xl)] grid-cols-1 items-center gap-12 px-6 py-16 md:px-8 lg:grid-cols-2 lg:gap-16">
            {/* ── Left: Copy ── */}
            <div
                className="transition-all duration-700"
                style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(28px)',
                    transitionTimingFunction: 'var(--ease-out)',
                }}
            >
                {/* Label pill */}
                <div className="wc-pill wc-pill-primary mb-5 inline-flex">
                    <ShieldIcon />
                    {label}
                </div>

                {/* Heading */}
                <h1 className="mb-6 text-[clamp(3rem,6vw,4.5rem)] leading-[1.1] tracking-[-0.04em] text-[var(--wc-dark)]">
                    {heading.line1}
                    <br />
                    <span className="wc-gradient-text">{heading.line2}</span>
                </h1>

                {/* Body */}
                <p className="mb-8 max-w-[480px] text-lg leading-relaxed text-[var(--wc-gray-500)]">
                    {body}
                </p>

                {/* CTAs */}
                <div className="mb-10 flex flex-wrap items-center gap-4">
                    <a
                        href={ctas.primary.href}
                        className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill shadow-[var(--shadow-brand)]"
                    >
                        {ctas.primary.label} <ArrowRight />
                    </a>
                    <a
                        href={ctas.secondary.href}
                        className="wc-btn wc-btn-outline wc-btn-lg wc-btn-pill"
                    >
                        {ctas.secondary.label}
                    </a>
                </div>

                {/* Social proof */}
                <div className="flex items-center gap-4">
                    <div className="wc-avatar-group">
                        {(
                            [
                                '#60a5fa',
                                '#0056b3',
                                '#00a8e8',
                                '#16a34a',
                            ] as const
                        ).map((bg, i) => (
                            <div
                                key={i}
                                className="wc-avatar wc-avatar-sm font-bold text-white shadow-[0_0_0_3px_white]"
                                style={{ background: bg }}
                            >
                                {['D', 'C', 'B', 'A'][i]}
                            </div>
                        ))}
                    </div>
                    <div>
                        <span className="block font-display text-base font-extrabold text-[var(--wc-dark)]">
                            {socialProof.count}
                        </span>
                        <span className="block text-sm text-[var(--wc-gray-400)]">
                            {socialProof.sub}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Right: Visual ── */}
            <div
                className="relative transition-all delay-200 duration-700"
                style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted
                        ? 'translateY(0) scale(1)'
                        : 'translateY(24px) scale(0.97)',
                    transitionTimingFunction: 'var(--ease-out)',
                }}
            >
                {/* Image frame */}
                <div className="aspect-[4/5] overflow-hidden rounded-[var(--radius-4xl)] shadow-[var(--shadow-2xl)]">
                    <img
                        src={image.src}
                        alt={image.alt}
                        className="block h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(0,31,69,0.25)]" />
                </div>

                {/* Float — ISO Certified (top-left) */}
                <div
                    className="absolute top-8 -left-8 hidden min-w-[200px] items-center gap-3 rounded-[var(--radius-2xl)] bg-white px-4 py-3 shadow-[var(--shadow-xl)] md:flex"
                    style={{
                        animation:
                            'scaleIn 0.5s 0.7s both cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                >
                    <div
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
                        style={{ background: floats.topLeft.iconBg }}
                    >
                        <ShieldLgIcon color={floats.topLeft.iconColor} />
                    </div>
                    <div>
                        <span className="mb-0.5 block text-xs font-bold tracking-[var(--tracking-widest)] text-[var(--wc-gray-400)] uppercase">
                            {floats.topLeft.label}
                        </span>
                        <span className="block font-display text-base font-extrabold tracking-tight text-[var(--wc-dark)]">
                            {floats.topLeft.title}
                        </span>
                    </div>
                </div>

                {/* Float — Quick Results (bottom-right) */}
                <div
                    className="absolute -right-6 bottom-10 flex min-w-[200px] items-center gap-3 rounded-[var(--radius-2xl)] bg-white px-4 py-3 shadow-[var(--shadow-xl)]"
                    style={{
                        animation:
                            'scaleIn 0.5s 0.9s both cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                >
                    <div
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
                        style={{ background: floats.bottomRight.iconBg }}
                    >
                        <ActivityIcon color={floats.bottomRight.iconColor} />
                    </div>
                    <div>
                        <span className="block font-display text-base font-extrabold tracking-tight text-[var(--wc-dark)]">
                            {floats.bottomRight.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-[var(--wc-gray-500)]">
                            {floats.bottomRight.sub}
                        </span>
                    </div>
                </div>
            </div>

            {/* Keyframe for float cards */}
            <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </section>
    );
}
