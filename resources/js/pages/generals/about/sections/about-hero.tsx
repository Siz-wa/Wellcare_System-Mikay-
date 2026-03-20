// resources/js/pages/user/about/sections/AboutHeroSection.tsx
import { useInView } from "@/hooks/useInView";
import { aboutHeroData } from "./about-data";

export default function AboutHeroSection() {
  const { ref, inView } = useInView(0.1);
  const { pill, heading, body, image, stats } = aboutHeroData;

  return (
    <section className="wc-section">
      <div className="wc-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Copy ── */}
          <div
            ref={ref}
            className="transition-all duration-700"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateX(0)" : "translateX(-24px)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            <span className="wc-pill wc-pill-primary mb-5 inline-flex">{pill}</span>

            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] mb-6">
              {heading.plain}
              <span className="wc-gradient-text">{heading.gradient}</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10" style={{ color: "var(--wc-gray-500)" }}>
              {body}
            </p>

            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-[var(--wc-gray-200)]">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className="transition-all duration-500"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? "translateY(0)" : "translateY(12px)",
                    transitionDelay: `${200 + i * 80}ms`,
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                >
                  <span
                    className="block font-display font-extrabold text-[clamp(1.5rem,3vw,2.25rem)] tracking-[-0.04em] leading-none mb-1"
                    style={{ color: "var(--wc-blue-600)" }}
                  >
                    {s.value}
                  </span>
                  <span className="block text-xs font-semibold uppercase tracking-[var(--tracking-widest)]" style={{ color: "var(--wc-gray-400)" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Image ── */}
          <div
            className="transition-all duration-700 delay-200"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateX(0)" : "translateX(24px)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            <div className="relative rounded-[var(--radius-4xl)] overflow-hidden aspect-[4/3] shadow-[var(--shadow-2xl)]">
              <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
              {/* Subtle bottom gradient */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,31,69,0.2) 0%, transparent 50%)" }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}