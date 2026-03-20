// resources/js/pages/user/about/sections/TimelineSection.tsx
import { useInView } from "@/hooks/useInView";
import { timelineData } from "./about-data";

export default function TimelineSection() {
  const { ref, inView } = useInView();
  const { pill, heading, items } = timelineData;

  return (
    <section className="wc-section">
      <div className="wc-container">

        {/* Header */}
        <div
          ref={ref}
          className="text-center max-w-[600px] mx-auto mb-16 transition-all duration-600"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <span className="wc-pill wc-pill-primary">{pill}</span>
          <h2 className="mt-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
            {heading.plain}<span className="wc-gradient-text">{heading.gradient}</span>
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative max-w-[720px] mx-auto">

          {/* Vertical line */}
          <div
            className="absolute left-[18px] md:left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
            style={{ background: "var(--wc-gray-200)" }}
          />

          {items.map((item, i) => {
            const isLeft = i % 2 === 0;
            return (
              <div
                key={item.year}
                className={`relative flex gap-6 md:gap-0 mb-12 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.5s, transform 0.5s",
                  transitionDelay: `${i * 100}ms`,
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                {/* Content — takes half width on md+ */}
                <div className={`ml-10 md:ml-0 md:w-[calc(50%-32px)] ${isLeft ? "md:pr-8 md:text-right" : "md:pl-8"}`}>
                  <div className="wc-card">
                    <div className="wc-card-body">
                      <span
                        className="inline-block text-xs font-bold uppercase tracking-[var(--tracking-widest)] mb-2"
                        style={{ color: "var(--wc-blue-600)" }}
                      >
                        {item.year}
                      </span>
                      <h3 className="text-base mb-2">{item.title}</h3>
                      <p className="text-sm leading-relaxed m-0" style={{ color: "var(--wc-gray-500)" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dot — centered on the line */}
                <div
                  className="absolute left-[10px] md:left-1/2 top-6 w-[18px] h-[18px] rounded-full border-4 -translate-x-1/2 z-10 flex-shrink-0"
                  style={{
                    background: "var(--wc-blue-600)",
                    borderColor: "var(--wc-white)",
                    boxShadow: "var(--shadow-brand)",
                  }}
                />
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}