// resources/js/pages/generals/book-appointment/sections/booking-success.tsx

import type { ReactElement } from "react";
import { Link }              from "@inertiajs/react";
import { useInView }         from "@/hooks/useInView";
import { bookingMeta }       from "@/pages/user/book-appointment/sections/bookingdata";

// Wayfinder — generated from AppointmentController in web.php
import { book as appointmentsIndex } from "@/routes";

const IconCheckCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function BookingSuccess(): ReactElement {
  const { ref, inView }             = useInView();
  const { successHeading, successBody } = bookingMeta;

  return (
    <section className="wc-section">
      <div
        ref={ref}
        className="wc-container"
        style={{
          maxWidth:   540,
          margin:     "0 auto",
          textAlign:  "center",
          opacity:    inView ? 1 : 0,
          transform:  inView ? "translateY(0)" : "translateY(24px)",
          transition: "opacity var(--duration-slow) var(--ease-out), transform var(--duration-slow) var(--ease-out)",
        }}
      >
        {/* Icon ring */}
        <div
          style={{
            width:          80,
            height:         80,
            borderRadius:   "var(--radius-full)",
            background:     "var(--wc-blue-50)",
            border:         "2px solid var(--wc-blue-100)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            margin:         "0 auto var(--space-6)",
            color:          "var(--wc-blue-600)",
          }}
        >
          <IconCheckCircle />
        </div>

        <h1>
          {successHeading.line1}{" "}
          <span className="wc-gradient-text">{successHeading.line2}</span>
        </h1>

        <p style={{ marginBottom: "var(--space-8)" }}>{successBody}</p>

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
          <Link
            href="/"
            className="wc-btn wc-btn-outline wc-btn-md wc-btn-pill"
          >
            Back to Home
          </Link>
          <Link
            href={appointmentsIndex().url}
            className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
          >
            View My Appointments
          </Link>
        </div>
      </div>
    </section>
  );
}
