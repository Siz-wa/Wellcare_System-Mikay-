// resources/js/pages/user/about/sections/TeamSection.tsx
import { useInView } from "@/hooks/useInView";
import { teamData } from "./about-data";

export default function TeamSection() {
  const { ref, inView } = useInView();
  const { pill, heading, desc, members } = teamData;

  return (
    <section className="wc-section bg-[var(--wc-gray-50)]">
      <div className="wc-container">

        {/* Header */}
        <div
          ref={ref}
          className="text-center max-w-[600px] mx-auto mb-12 transition-all duration-600"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <span className="wc-pill wc-pill-primary">{pill}</span>
          <h2 className="mt-4 mb-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
            {heading.plain}<span className="wc-gradient-text">{heading.gradient}</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: "var(--wc-gray-500)" }}>{desc}</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.map((m, i) => (
            <div
              key={m.name}
              className="wc-card wc-card-hover transition-all duration-500"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${100 + i * 90}ms`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="wc-card-body text-center">
                {/* Avatar */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-display font-extrabold text-xl mx-auto mb-4 shadow-[var(--shadow-lg)]"
                  style={{ background: m.color, color: "#ffffff" }}
                >
                  {m.initials}
                </div>

                <h3 className="text-base mb-1">{m.name}</h3>

                <p
                  className="text-xs font-semibold uppercase tracking-[var(--tracking-wide)] mb-4"
                  style={{ color: "var(--wc-blue-600)" }}
                >
                  {m.role}
                </p>

                <hr className="wc-divider mb-4" />

                <p className="text-sm leading-relaxed m-0" style={{ color: "var(--wc-gray-500)" }}>
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