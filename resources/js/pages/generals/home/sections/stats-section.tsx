// resources/js/pages/user/home/sections/StatsSection.tsx
import { useInView } from "@/hooks/useInView";
import { statsData } from "./homedata";

export default function StatsSection() {
  const { ref, inView } = useInView();

  return (
    <div className="bg-[var(--wc-blue-600)] py-10">
      <div
        ref={ref}
        className="wc-container grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
      >
        {statsData.map((s, i) => (
          <div
            key={s.label}
            className="transition-all duration-500"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(16px)",
              transitionDelay: `${i * 80}ms`,
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            <span className="block font-display font-extrabold text-[var(--text-4xl)] text-white tracking-[-0.04em] leading-none mb-2">
              {s.value}
            </span>
            <span className="block text-sm text-white/65 font-medium tracking-[var(--tracking-wide)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}