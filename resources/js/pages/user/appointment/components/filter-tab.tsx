// resources/js/pages/patient/appointments/components/filter-tab.tsx
import type { ReactElement } from "react";

interface Props {
  label:   string;
  active:  boolean;
  count:   number;
  onClick: () => void;
}

export function FilterTab({ label, active, count, onClick }: Props): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 18px", borderRadius: "var(--radius-full)", border: "none",
        background: active ? "var(--wc-blue-600)" : "transparent",
        color:      active ? "#fff" : "#64748b",
        fontSize:   "var(--text-sm)", fontWeight: active ? 700 : 500,
        cursor: "pointer", transition: "all 180ms ease",
        display: "flex", alignItems: "center", gap: "6px",
      }}
    >
      {label}
      <span style={{
        padding: "1px 7px", borderRadius: "var(--radius-full)",
        background: active ? "rgba(255,255,255,0.25)" : "#f1f5f9",
        color:      active ? "#fff" : "#64748b",
        fontSize: "11px", fontWeight: 700,
      }}>
        {count}
      </span>
    </button>
  );
}