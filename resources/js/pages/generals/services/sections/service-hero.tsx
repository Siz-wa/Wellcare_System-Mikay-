// resources/js/pages/user/services/sections/ServicesHeroSection.tsx
import { Link } from "@inertiajs/react";
import { useInView } from "@/hooks/useInView";
import { servicesHeroData } from "./service-data";

const ArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TRUST_ITEMS = [
  "ISO-certified laboratory",
  "50+ board-certified specialists",
  "Results within 24 hours",
];

export default function ServicesHeroSection() {
  const { ref, inView } = useInView(0.1);
  const { pill, heading, body, ctas, image } = servicesHeroData;

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
            <span className="wc-pill wc-pill-primary inline-flex mb-5">{pill}</span>

            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] mb-6">
              {heading.plain}
              <br />
              <span className="wc-gradient-text">{heading.gradient}</span>
            </h1>

            <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--wc-gray-500)" }}>
              {body}
            </p>

            {/* Trust badges */}
            <ul className="flex flex-col gap-3 mb-10">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--wc-blue-50)", color: "var(--wc-blue-600)" }}
                  >
                    <CheckIcon />
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--wc-gray-700)" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link href={ctas.primary.href} className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill">
                {ctas.primary.label} <ArrowRight />
              </Link>
             
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