// resources/js/pages/user/privacy/sections/PrivacyContentSection.tsx

import { useInView } from "@/hooks/useInView";
import { policySections } from "@/pages/generals/privacy/sections/privacy-data";

export default function PrivacyContentSection() {
    const { ref, inView } = useInView();

    return (
        <section className="wc-section bg-[var(--wc-gray-50)]">
            <div className="wc-container">
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12 items-start">

                    {/* Sticky table of contents */}
                    <aside className="hidden lg:block sticky top-[calc(var(--header-height)+2rem)]">
                        <p className="wc-label text-[var(--wc-gray-400)] mb-4">Contents</p>
                        <nav className="flex flex-col gap-1">
                            {policySections.map((s) => (
                                
                                <a   key={s.id}
                                    href={`#${s.id}`}
                                    className="text-sm px-3 py-2 rounded-lg transition-colors duration-[var(--duration-base)] text-[var(--wc-gray-500)] hover:text-[var(--wc-blue-600)] hover:bg-[var(--wc-blue-50)]"
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
                                    transform: inView ? "translateY(0)" : "translateY(20px)",
                                    transitionDelay: `${Math.min(i * 60, 400)}ms`,
                                    transitionTimingFunction: "var(--ease-out)",
                                }}
                            >
                                <div className="wc-card-body">
                                    <h2 className="text-xl mb-5">{section.title}</h2>
                                    <div className="flex flex-col gap-4">
                                        {section.content.map((paragraph, pi) => (
                                            <p key={pi} className="text-sm leading-relaxed">
                                                {paragraph}
                                            </p>
                                        ))}
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