// resources/js/pages/patient/dashboard/components/quick-actions.tsx
import type { ReactElement } from "react";
import { patientMeta }       from "../../patient-data";

const QuickIcons: Record<string, ReactElement> = {
  "calendar-plus": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="12" y1="14" x2="12" y2="20"/><line x1="9" y1="17" x2="15" y2="17"/>
    </svg>
  ),
  folder: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  flask: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 2v6l-4 10a2 2 0 0 0 1.84 2.82h12.32A2 2 0 0 0 18 18L14 8V2"/>
      <line x1="6" y1="2" x2="18" y2="2"/>
    </svg>
  ),
  headset: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  ),
};

export function QuickActions(): ReactElement {
  return (
    <div className="wc-card" style={{ padding: "var(--space-6)" }}>
      <h2 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>
        Quick Actions
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
        {patientMeta.quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "var(--space-2)", padding: "var(--space-4)",
              borderRadius: "var(--radius-xl)",
              border: "1.5px solid var(--wc-gray-100)",
              background: "var(--wc-gray-50)", color: "var(--wc-gray-600)",
              cursor: "pointer", fontSize: "10px", fontWeight: 700,
              textAlign: "center", lineHeight: 1.3,
              transition: "all var(--duration-base) var(--ease-out)",
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = "var(--wc-blue-50)"; b.style.borderColor = "var(--wc-blue-200)"; b.style.color = "var(--wc-blue-600)"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = "var(--wc-gray-50)"; b.style.borderColor = "var(--wc-gray-100)"; b.style.color = "var(--wc-gray-600)"; }}
          >
            {QuickIcons[action.icon]}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}