// resources/js/pages/user/dashboard/components/UpgradeCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Gradient "Upgrade to Pro" promotional card.

import type { ReactElement } from "react";
import { dashboardMeta }     from "../dashboard-data";

export function UpgradeCard(): ReactElement {
  const meta = dashboardMeta;

  return (
    <div style={{
      borderRadius: "var(--radius-2xl)",
      background:   "linear-gradient(135deg, var(--wc-blue-700) 0%, var(--wc-blue-600) 60%, var(--wc-sky-500) 100%)",
      padding:      "var(--space-6)",
      position:     "relative",
      overflow:     "hidden",
      marginTop:    "var(--space-5)",
    }}>
      {/* Decorative circles */}
      <div style={{
        position:     "absolute",
        right:        -20,
        top:          -20,
        width:        100,
        height:       100,
        borderRadius: "var(--radius-full)",
        background:   "rgba(255,255,255,0.08)",
      }} />
      <div style={{
        position:     "absolute",
        right:        20,
        bottom:       -30,
        width:        80,
        height:       80,
        borderRadius: "var(--radius-full)",
        background:   "rgba(255,255,255,0.05)",
      }} />

      {/* Badge */}
      <span style={{
        display:       "inline-flex",
        padding:       "var(--space-1) var(--space-3)",
        borderRadius:  "var(--radius-full)",
        background:    "rgba(255,255,255,0.2)",
        fontSize:      "var(--text-xs)",
        fontWeight:    700,
        color:         "#ffffff",
        letterSpacing: "0.06em",
        marginBottom:  "var(--space-3)",
      }}>
        {meta.upgradeBadge}
      </span>

      <h3 style={{ margin: "0 0 var(--space-2)", color: "#ffffff", fontSize: "var(--text-lg)", fontWeight: 700 }}>
        {meta.upgradeTitle}
      </h3>
      <p style={{ margin: "0 0 var(--space-4)", color: "rgba(255,255,255,0.75)", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
        {meta.upgradeDesc}
      </p>

      <button
        type="button"
        className="wc-btn wc-btn-white wc-btn-sm wc-btn-pill"
        style={{ color: "var(--wc-blue-600)", fontWeight: 700 }}
      >
        {meta.upgradeLabel}
      </button>
    </div>
  );
}