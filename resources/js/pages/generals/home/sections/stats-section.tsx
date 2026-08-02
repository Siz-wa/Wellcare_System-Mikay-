// resources/js/pages/user/home/sections/StatsSection.tsx
import { useInView } from '@/hooks/useInView';
import { statsData } from './homedata';

export default function StatsSection() {
    const { ref, inView } = useInView();

    return (
        <div className="bg-[var(--wc-blue-600)] py-10">
            <div
                ref={ref}
                className="wc-container grid grid-cols-2 gap-8 text-center md:grid-cols-4"
            >
                {statsData.map((s, i) => (
                    <div
                        key={s.label}
                        className="transition-all duration-500"
                        style={{
                            opacity: inView ? 1 : 0,
                            transform: inView
                                ? 'translateY(0)'
                                : 'translateY(16px)',
                            transitionDelay: `${i * 80}ms`,
                            transitionTimingFunction: 'var(--ease-out)',
                        }}
                    >
                        <span className="mb-2 block font-display leading-none font-extrabold tracking-[-0.04em] text-[var(--text-4xl)] text-white">
                            {s.value}
                        </span>
                        <span className="block text-sm font-medium tracking-[var(--tracking-wide)] text-white/65">
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
