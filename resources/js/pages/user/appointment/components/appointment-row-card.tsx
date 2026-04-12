// resources/js/pages/patient/appointments/components/appointment-row-card.tsx
import type { ReactElement }    from "react";
import { useState }             from "react";
import { AvatarTile }           from "@/pages/doctor/layout/components/avatar-tile";
import { StatusBadge }          from "@/pages/doctor/layout/components/status-badge";
import type { BadgeStatus }     from "@/pages/doctor/layout/components/status-badge";
import type { Appointment, AppointmentStatus } from "../../patient-data";
import { patientMeta }          from "../../patient-data";

const STATUS_MAP: Record<AppointmentStatus, BadgeStatus> = {
  upcoming: "confirmed", completed: "reviewed", cancelled: "cancelled",
};
const AVATAR_COLORS = ["#2B59C3", "#8B5CF6", "#16a34a", "#ca8a04", "#F97316"];

interface Props { appt: Appointment; index: number; visible: boolean; }

export function AppointmentRowCard({ appt, index, visible }: Props): ReactElement {
  const [hovered, setHovered] = useState(false);
  const delay    = 160 + index * 70;
  const initials = appt.doctor.replace("Dr. ", "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const color    = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-5)",
        padding: "var(--space-5) var(--space-6)",
        background:   hovered ? "#f8fafc" : "#fff",
        borderRadius: "var(--radius-3xl)",
        border:       hovered ? "1px solid #e2e8f0" : "1px solid #f1f5f9",
        boxShadow:    hovered ? "0 4px 12px -2px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.04)",
        cursor: "pointer",
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 400ms cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     transform 400ms cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     background 150ms ease, border 150ms ease, box-shadow 150ms ease`,
      }}
    >
      {/* Date chip */}
      <div style={{ minWidth: 60, textAlign: "center", flexShrink: 0, padding: "var(--space-3)", borderRadius: "var(--radius-xl)", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <p style={{ margin: 0, fontSize: "10px",  fontWeight: 800, color: "#64748b", letterSpacing: "0.06em" }}>{appt.date.split(" ")[1]}</p>
        <p style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>{appt.date.split(" ")[0]}</p>
        <p style={{ margin: 0, fontSize: "10px",  fontWeight: 600, color: "#94a3b8" }}>{appt.date.split(" ")[2]}</p>
      </div>

      {/* Doctor info */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flex: 1, minWidth: 0 }}>
        <AvatarTile initials={initials} color={color} size={44} shape="rounded" />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 3px", fontSize: "var(--text-base)", fontWeight: 700, color: "#0f172a" }}>{appt.doctor}</p>
          <p style={{ margin: "0 0 3px", fontSize: "var(--text-sm)", color: "#475569" }}>{appt.specialty}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>{appt.time}</span>
            <span style={{ color: "#e2e8f0" }}>·</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>{appt.location}</span>
          </div>
        </div>
      </div>

      {/* Status + action */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexShrink: 0 }}>
        <StatusBadge status={STATUS_MAP[appt.status]} label={patientMeta.statusLabels[appt.status]} />
        {appt.status === "upcoming" && (
          <button
            style={{ padding: "6px 16px", borderRadius: "var(--radius-full)", border: "1.5px solid var(--wc-blue-200)", background: "var(--wc-blue-50)", color: "var(--wc-blue-600)", fontSize: "var(--text-xs)", fontWeight: 700, cursor: "pointer", transition: "all 150ms ease" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-blue-600)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-blue-50)";  (e.currentTarget as HTMLButtonElement).style.color = "var(--wc-blue-600)"; }}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}