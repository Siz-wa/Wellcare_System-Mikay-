// resources/js/pages/user/my-schedule/components/full-schedule-card.tsx

import type { ReactElement }                     from "react";
import { SCHEDULE_APPOINTMENTS, SCHEDULE_META }  from "../my-schedule-data";
import type { ScheduleAppointment, SchedStatus } from "../my-schedule-data";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<SchedStatus, { label: string; bg: string; color: string; border: string }> = {
  confirmed: { label: "CONFIRMED", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  pending:   { label: "PENDING",   bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  cancelled: { label: "CANCELLED", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

function StatusBadge({ status }: { status: SchedStatus }): ReactElement {
  const cfg = STATUS_CFG[status];
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "var(--space-1) var(--space-3)",
      borderRadius:  "var(--radius-lg)",
      background:    cfg.bg,
      color:         cfg.color,
      border:        `1px solid ${cfg.border}`,
      fontSize:      "var(--text-xs)",
      fontWeight:    700,
      letterSpacing: "0.06em",
    }}>
      {cfg.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function PatientAvatar({ appt }: { appt: ScheduleAppointment }): ReactElement {
  if (appt.avatarSrc) {
    return (
      <img
        src={appt.avatarSrc}
        alt={appt.name}
        style={{
          width:        44,
          height:       44,
          borderRadius: "var(--radius-full)",
          objectFit:    "cover",
          flexShrink:   0,
          boxShadow:    "var(--shadow-sm)",
        }}
      />
    );
  }
  const initials = appt.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width:          44,
      height:         44,
      borderRadius:   "var(--radius-full)",
      background:     appt.avatarBg,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      color:          "#ffffff",
      fontSize:       "var(--text-xs)",
      fontWeight:     700,
      flexShrink:     0,
      boxShadow:      "var(--shadow-sm)",
    }}>
      {initials}
    </div>
  );
}

// ── Single appointment row ────────────────────────────────────────────────────

function AppointmentRow({ appt, isLast }: { appt: ScheduleAppointment; isLast: boolean }): ReactElement {
  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "var(--space-4)",
        padding:      "var(--space-5) 0",
        borderBottom: isLast ? "none" : "1px solid var(--wc-gray-100)",
        cursor:       "pointer",
        transition:   "background var(--duration-base) var(--ease-out)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background    = "var(--wc-gray-50)";
        el.style.marginInline  = "-24px";
        el.style.paddingInline = "24px";
        el.style.borderRadius  = "var(--radius-xl)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background    = "transparent";
        el.style.marginInline  = "0";
        el.style.paddingInline = "0";
        el.style.borderRadius  = "0";
      }}
    >
      <PatientAvatar appt={appt} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.3 }}>
          {appt.name}
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.3, marginTop: "var(--space-1)" }}>
          {appt.service}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", color: "var(--wc-gray-400)", flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--wc-gray-500)" }}>
          {appt.time}
        </span>
      </div>

      <div style={{ flexShrink: 0 }}>
        <StatusBadge status={appt.status} />
      </div>
    </div>
  );
}

// ── Full Schedule Card ────────────────────────────────────────────────────────

export default function FullScheduleCard(): ReactElement {
  return (
    <div className="wc-card" style={{ padding: "var(--space-6)" }}>
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "var(--space-2)",
      }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
          {SCHEDULE_META.scheduleCardTitle}
        </h2>
        <a
          href={SCHEDULE_META.viewAllHref}
          style={{
            fontSize:       "var(--text-xs)",
            fontWeight:     700,
            color:          "var(--wc-sky-500)",
            textDecoration: "none",
            letterSpacing:  "0.06em",
          }}
        >
          {SCHEDULE_META.viewAllLabel}
        </a>
      </div>

      <div>
        {SCHEDULE_APPOINTMENTS.map((appt, i) => (
          <AppointmentRow
            key={appt.id}
            appt={appt}
            isLast={i === SCHEDULE_APPOINTMENTS.length - 1}
          />
        ))}
      </div>
    </div>
  );
}