// resources/js/pages/user/home/sections/WhyUsSection.tsx
import { useInView } from '@/hooks/useInView';
import { whyUsData } from '@/pages/generals/home/sections/homedata';

export default function WhyUsSection() {
    const { ref, inView } = useInView();
    const { pill, heading, desc, badge, images, items } = whyUsData;

    return (
        <section className="wc-section overflow-hidden">
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
                        <span className="wc-pill wc-pill-primary">{pill}</span>
                        <h2 className="mt-4 mb-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
                            {heading.plain}
                            <span className="wc-gradient-text">
                                {heading.gradient}
                            </span>
                        </h2>
                        <p className="mb-8 text-lg leading-relaxed text-[var(--wc-gray-500)]">
                            {desc}
                        </p>

                        {items.map((item, i) => (
                            <div
                                key={item.title}
                                className="mb-6 flex items-start gap-4 transition-all duration-500"
                                style={{
                                    opacity: inView ? 1 : 0,
                                    transform: inView
                                        ? 'translateY(0)'
                                        : 'translateY(16px)',
                                    transitionDelay: `${100 + i * 80}ms`,
                                    transitionTimingFunction: 'var(--ease-out)',
                                }}
                            >
                                <span className="mt-0.5 flex-shrink-0 text-2xl">
                                    {item.emoji}
                                </span>
                                <div>
                                    <h4 className="mb-1 text-base text-[var(--wc-dark)]">
                                        {item.title}
                                    </h4>
                                    <p className="m-0 text-sm leading-relaxed text-[var(--wc-gray-500)]">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Right: Image collage ── */}
                    <div
                        className="relative pb-10 transition-all delay-200 duration-700 lg:pb-0"
                        style={{
                            opacity: inView ? 1 : 0,
                            transform: inView
                                ? 'translateX(0)'
                                : 'translateX(24px)',
                            transitionTimingFunction: 'var(--ease-out)',
                        }}
                    >
                        {/* Main image */}
                        <div className="aspect-[4/5] overflow-hidden rounded-[var(--radius-4xl)] shadow-[var(--shadow-2xl)]">
                            <img
                                src={images.main.src}
                                alt={images.main.alt}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        {/* Secondary inset image */}
                        <div className="absolute -bottom-8 -left-8 aspect-square w-[48%] overflow-hidden rounded-[var(--radius-3xl)] border-4 border-white shadow-[var(--shadow-xl)]">
                            <img
                                src={images.secondary.src}
                                alt={images.secondary.alt}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        {/* Floating badge */}
                        <div className="absolute top-8 -right-6 rounded-[var(--radius-2xl)] bg-white px-5 py-4 text-center shadow-[var(--shadow-xl)]">
                            <span className="block font-display leading-none font-extrabold tracking-[-0.04em] text-[var(--text-3xl)] text-[var(--wc-blue-600)]">
                                {badge.number}
                            </span>
                            <span className="mt-1 block text-xs font-semibold tracking-[var(--tracking-wide)] text-[var(--wc-gray-400)] uppercase">
                                {badge.label}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
