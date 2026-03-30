// resources/js/pages/user/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard page — lean entry point.
// All layout is delegated to DashboardLayout; all sections are self-contained.

import type { ReactElement } from "react";
import { dashboardMeta }     from "./dashboard-data";
import { DashboardLayout }   from "./dashboard-layout";
import { StatCards }         from "./components/stat-cards";
import { AppointmentList }   from "./components/appointment-list";
import { ClinicActivity }    from "./components/clinic-activity";
import { UpgradeCard }       from "./components/upgrade-card";
import { IconPlus }          from "./icons";

export default function DashboardPage(): ReactElement {
  const meta = dashboardMeta;

  return (
    <DashboardLayout>

      {/* Page header */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        marginBottom:   "var(--space-8)",
      }}>
        <div>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            {meta.greeting}{" "}
            <span style={{
              background:            "linear-gradient(135deg, var(--wc-blue-600), var(--wc-sky-500))",
              WebkitBackgroundClip:  "text",
              WebkitTextFillColor:   "transparent",
              backgroundClip:        "text",
            }}>
              {meta.greetingName}
            </span>
          </h1>
          <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
            {meta.subtitle}
          </p>
        </div>

        <button
          type="button"
          className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
        >
          <IconPlus />
          {meta.newAppointmentLabel}
        </button>
      </div>

      {/* Stat cards */}
      <StatCards />

      {/* Bottom two-column grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 340px",
        gap:                 "var(--space-5)",
        alignItems:          "start",
      }}>
        {/* Left: Today's Appointments */}
        <AppointmentList />

        {/* Right: Activity + Upgrade */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <ClinicActivity />
          <UpgradeCard />
        </div>
      </div>

    </DashboardLayout>
  );
}