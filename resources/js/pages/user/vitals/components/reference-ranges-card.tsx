// resources/js/pages/patient/vitals/components/reference-ranges-card.tsx
import type { ReactElement } from "react";

const RANGES = [
  { label: "Blood Pressure",     normal: "90/60 – 120/80 mmHg", current: "118/76 mmHg" },
  { label: "Weight (BMI)",       normal: "18.5 – 24.9 kg/m²",   current: "22.3 kg/m²"  },
  { label: "Resting Heart Rate", normal: "60 – 100 bpm",         current: "72 bpm"      },
  { label: "Blood Sugar",        normal: "70 – 99 mg/dL",        current: "95 mg/dL"    },
];

interface Props { visible: boolean; }

export function ReferenceRangesCard({ visible }: Props): ReactElement {
  return (
    <div className="wc-card" style={{
      padding: "var(--space-6)",
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1) 360ms, transform 420ms cubic-bezier(0.16,1,0.3,1) 360ms",
    }}>
      <h2 style={{ margin: "0 0 var(--space-5)", fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>
        Reference Ranges
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {RANGES.map(r => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-5)", background: "#f8fafc", borderRadius: "var(--radius-2xl)", border: "1px solid #f1f5f9" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: 700, color: "#0f172a" }}>{r.label}</p>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>Normal: {r.normal}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "#0f172a" }}>{r.current}</span>
              <span style={{ padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: "10px", fontWeight: 800, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                NORMAL
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}