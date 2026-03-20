// resources/js/pages/user/contact/sections/ContactFormSection.tsx
import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { contactFormData, hoursData } from "./contact-data";
import SearchInput from "@/design-system/components/search-input";

// ─── Form state type ──────────────────────────────────────────────────────────
interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const INITIAL: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContactFormSection() {
  const { ref, inView } = useInView();
  const { pill, heading, desc, subjects, submitLabel } = contactFormData;
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: wire up to Inertia post("/contact") or your API endpoint
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setForm(INITIAL);
    }, 1000);
  };

  return (
    <section className="wc-section bg-[var(--wc-gray-50)]">
      <div className="wc-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-16 items-start">

          {/* ── Left: form ── */}
          <div
            ref={ref}
            className="transition-all duration-700"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateX(0)" : "translateX(-20px)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            <span className="wc-pill wc-pill-primary inline-flex mb-5">{pill}</span>
            <h2 className="text-[clamp(1.875rem,3.5vw,2.25rem)] mb-3">
              {heading.plain}<span className="wc-gradient-text">{heading.gradient}</span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: "var(--wc-gray-500)" }}>
              {desc}
            </p>

            {/* Success state */}
            {submitted ? (
              <div className="wc-alert wc-alert-success">
                <svg className="wc-alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Thank you! We'll get back to you within 24 hours.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

                {/* Name + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="wc-field">
                    <label className="wc-label-text">Full Name</label>
                    <input
                      type="text"
                      className="wc-input"
                      placeholder="Maria Santos"
                      value={form.name}
                      onChange={handleChange("name")}
                      required
                    />
                  </div>
                  <div className="wc-field">
                    <label className="wc-label-text">Phone Number</label>
                    <input
                      type="tel"
                      className="wc-input"
                      placeholder="09XX XXX XXXX"
                      value={form.phone}
                      onChange={handleChange("phone")}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="wc-field">
                  <label className="wc-label-text">Email Address</label>
                  <input
                    type="email"
                    className="wc-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange("email")}
                    required
                  />
                </div>

                {/* Subject */}
                <div className="wc-field">
                  <label className="wc-label-text">Subject</label>
                  <select
                    className="wc-input wc-select"
                    value={form.subject}
                    onChange={handleChange("subject")}
                    required
                  >
                    <option value="" disabled>Select a subject…</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="wc-field">
                  <label className="wc-label-text">Message</label>
                  <textarea
                    className="wc-input wc-textarea"
                    placeholder="Tell us how we can help…"
                    value={form.message}
                    onChange={handleChange("message")}
                    required
                    rows={5}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill self-start"
                  aria-busy={loading}
                >
                  {loading ? "Sending…" : submitLabel}
                </button>

              </form>
            )}
          </div>

          {/* ── Right: clinic hours ── */}
          <div
            className="transition-all duration-700 delay-200 lg:sticky lg:top-[calc(var(--header-height)+2rem)]"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateX(0)" : "translateX(24px)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            <div className="wc-card">
              <div className="wc-card-header">
                <div className="flex items-center gap-3">
                  <div className="wc-icon-tile wc-icon-tile-sm wc-icon-tile-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <span className="wc-pill wc-pill-primary text-[10px]">
                      {hoursData.pill}
                    </span>
                    <h3 className="text-base mt-1">
                      {hoursData.heading.plain}
                      <span className="wc-gradient-text">{hoursData.heading.gradient}</span>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="wc-card-body">
                <ul className="flex flex-col divide-y divide-[var(--wc-gray-100)]">
                  {hoursData.schedule.map((s) => {
                    const isToday = new Date().toLocaleDateString("en-US", { weekday: "long" }) === s.day;
                    return (
                      <li
                        key={s.day}
                        className="flex items-center justify-between py-3"
                      >
                        <span
                          className={`text-sm font-medium ${isToday ? "font-bold" : ""}`}
                          style={{ color: isToday ? "var(--wc-blue-600)" : "var(--wc-gray-700)" }}
                        >
                          {s.day}
                          {isToday && (
                            <span
                              className="ml-2 text-[10px] font-bold uppercase tracking-[var(--tracking-widest)] px-2 py-0.5 rounded-full"
                              style={{ background: "var(--wc-blue-50)", color: "var(--wc-blue-600)" }}
                            >
                              Today
                            </span>
                          )}
                        </span>
                        <span className="text-sm" style={{ color: "var(--wc-gray-500)" }}>
                          {s.hours}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div
                  className="mt-5 rounded-[var(--radius-xl)] px-4 py-3 text-xs leading-relaxed"
                  style={{
                    background: "var(--wc-warning-light)",
                    color: "var(--wc-warning-dark)",
                    border: "1px solid #fde047",
                  }}
                >
                  ⚠️ {hoursData.note}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}