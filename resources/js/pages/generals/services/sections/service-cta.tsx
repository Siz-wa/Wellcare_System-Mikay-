// resources/js/pages/user/services/sections/ServicesCtaSection.tsx
import { Link } from "@inertiajs/react";
import { useInView } from "@/hooks/useInView";
import { servicesCtaData } from "./service-data";

const ArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l1.27-.62a2 2 0 0 1 2.11.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export default function ServicesCtaSection() {
  const { ref, inView } = useInView();
  const { pill, heading, desc, ctas } = servicesCtaData;

  return (
    <section className="py-20">
      <div className="wc-container">
        <div
          ref={ref}
          className="relative rounded-[var(--radius-4xl)] overflow-hidden px-6 md:px-12 py-16 text-center transition-all duration-[600ms]"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
            transitionTimingFunction: "var(--ease-out)",
            background: "linear-gradient(135deg, var(--wc-blue-700) 0%, var(--wc-blue-600) 40%, var(--wc-sky-500) 100%)",
          }}
        >
          {/* Radial glows */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 60%),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%)
              `,
            }}
          />

          <div className="relative z-10 max-w-[600px] mx-auto">
            {/* Badge */}
            <span
              className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-[var(--tracking-widest)] uppercase"
              style={{ background: "rgba(255,255,255,0.22)", color: "#ffffff", border: "1.5px solid #ffffff" }}
            >
              {pill}
            </span>

            {/* Heading — inline style overrides base.css h2 global */}
            <h2
              className="text-[clamp(1.875rem,4vw,3rem)] mt-5 mb-5 tracking-[-0.04em]"
              style={{ color: "#ffffff" }}
            >
              {heading.line1}<br />{heading.line2}
            </h2>

            {/* Desc — inline style overrides base.css p global */}
            <p className="text-lg mb-8 leading-relaxed" style={{ color: "#ffffff" }}>
              {desc}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href={ctas.primary.href} className="wc-btn wc-btn-white wc-btn-lg wc-btn-pill">
                {ctas.primary.label} <ArrowRight />
              </Link>
              <a
                href={ctas.secondary.href}
                className="wc-btn wc-btn-lg wc-btn-pill"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  border: "1.5px solid #ffffff",
                  backdropFilter: "blur(8px)",
                }}
              >
                <PhoneIcon /> {ctas.secondary.label}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}