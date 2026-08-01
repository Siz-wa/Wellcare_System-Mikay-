// resources/js/pages/user/home/sections/TestimonialsSection.tsx
import { useInView } from '@/hooks/useInView';
import { testimonialsData } from '@/pages/generals/home/sections/homedata';

const StarIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="var(--wc-warning)"
        stroke="none"
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

export default function TestimonialsSection() {
    const { ref, inView } = useInView();
    const { pill, heading, items } = testimonialsData;

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
                    <h2 className="mt-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
                        {heading.plain}
                        <span className="wc-gradient-text">
                            {heading.gradient}
                        </span>
                    </h2>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {items.map((t, i) => (
                        <div
                            key={t.name}
                            className="wc-card transition-all duration-500"
                            style={{
                                opacity: inView ? 1 : 0,
                                transform: inView
                                    ? 'translateY(0)'
                                    : 'translateY(20px)',
                                transitionDelay: `${100 + i * 100}ms`,
                                transitionTimingFunction: 'var(--ease-out)',
                            }}
                        >
                            <div className="wc-card-body">
                                {/* Stars */}
                                <div className="mb-4 flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <StarIcon key={j} />
                                    ))}
                                </div>

                                <p className="mb-6 text-base leading-relaxed text-[var(--wc-gray-700)] italic">
                                    "{t.quote}"
                                </p>

                                <div className="flex items-center gap-3">
                                    <div className="wc-avatar wc-avatar-sm bg-[var(--wc-blue-600)] text-white">
                                        {t.initials}
                                    </div>
                                    <div>
                                        <span className="block font-display text-sm font-bold text-[var(--wc-dark)]">
                                            {t.name}
                                        </span>
                                        <span className="block text-xs text-[var(--wc-gray-400)]">
                                            {t.role}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
