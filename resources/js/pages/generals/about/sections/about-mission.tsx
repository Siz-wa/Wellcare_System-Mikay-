// resources/js/pages/user/about/sections/MissionSection.tsx
import { useInView } from "@/hooks/useInView";
import { missionData } from "./about-data";

export default function MissionSection() {
  const { ref, inView } = useInView();
  const { pill, mission, vision, values } = missionData;

  return (
    <section className="wc-section bg-[var(--wc-gray-50)]">
      <div className="wc-container">

        {/* Pill header */}
        <div
          ref={ref}
          className="text-center mb-12 transition-all duration-600"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <span className="wc-pill wc-pill-primary">{pill}</span>
        </div>

        {/* Mission + Vision cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {[mission, vision].map((item, i) => (
            <div
              key={item.label}
              className="wc-card transition-all duration-600"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${100 + i * 120}ms`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="wc-card-body">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{item.icon}</span>
                  <span
                    className="text-xs font-bold uppercase tracking-[var(--tracking-widest)]"
                    style={{ color: "var(--wc-blue-600)" }}
                  >
                    {item.label}
                  </span>
                </div>
                <h3 className="text-xl mb-3">{item.heading}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wc-gray-500)" }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <div
              key={v.title}
              className="wc-card wc-card-hover transition-all duration-500"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${240 + i * 80}ms`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="wc-card-body">
                <span className="text-3xl block mb-3">{v.emoji}</span>
                <h4 className="text-base mb-2">{v.title}</h4>
                <p className="text-sm leading-relaxed m-0" style={{ color: "var(--wc-gray-500)" }}>
                  {v.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}