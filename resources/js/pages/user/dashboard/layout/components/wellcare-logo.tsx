// resources/js/components/WellcareLogo.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wellcare brand logo — icon + wordmark.
// Used by: AppSidebar, auth pages, any page that needs the brand mark.
//
// Previously lived in:
//   dashboard/components/well-care-logo.tsx   ← DELETE after updating imports
//
// New canonical import:
//   import { WellcareLogo } from "@/components/WellcareLogo";

import type { ReactElement } from "react";

interface WellcareLogoProps {
  /** Scale factor for the whole unit. Default: 1 (36px icon). */
  scale?: number;
}

export function WellcareLogo({ scale = 1 }: WellcareLogoProps): ReactElement {
  const iconSize  = Math.round(36 * scale);
  const namePx    = Math.round(16 * scale);
  const subPx     = Math.round(10 * scale);
  const gap       = Math.round(10 * scale);
  const radius    = Math.round(12 * scale);

  return (
    <div style={{ display: "flex", alignItems: "center", gap }}>
      {/* Icon mark */}
      <div style={{
        width:          iconSize,
        height:         iconSize,
        borderRadius:   radius,
        background:     "var(--wc-blue-600)",
        boxShadow:      "var(--shadow-brand)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        <svg
          width={Math.round(20 * scale)}
          height={Math.round(20 * scale)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{ lineHeight: 1 }}>
        <p style={{
          margin:        0,
          fontSize:      namePx,
          fontWeight:    800,
          letterSpacing: "-0.02em",
          color:         "var(--wc-dark)",
          fontFamily:    "var(--font-display,'Bricolage Grotesque')",
          lineHeight:    1.1,
        }}>
          WELLCARE
        </p>
        <p style={{
          margin:        0,
          fontSize:      subPx,
          fontWeight:    800,
          letterSpacing: "0.1em",
          color:         "var(--wc-blue-600)",
          fontFamily:    "var(--font-display,'Bricolage Grotesque')",
          lineHeight:    1.1,
        }}>
          CLINICS
        </p>
      </div>
    </div>
  );
}