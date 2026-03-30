// resources/js/pages/user/dashboard/components/shared.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Small shared helpers: icon-map resolvers + StatusBadge.
// Imported by Sidebar, StatCards, AppointmentList, etc.

import type { ReactElement } from "react";
import type { NavItem, StatCard, AppointmentStatus } from "../dashboard-data";
import {
  IconDashboard,
  IconAppointments,
  IconPatients,
  IconDoctors,
  IconReports,
  IconSettings,
  IconUsers,
  IconCalendar,
  IconStar,
  IconTrending,
} from "../icons";

// ── Nav icon resolver ─────────────────────────────────────────────────────────

export function NavIcon({ iconKey }: { iconKey: NavItem["iconKey"] }): ReactElement {
  const map: Record<NavItem["iconKey"], ReactElement> = {
    dashboard:    <IconDashboard />,
    appointments: <IconAppointments />,
    patients:     <IconPatients />,
    doctors:      <IconDoctors />,
    reports:      <IconReports />,
    settings:     <IconSettings />,
  };
  return map[iconKey];
}

// ── Stat icon resolver ────────────────────────────────────────────────────────

export function StatIcon({ iconKey }: { iconKey: StatCard["iconKey"] }): ReactElement {
  const map: Record<StatCard["iconKey"], ReactElement> = {
    users:    <IconUsers />,
    calendar: <IconCalendar />,
    star:     <IconStar />,
    trending: <IconTrending />,
  };
  return map[iconKey];
}

// ── Status badge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: AppointmentStatus }): ReactElement {
  const config: Record<AppointmentStatus, { label: string; bg: string; color: string }> = {
    confirmed: { label: "Confirmed", bg: "#dcfce7", color: "#15803d" },
    pending:   { label: "Pending",   bg: "#fef9c3", color: "#a16207" },
    cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#b91c1c" },
  };
  const { label, bg, color } = config[status];
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "var(--space-1) var(--space-3)",
      borderRadius:  "var(--radius-full)",
      background:    bg,
      color:         color,
      fontSize:      "var(--text-xs)",
      fontWeight:    700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}