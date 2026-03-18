// resources/js/pages/user/home/sections/WhyUsSection.tsx
import { useInView } from "@/hooks/useInView";
import { whyUsData } from "@/pages/generals/home/sections/homedata";

export default function WhyUsSection() {
  const { ref, inView } = useInView();
  const { pill, heading, desc, badge, images, items } = whyUsData;

  return (
    <section className="wc-section overflow-hidden">
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
            <span className="wc-pill wc-pill-primary">{pill}</span>
            <h2 className="mt-4 mb-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
              {heading.plain}<span className="wc-gradient-text">{heading.gradient}</span>
            </h2>
            <p className="text-lg text-[var(--wc-gray-500)] leading-relaxed mb-8">{desc}</p>

            {items.map((item, i) => (
              <div
                key={item.title}
                className="flex gap-4 items-start mb-6 transition-all duration-500"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(16px)",
                  transitionDelay: `${100 + i * 80}ms`,
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
                <div>
                  <h4 className="text-base text-[var(--wc-dark)] mb-1">{item.title}</h4>
                  <p className="text-sm text-[var(--wc-gray-500)] leading-relaxed m-0">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Right: Image collage ── */}
          <div
            className="relative pb-10 lg:pb-0 transition-all duration-700 delay-200"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateX(0)" : "translateX(24px)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {/* Main image */}
            <div className="rounded-[var(--radius-4xl)] overflow-hidden aspect-[4/5] shadow-[var(--shadow-2xl)]">
              <img src={images.main.src} alt={images.main.alt} className="w-full h-full object-cover" />
            </div>

            {/* Secondary inset image */}
            <div className="absolute -bottom-8 -left-8 w-[48%] rounded-[var(--radius-3xl)] overflow-hidden aspect-square border-4 border-white shadow-[var(--shadow-xl)]">
              <img src={images.secondary.src} alt={images.secondary.alt} className="w-full h-full object-cover" />
            </div>

            {/* Floating badge */}
            <div className="absolute top-8 -right-6 bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-xl)] px-5 py-4 text-center">
              <span className="block font-display font-extrabold text-[var(--text-3xl)] text-[var(--wc-blue-600)] tracking-[-0.04em] leading-none">
                {badge.number}
              </span>
              <span className="block text-xs text-[var(--wc-gray-400)] font-semibold tracking-[var(--tracking-wide)] uppercase mt-1">
                {badge.label}
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}