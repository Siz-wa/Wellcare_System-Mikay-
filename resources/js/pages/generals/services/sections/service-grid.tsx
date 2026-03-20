// resources/js/pages/user/services/sections/ServicesGridSection.tsx
import type { ReactElement } from "react";
import { Link } from "@inertiajs/react";
import { useInView } from "@/hooks/useInView";
import { servicesData } from "./service-data";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS: Record<string, ReactElement> = {
  activity: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  flask: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H3m6 0h6m6-9v9m0 0h-6m6 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  ),
  users: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shield: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  clock: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  monitor: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function ServicesGridSection() {
  const { ref, inView } = useInView();

  return (
    <section className="wc-section bg-[var(--wc-gray-50)]">
      <div className="wc-container">

        {/* Header */}
        <div
          ref={ref}
          className="text-center max-w-[640px] mx-auto mb-12 transition-all duration-700"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <span className="wc-pill wc-pill-primary">All Services</span>
          <h2 className="mt-4 mb-4 text-[clamp(1.875rem,3.5vw,2.25rem)]">
            Everything You Need, <span className="wc-gradient-text">Under One Roof</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: "var(--wc-gray-500)" }}>
            Six core service areas — each staffed by specialists and backed by ISO-certified quality.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesData.map((s, i) => (
            <div
              key={s.id}
              className="wc-card wc-card-hover flex flex-col transition-all duration-500"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${100 + i * 80}ms`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="wc-card-body flex flex-col flex-1">
                {/* Icon + title */}
                <div className={`wc-icon-tile wc-icon-tile-lg wc-icon-tile-${s.color} mb-5`}>
                  {ICONS[s.iconKey]}
                </div>

                <p
                  className="text-xs font-bold uppercase tracking-[var(--tracking-widest)] mb-1"
                  style={{ color: "var(--wc-gray-400)" }}
                >
                  {s.tagline}
                </p>

                <h3 className="text-xl mb-3">{s.title}</h3>

                <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--wc-gray-500)" }}>
                  {s.desc}
                </p>

                {/* Feature list */}
                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--wc-gray-600)" }}>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--wc-blue-50)", color: "var(--wc-blue-600)" }}
                      >
                        <CheckIcon />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-2 text-sm font-bold no-underline mt-auto transition-all duration-[var(--duration-fast)]"
                  style={{ color: "var(--wc-blue-600)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--wc-sky-500)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--wc-blue-600)")}
                >
                  Book this service <ArrowRight />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}