// resources/js/pages/user/services/sections/ProcessSection.tsx
import { useInView } from '@/hooks/useInView';
import { processData } from './service-data';

export default function ProcessSection() {
    const { ref, inView } = useInView();
    const { pill, heading, steps } = processData;

    return (
        <section className="wc-section bg-[var(--wc-gray-50)]">
            <div className="wc-container">
                {/* Header */}
                <div
                    ref={ref}
                    className="mx-auto mb-16 max-w-[600px] text-center transition-all duration-700"
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

                {/* Steps */}
                <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Connector line (desktop only) */}
                    <div
                        className="absolute top-8 right-[12.5%] left-[12.5%] hidden h-px lg:block"
                        style={{ background: 'var(--wc-gray-200)' }}
                    />

                    {steps.map((step, i) => (
                        <div
                            key={step.number}
                            className="flex flex-col items-center text-center transition-all duration-500"
                            style={{
                                opacity: inView ? 1 : 0,
                                transform: inView
                                    ? 'translateY(0)'
                                    : 'translateY(20px)',
                                transitionDelay: `${100 + i * 100}ms`,
                                transitionTimingFunction: 'var(--ease-out)',
                            }}
                        >
                            {/* Step number circle */}
                            <div
                                className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-extrabold"
                                style={{
                                    background: 'var(--wc-blue-600)',
                                    color: '#ffffff',
                                    boxShadow: 'var(--shadow-brand)',
                                }}
                            >
                                {step.number}
                            </div>

                            <h3 className="mb-2 text-base">{step.title}</h3>
                            <p
                                className="m-0 text-sm leading-relaxed"
                                style={{ color: 'var(--wc-gray-500)' }}
                            >
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
