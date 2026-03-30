// resources/js/pages/user/dashboard/components/AppointmentList.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Today's appointment list with avatar, service, time, and status badge.

import type { ReactElement }        from "react";
import { todayAppointments, dashboardMeta } from "../dashboard-data";
import type { TodayAppointment }    from "../dashboard-data";
import { StatusBadge }              from "./shared";
import { IconClock, IconArrowRight } from "../icons";

// ── Single row ────────────────────────────────────────────────────────────────

function AppointmentRow({ appt }: { appt: TodayAppointment }): ReactElement {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "var(--space-4)",
      padding:      "var(--space-4) 0",
      borderBottom: "1px solid var(--wc-gray-100)",
    }}>
      {/* Avatar */}
      <div style={{
        width:          40,
        height:         40,
        borderRadius:   "var(--radius-full)",
        background:     appt.color,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          "#ffffff",
        fontSize:       "var(--text-xs)",
        fontWeight:     700,
        flexShrink:     0,
      }}>
        {appt.initials}
      </div>

      {/* Name + service */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.3 }}>
          {appt.name}
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.3 }}>
          {appt.service}
        </p>
      </div>

      {/* Time */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", color: "var(--wc-gray-400)", fontSize: "var(--text-xs)", flexShrink: 0 }}>
        <IconClock />
        {appt.time}
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <StatusBadge status={appt.status} />
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function AppointmentList(): ReactElement {
  const meta = dashboardMeta;

  return (
    <div className="wc-card" style={{ padding: "var(--space-6)" }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "var(--space-2)",
      }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
          {meta.todayAppointmentsTitle}
        </h2>
        <a
          href="/appointments"
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "var(--space-1)",
            fontSize:       "var(--text-sm)",
            fontWeight:     600,
            color:          "var(--wc-sky-500)",
            textDecoration: "none",
          }}
        >
          {meta.viewAll} <IconArrowRight />
        </a>
      </div>

      {/* Rows */}
      <div>
        {todayAppointments.map((appt) => (
          <AppointmentRow key={appt.id} appt={appt} />
        ))}
      </div>
    </div>
  );
}