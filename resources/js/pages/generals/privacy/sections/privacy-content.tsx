// resources/js/pages/user/privacy/sections/PrivacyContentSection.tsx

import { useInView } from '@/hooks/useInView';
import { policySections } from '@/pages/generals/privacy/sections/privacy-data';

export default function PrivacyContentSection() {
    const { ref, inView } = useInView();

    return (
        <section className="wc-section bg-[var(--wc-gray-50)]">
            <div className="wc-container">
                <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[260px_1fr]">
                    {/* Sticky table of contents */}
                    <aside className="sticky top-[calc(var(--header-height)+2rem)] hidden lg:block">
                        <p className="wc-label mb-4 text-[var(--wc-gray-400)]">
                            Contents
                        </p>
                        <nav className="flex flex-col gap-1">
                            {policySections.map((s) => (
                                <a
                                    key={s.id}
                                    href={`#${s.id}`}
                                    className="rounded-lg px-3 py-2 text-sm text-[var(--wc-gray-500)] transition-colors duration-[var(--duration-base)] hover:bg-[var(--wc-blue-50)] hover:text-[var(--wc-blue-600)]"
                                >
                                    {s.title}
                                </a>
                            ))}
                        </nav>
                    </aside>

                    {/* Policy sections */}
                    <div ref={ref} className="flex flex-col gap-10">
                        {policySections.map((section, i) => (
                            <div
                                key={section.id}
                                id={section.id}
                                className="wc-card wc-card-flat scroll-mt-[calc(var(--header-height)+2rem)] transition-all duration-500"
                                style={{
                                    opacity: inView ? 1 : 0,
                                    transform: inView
                                        ? 'translateY(0)'
                                        : 'translateY(20px)',
                                    transitionDelay: `${Math.min(i * 60, 400)}ms`,
                                    transitionTimingFunction: 'var(--ease-out)',
                                }}
                            >
                                <div className="wc-card-body">
                                    <h2 className="mb-5 text-xl">
                                        {section.title}
                                    </h2>
                                    <div className="flex flex-col gap-4">
                                        {section.content.map(
                                            (paragraph, pi) => (
                                                <p
                                                    key={pi}
                                                    className="text-sm leading-relaxed"
                                                >
                                                    {paragraph}
                                                </p>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
