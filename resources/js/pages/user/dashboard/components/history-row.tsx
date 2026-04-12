// resources/js/pages/patient/dashboard/components/history-row.tsx
import type { ReactElement } from "react";
import { AvatarTile }        from "@/pages/doctor/layout/components/avatar-tile";
import { StatusBadge }       from "@/pages/doctor/layout/components/status-badge";
import type { BadgeStatus }  from "@/pages/doctor/layout/components/status-badge";
import type { Appointment, AppointmentStatus } from "../../patient-data";
import { patientMeta }       from "../../patient-data";

const STATUS_MAP: Record<AppointmentStatus, BadgeStatus> = {
  upcoming:  "confirmed",
  completed: "reviewed",
  cancelled: "cancelled",
};

const AVATAR_COLORS = ["#2B59C3", "#8B5CF6", "#16a34a", "#ca8a04", "#F97316"];

interface Props { appt: Appointment; isLast: boolean; index: number; }

export function HistoryRow({ appt, isLast, index }: Props): ReactElement {
  const initials = appt.doctor.replace("Dr. ", "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const color    = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-4)",
        padding: "var(--space-4) var(--space-3)",
        borderBottom: isLast ? "none" : "1px solid var(--wc-gray-100)",
        borderRadius: "var(--radius-xl)", cursor: "pointer",
        transition: "background 150ms ease",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--wc-gray-50)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{
        minWidth: 52, textAlign: "center", flexShrink: 0,
        padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-xl)",
        background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-200)",
      }}>
        <p style={{ margin: 0, fontSize: "10px", fontWeight: 800, color: "#64748b", letterSpacing: "0.04em" }}>
          {appt.date.split(" ")[1]}
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
          {appt.date.split(" ")[0]}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: 0 }}>
        <AvatarTile initials={initials} color={color} size={36} shape="circle" />
        <div>
          <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: 600, color: "#0f172a" }}>{appt.doctor}</p>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#64748b" }}>{appt.specialty} · {appt.time}</p>
        </div>
      </div>

      <StatusBadge status={STATUS_MAP[appt.status]} label={patientMeta.statusLabels[appt.status]} />
    </div>
  );
}