// resources/js/pages/patient/vitals/components/last-recorded-card.tsx
import type { ReactElement } from "react";

const ENTRIES = [
  { label: "Blood Pressure",  date: "April 15, 2026", by: "Dr. Ana Reyes"    },
  { label: "Weight & Height", date: "April 15, 2026", by: "Nurse on duty"    },
  { label: "BMI Computed",    date: "April 15, 2026", by: "System auto-calc" },
];

interface Props { visible: boolean; }

export function LastRecordedCard({ visible }: Props): ReactElement {
  return (
    <div className="wc-card" style={{
      padding: "var(--space-6)",
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1) 440ms, transform 420ms cubic-bezier(0.16,1,0.3,1) 440ms",
    }}>
      <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>
        Last Recorded
      </h2>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ENTRIES.map((r, i) => (
          <div key={r.label} style={{ padding: "var(--space-3) 0", borderBottom: i < ENTRIES.length - 1 ? "1px solid var(--wc-gray-100)" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: 600, color: "#0f172a" }}>{r.label}</p>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>by {r.by}</p>
            </div>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#64748b", flexShrink: 0 }}>{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}