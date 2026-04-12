// resources/js/pages/patient/dashboard/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient Dashboard page — thin composer. Uses DashboardLayout ONCE.
// All content comes from small, maintainable component files.
//
// Route: /patient/dashboard → inertia('patient/dashboard/index')

import type { ReactElement }   from "react";
import { useEffect, useState } from "react";
import { DashboardLayout }     from "@/pages/doctor/layout/dashboard-layout";
import { patientNavGroups, patientTopbarMeta } from "../patient-nav-data";
import { PATIENT_ICON_MAP }    from "../constants/patient-icons";
import { patientMeta }         from "../patient-data";
import { AppointmentsSummary } from "../dashboard/components/apppointments-summary";
import { ProfileSidebar }      from "../dashboard/components/profile-sidebar";

function useMounted(delay = 0) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show;
}

export default function PatientDashboardPage(): ReactElement {
  const headerShow  = useMounted(0);
  const contentShow = useMounted(120);

  return (
    <DashboardLayout
      activeId="dashboard"
      navGroups={patientNavGroups}
      iconMap={PATIENT_ICON_MAP}
      userMeta={patientTopbarMeta}
      avatarColor="var(--wc-sky-500)"
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: "var(--space-8)",
        opacity:    headerShow ? 1 : 0,
        transform:  headerShow ? "translateY(0)" : "translateY(14px)",
        transition: "opacity 380ms cubic-bezier(0.16,1,0.3,1), transform 380ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            My Health,{" "}
            <span style={{ background: "linear-gradient(135deg, var(--wc-blue-600), var(--wc-sky-500))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {patientMeta.greetingName}
            </span>
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "var(--text-base)" }}>{patientMeta.pageSubtitle}</p>
        </div>
        <button
          type="button"
          className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.02)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="12" y1="14" x2="12" y2="20"/><line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
          {patientMeta.bookAppointmentLabel}
        </button>
      </div>

      {/* Two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--space-5)", alignItems: "start" }}>
        <AppointmentsSummary visible={contentShow} />
        <ProfileSidebar      visible={contentShow} />
      </div>
    </DashboardLayout>
  );
}