// resources/js/pages/user/about/sections/TeamSection.tsx
import { useInView } from '@/hooks/useInView';
import { teamData } from './about-data';

export default function TeamSection() {
    const { ref, inView } = useInView();
    const { pill, heading, desc, members } = teamData;

    return (
        <section className="wc-section bg-[var(--wc-gray-50)]">
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
                    {members.map((m, i) => (
                        <div
                            key={m.name}
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
                            <div className="wc-card-body text-center">
                                {/* Avatar */}
                                <div
                                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full font-display text-xl font-extrabold shadow-[var(--shadow-lg)]"
                                    style={{
                                        background: m.color,
                                        color: '#ffffff',
                                    }}
                                >
                                    {m.initials}
                                </div>

                                <h3 className="mb-1 text-base">{m.name}</h3>

                                <p
                                    className="mb-4 text-xs font-semibold tracking-[var(--tracking-wide)] uppercase"
                                    style={{ color: 'var(--wc-blue-600)' }}
                                >
                                    {m.role}
                                </p>

                                <hr className="wc-divider mb-4" />

                                <p
                                    className="m-0 text-sm leading-relaxed"
                                    style={{ color: 'var(--wc-gray-500)' }}
                                >
                                    {m.bio}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
