// resources/js/pages/generals/book-appointment/sections/booking-hero.tsx
// ──────────────────────────────────────────────────────────────────────
// Page header: pill label, heading, body copy.
// No form logic — purely presentational.

import type { ReactElement } from "react";
import { useInView }         from "@/hooks/useInView";
import { bookingMeta }       from "../bookingdata";

export default function BookingHero(): ReactElement {
  const { ref, inView } = useInView();
  const { label, heading, body } = bookingMeta;

  return (
    <div
      ref={ref}
      style={{
        textAlign:  "center",
        marginBottom: "var(--space-10)",
        opacity:    inView ? 1 : 0,
        transform:  inView ? "translateY(0)" : "translateY(20px)",
        transition: "opacity var(--duration-slow) var(--ease-out), transform var(--duration-slow) var(--ease-out)",
      }}
    >
      <span
        className="wc-pill wc-pill-primary"
        style={{ marginBottom: "var(--space-4)", display: "inline-block" }}
      >
        {label}
      </span>
      <h1>
        {heading.line1}{" "}
        <span className="wc-gradient-text">{heading.line2}</span>
      </h1>
      <p style={{ maxWidth: 500, margin: "0 auto" }}>{body}</p>
    </div>
  );
}