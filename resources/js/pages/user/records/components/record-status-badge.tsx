// resources/js/pages/patient/records/components/record-status-badge.tsx
import type { ReactElement } from "react";
import type { RecordStatus } from "../../patient-data";

interface Props { status: RecordStatus; }

const CONFIG: Record<RecordStatus, { bg: string; color: string; border: string }> = {
  normal:   { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  reviewed: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  critical: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  pending:  { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
};

export function RecordStatusBadge({ status }: Props): ReactElement {
  const { bg, color, border } = CONFIG[status];
  const labels: Record<RecordStatus, string> = {
    normal: "Normal", reviewed: "Reviewed", critical: "Critical", pending: "Pending",
  };

  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "var(--space-1) var(--space-3)",
      borderRadius:  "var(--radius-lg)",
      background:    bg,
      color,
      border:        `1px solid ${border}`,
      fontSize:      "var(--text-xs)",
      fontWeight:    700,
      letterSpacing: "0.06em",
      whiteSpace:    "nowrap",
    }}>
      {labels[status]}
    </span>
  );
}