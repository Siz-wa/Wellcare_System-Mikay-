// resources/js/pages/user/doctors/sections/DoctorsHeroSection.tsx
import { useInView } from "@/hooks/useInView";
import { doctorsHeroData } from "./doctors-data";

export default function DoctorsHeroSection() {
  const { ref, inView } = useInView(0.1);
  const { pill, heading, body, stats } = doctorsHeroData;

  return (
    <section
      className="relative overflow-hidden py-20 md:py-28"
      style={{ background: "linear-gradient(135deg, var(--wc-blue-900) 0%, var(--wc-blue-700) 60%, var(--wc-blue-600) 100%)" }}
    >
      {/* Background radial glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 10% 50%, rgba(255,255,255,0.05) 0%, transparent 55%),
            radial-gradient(circle at 90% 20%, rgba(0,168,232,0.15) 0%, transparent 50%)
          `,
        }}
      />

      <div className="wc-container relative z-10">
        <div
          ref={ref}
          className="max-w-[720px] mx-auto text-center transition-all duration-700"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          {/* Pill */}
          <span
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-[var(--tracking-widest)] uppercase mb-6"
            style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1.5px solid rgba(255,255,255,0.3)" }}
          >
            {pill}
          </span>

          {/* Heading — inline style overrides base.css h1 global */}
          <h1
            className="text-[clamp(2.25rem,5vw,4rem)] mb-6"
            style={{ color: "#ffffff" }}
          >
            {heading.plain}{" "}
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, var(--wc-sky-400), var(--wc-white))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {heading.gradient}
            </span>
          </h1>

          {/* Body — inline style overrides base.css p global */}
          <p
            className="text-lg leading-relaxed max-w-[560px] mx-auto mb-12"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            {body}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="rounded-[var(--radius-2xl)] py-5 px-4 transition-all duration-500"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(16px)",
                  transitionDelay: `${200 + i * 80}ms`,
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                <span
                  className="block font-display font-extrabold text-[clamp(1.5rem,3vw,2.25rem)] tracking-[-0.04em] leading-none mb-1"
                  style={{ color: "#ffffff" }}
                >
                  {s.value}
                </span>
                <span
                  className="block text-xs font-semibold uppercase tracking-[var(--tracking-widest)]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}