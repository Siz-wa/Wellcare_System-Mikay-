// resources/js/pages/patient/dashboard/components/info-row.tsx
import type { ReactElement } from "react";

interface Props { label: string; value: string; accent?: boolean; }

export function InfoRow({ label, value, accent = false }: Props): ReactElement {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "var(--space-3) 0", borderBottom: "1px solid var(--wc-gray-100)",
    }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#94a3b8", flexShrink: 0, marginRight: "var(--space-3)" }}>
        {label}
      </span>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: accent ? "var(--wc-blue-600)" : "#0f172a", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}