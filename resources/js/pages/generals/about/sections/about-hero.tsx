// resources/js/pages/user/about/sections/AboutHeroSection.tsx
import { useInView } from '@/hooks/useInView';
import { aboutHeroData } from './about-data';

export default function AboutHeroSection() {
    const { ref, inView } = useInView(0.1);
    const { pill, heading, body, image, stats } = aboutHeroData;

    return (
        <section className="wc-section">
            <div className="wc-container">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    {/* ── Left: Copy ── */}
                    <div
                        ref={ref}
                        className="transition-all duration-700"
                        style={{
                            opacity: inView ? 1 : 0,
                            transform: inView
                                ? 'translateX(0)'
                                : 'translateX(-24px)',
                            transitionTimingFunction: 'var(--ease-out)',
                        }}
                    >
                        <span className="wc-pill wc-pill-primary mb-5 inline-flex">
                            {pill}
                        </span>

                        <h1 className="mb-6 text-[clamp(2.25rem,5vw,3.75rem)]">
                            {heading.plain}
                            <span className="wc-gradient-text">
                                {heading.gradient}
                            </span>
                        </h1>

                        <p
                            className="mb-10 text-lg leading-relaxed"
                            style={{ color: 'var(--wc-gray-500)' }}
                        >
                            {body}
                        </p>

                        {/* Stat row */}
                        <div className="grid grid-cols-2 gap-6 border-t border-[var(--wc-gray-200)] pt-8 sm:grid-cols-4">
                            {stats.map((s, i) => (
                                <div
                                    key={s.label}
                                    className="transition-all duration-500"
                                    style={{
                                        opacity: inView ? 1 : 0,
                                        transform: inView
                                            ? 'translateY(0)'
                                            : 'translateY(12px)',
                                        transitionDelay: `${200 + i * 80}ms`,
                                        transitionTimingFunction:
                                            'var(--ease-out)',
                                    }}
                                >
                                    <span
                                        className="mb-1 block font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-none font-extrabold tracking-[-0.04em]"
                                        style={{ color: 'var(--wc-blue-600)' }}
                                    >
                                        {s.value}
                                    </span>
                                    <span
                                        className="block text-xs font-semibold tracking-[var(--tracking-widest)] uppercase"
                                        style={{ color: 'var(--wc-gray-400)' }}
                                    >
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Right: Image ── */}
                    <div
                        className="transition-all delay-200 duration-700"
                        style={{
                            opacity: inView ? 1 : 0,
                            transform: inView
                                ? 'translateX(0)'
                                : 'translateX(24px)',
                            transitionTimingFunction: 'var(--ease-out)',
                        }}
                    >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-4xl)] shadow-[var(--shadow-2xl)]">
                            <img
                                src={image.src}
                                alt={image.alt}
                                className="h-full w-full object-cover"
                            />
                            {/* Subtle bottom gradient */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background:
                                        'linear-gradient(to top, rgba(0,31,69,0.2) 0%, transparent 50%)',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
