// resources/js/pages/user/my-schedule/my-schedule.tsx
// ─────────────────────────────────────────────────────────────────────────────
// My Schedule page — thin composer.
// Moved from pages/user/my-schedule.tsx into pages/user/my-schedule/my-schedule.tsx.
// Import paths updated to match new folder structure.

import type { ReactElement } from "react";
import { DashboardLayout }   from "../layout/dashboard-layout";
import FullScheduleCard      from "./components/full-schedule-card";
import { SCHEDULE_META }     from "./my-schedule-data";
import { IconPlus }          from "@/pages/user/dashboard/icons";

export default function MySchedulePage(): ReactElement {
  return (
    <DashboardLayout activeId="schedule">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        marginBottom:   "var(--space-8)",
      }}>
        <div>
          <h1 style={{
            margin:        "0 0 var(--space-1)",
            fontSize:      "var(--text-3xl)",
            fontWeight:    800,
            letterSpacing: "-0.03em",
            lineHeight:    1.15,
            color:         "var(--wc-dark)",
          }}>
            {SCHEDULE_META.pageTitle}
          </h1>
          <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
            {SCHEDULE_META.pageSubtitle}
          </p>
        </div>
        <button
          type="button"
          className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
        >
          <IconPlus />
          New Appointment
        </button>
      </div>

      {/* ── Full schedule card ────────────────────────────────────────────── */}
      <FullScheduleCard />

    </DashboardLayout>
  );
}