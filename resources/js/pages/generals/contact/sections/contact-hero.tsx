// resources/js/pages/user/contact/sections/ContactHeroSection.tsx
import { useInView } from "@/hooks/useInView";
import { contactHeroData } from "./contact-data";

export default function ContactHeroSection() {
  const { ref, inView } = useInView(0.1);
  const { pill, heading, body } = contactHeroData;

  return (
    <section
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        background: "linear-gradient(135deg, var(--wc-blue-900) 0%, var(--wc-blue-700) 60%, var(--wc-blue-600) 100%)",
      }}
    >
      {/* Radial glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 50%, rgba(255,255,255,0.05) 0%, transparent 55%),
            radial-gradient(circle at 85% 20%, rgba(0,168,232,0.15) 0%, transparent 50%)
          `,
        }}
      />

      <div className="wc-container relative z-10">
        <div
          ref={ref}
          className="max-w-[640px] mx-auto text-center transition-all duration-700"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          {/* Pill */}
          <span
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-[var(--tracking-widest)] uppercase mb-6"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#ffffff",
              border: "1.5px solid rgba(255,255,255,0.3)",
            }}
          >
            {pill}
          </span>

          {/* Heading — inline style overrides base.css h1 global */}
          <h1
            className="text-[clamp(2.25rem,5vw,3.75rem)] mb-6"
            style={{ color: "#ffffff" }}
          >
            {heading.plain}{" "}
            <span
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
            className="text-lg leading-relaxed max-w-[500px] mx-auto"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}