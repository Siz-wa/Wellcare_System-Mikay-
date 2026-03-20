// resources/js/pages/user/doctors/sections/WhyOurDoctorsSection.tsx
import { useInView } from "@/hooks/useInView";
import { whyDoctorsData } from "./doctors-data";

export default function WhyOurDoctorsSection() {
  const { ref, inView } = useInView();
  const { pill, heading, desc, steps } = whyDoctorsData;

  return (
    <section className="wc-section">
      <div className="wc-container">

        {/* Header */}
        <div
          ref={ref}
          className="text-center max-w-[600px] mx-auto mb-14 transition-all duration-700"
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

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="wc-card wc-card-hover transition-all duration-500"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${100 + i * 90}ms`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="wc-card-body">
                <span className="text-4xl block mb-4">{step.icon}</span>
                <h3 className="text-base mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed m-0" style={{ color: "var(--wc-gray-500)" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}