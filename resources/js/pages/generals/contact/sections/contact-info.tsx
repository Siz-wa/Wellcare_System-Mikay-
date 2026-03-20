// resources/js/pages/user/contact/sections/ContactInfoSection.tsx
import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { contactChannels, locationData } from "./contact-data";
import type { ContactChannel } from "./contact-data";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS: Record<ContactChannel["icon"], ReactElement> = {
  phone: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l1.27-.62a2 2 0 0 1 2.11.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  email: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  location: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContactInfoSection() {
  const { ref, inView } = useInView();

  return (
    <section className="wc-section">
      <div className="wc-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* ── Left: channel cards ── */}
          <div
            ref={ref}
            className="flex flex-col gap-4"
          >
            <span className="wc-pill wc-pill-primary inline-flex mb-2">Contact Details</span>

            <h2 className="text-[clamp(1.875rem,3.5vw,2.25rem)] mb-2">
              Reach the <span className="wc-gradient-text">Right Team</span>
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "var(--wc-gray-500)" }}>
              We have dedicated lines for admin inquiries, clinic support, and our WalterMart branch.
            </p>

            {contactChannels.map((ch, i) => (
              <div
                key={ch.id}
                className="wc-card wc-card-hover transition-all duration-500"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateX(0)" : "translateX(-20px)",
                  transitionDelay: `${i * 80}ms`,
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                <div className="wc-card-body flex items-start gap-4">
                  {/* Icon tile */}
                  <div
                    className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary flex-shrink-0"
                  >
                    {ICONS[ch.icon]}
                  </div>

                  <div className="min-w-0">
                    {/* Department label */}
                    <p
                      className="text-[10px] font-bold uppercase tracking-[var(--tracking-widest)] mb-0.5"
                      style={{ color: "var(--wc-gray-400)" }}
                    >
                      {ch.department}
                    </p>

                    {/* Channel label */}
                    <h3 className="text-base mb-2">{ch.label}</h3>

                    {/* Contact lines */}
                    <div className="flex flex-col gap-1">
                      {ch.lines.map((line) => (
                        <a
                          key={line.href}
                          href={line.href}
                          className="text-sm font-medium break-all transition-all duration-[var(--duration-fast)] no-underline"
                          style={{ color: "var(--wc-blue-600)" }}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.color = "var(--wc-sky-500)")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.color = "var(--wc-blue-600)")
                          }
                          target={line.href.startsWith("http") ? "_blank" : undefined}
                          rel={line.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        >
                          {line.text}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Right: map ── */}
          <div
            className="transition-all duration-700 delay-200 lg:sticky lg:top-[calc(var(--header-height)+2rem)]"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateX(0)" : "translateX(24px)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {/* Map embed */}
            <div className="rounded-[var(--radius-3xl)] overflow-hidden shadow-[var(--shadow-xl)] aspect-[4/3] mb-4">
              <iframe
                title="Wellcare Clinics Location"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(locationData.address)}&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Address pill below map */}
            <div
              className="flex items-start gap-3 rounded-[var(--radius-2xl)] px-5 py-4"
              style={{ background: "var(--wc-blue-50)", border: "1px solid var(--wc-blue-100)" }}
            >
              <span style={{ color: "var(--wc-blue-600)", flexShrink: 0, marginTop: 2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <p className="text-sm leading-relaxed m-0" style={{ color: "var(--wc-blue-800)" }}>
                {locationData.address}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}