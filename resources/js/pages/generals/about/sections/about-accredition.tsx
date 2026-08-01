// resources/js/pages/user/about/sections/AccreditationsSection.tsx
import { useInView } from '@/hooks/useInView';
import { accreditationsData } from './about-data';

export default function AccreditationsSection() {
    const { ref, inView } = useInView();
    const { pill, heading, desc, items } = accreditationsData;

    return (
        <section className="wc-section">
            <div className="wc-container">
                {/* Header */}
                <div
                    ref={ref}
                    className="mx-auto mb-12 max-w-[600px] text-center transition-all duration-600"
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

                {/* Cards */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {items.map((item, i) => (
                        <div
                            key={item.title}
                            className="wc-card wc-card-hover transition-all duration-500"
                            style={{
                                opacity: inView ? 1 : 0,
                                transform: inView
                                    ? 'translateY(0)'
                                    : 'translateY(20px)',
                                transitionDelay: `${100 + i * 80}ms`,
                                transitionTimingFunction: 'var(--ease-out)',
                            }}
                        >
                            <div className="wc-card-body text-center">
                                <span className="mb-4 block text-4xl">
                                    {item.icon}
                                </span>
                                <h3 className="mb-3 text-base">{item.title}</h3>
                                <p
                                    className="m-0 text-sm leading-relaxed"
                                    style={{ color: 'var(--wc-gray-500)' }}
                                >
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
