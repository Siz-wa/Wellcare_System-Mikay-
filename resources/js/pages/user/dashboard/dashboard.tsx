// resources/js/pages/user/dashboard/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard page — thin composer. Uses shared DashboardLayout.

import type { ReactElement }   from "react";
import { DashboardLayout }     from "./layout/dashboard-layout";
import { dashboardMeta }       from "./dashboard-data";
import { StatCards }           from "./components/stat-cards";
import { PatientActivity }     from "./components/patient-activity";
import { ClinicWorkflow }      from "./components/clinic-workflow";
import { AppointmentList }     from "./components/appointment-list";
import { PendingLabReviews }   from "./components/pending-lab-reviews";
import { IconPlus }            from "./icons";

export default function DashboardPage(): ReactElement {
  const meta = dashboardMeta;

  return (
    <DashboardLayout activeId="dashboard">

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
          }}>
            {meta.greeting}{" "}
            <span style={{
              background:           "linear-gradient(135deg, var(--wc-blue-600), var(--wc-sky-500))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              backgroundClip:       "text",
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

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <StatCards />

      {/* ── Row 1: Patient Activity + Clinic Workflow ────────────────────── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 380px",
        gap:                 "var(--space-5)",
        alignItems:          "start",
        marginBottom:        "var(--space-5)",
      }}>
        <PatientActivity />
        <ClinicWorkflow />
      </div>

      {/* ── Row 2: Today's Appointments + Pending Lab Reviews ────────────── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 380px",
        gap:                 "var(--space-5)",
        alignItems:          "start",
      }}>
        <AppointmentList />
        <PendingLabReviews />
      </div>

    </DashboardLayout>
  );
}