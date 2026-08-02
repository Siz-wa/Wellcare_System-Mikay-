// resources/js/pages/user/about/sections/TimelineSection.tsx
import { useInView } from '@/hooks/useInView';
import { timelineData } from './about-data';

export default function TimelineSection() {
    const { ref, inView } = useInView();
    const { pill, heading, items } = timelineData;

    return (
        <section className="wc-section">
            <div className="wc-container">
                {/* Header */}
                <div
                    ref={ref}
                    className="mx-auto mb-16 max-w-[600px] text-center transition-all duration-600"
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

                {/* Timeline */}
                <div className="relative mx-auto max-w-[720px]">
                    {/* Vertical line */}
                    <div
                        className="absolute top-0 bottom-0 left-[18px] w-px -translate-x-1/2 md:left-1/2"
                        style={{ background: 'var(--wc-gray-200)' }}
                    />

                    {items.map((item, i) => {
                        const isLeft = i % 2 === 0;

                        return (
                            <div
                                key={item.year}
                                className={`relative mb-12 flex gap-6 md:gap-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                                style={{
                                    opacity: inView ? 1 : 0,
                                    transform: inView
                                        ? 'translateY(0)'
                                        : 'translateY(20px)',
                                    transition: 'opacity 0.5s, transform 0.5s',
                                    transitionDelay: `${i * 100}ms`,
                                    transitionTimingFunction: 'var(--ease-out)',
                                }}
                            >
                                {/* Content — takes half width on md+ */}
                                <div
                                    className={`ml-10 md:ml-0 md:w-[calc(50%-32px)] ${isLeft ? 'md:pr-8 md:text-right' : 'md:pl-8'}`}
                                >
                                    <div className="wc-card">
                                        <div className="wc-card-body">
                                            <span
                                                className="mb-2 inline-block text-xs font-bold tracking-[var(--tracking-widest)] uppercase"
                                                style={{
                                                    color: 'var(--wc-blue-600)',
                                                }}
                                            >
                                                {item.year}
                                            </span>
                                            <h3 className="mb-2 text-base">
                                                {item.title}
                                            </h3>
                                            <p
                                                className="m-0 text-sm leading-relaxed"
                                                style={{
                                                    color: 'var(--wc-gray-500)',
                                                }}
                                            >
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Dot — centered on the line */}
                                <div
                                    className="absolute top-6 left-[10px] z-10 h-[18px] w-[18px] flex-shrink-0 -translate-x-1/2 rounded-full border-4 md:left-1/2"
                                    style={{
                                        background: 'var(--wc-blue-600)',
                                        borderColor: 'var(--wc-white)',
                                        boxShadow: 'var(--shadow-brand)',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
