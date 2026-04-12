// resources/js/pages/user/vitals/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// My Vitals — dedicated page.
// Route: /user/vitals → inertia('user/vitals/index')

import type { ReactElement }   from "react";
import { useEffect, useState } from "react";
import { DashboardLayout }     from "@/pages/doctor/layout/dashboard-layout";
import { patientNavGroups, patientTopbarMeta } from "../patient-nav-data";
import { PATIENT_ICON_MAP }    from "../constants/patient-icons";
import { mockVitals, patientMeta } from "../patient-data";
import { VitalStatCard }       from "./components/vital-stat-card";
import { ReferenceRangesCard } from "./components/reference-ranges-card";
import { LastRecordedCard }    from "./components/last-recorded-card";

function useMounted(delay = 0) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show;
}

export default function MyVitalsPage(): ReactElement {
  const headerShow = useMounted(0);
  const cardsShow  = useMounted(100);
  const detailShow = useMounted(200);

  return (
    <DashboardLayout
      activeId="vitals"
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
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "#0f172a" }}>
            {patientMeta.vitalsTitle}
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "var(--text-base)" }}>
            {patientMeta.vitalsSubtitle}
          </p>
        </div>
        <button
          type="button"
          className="wc-btn wc-btn-outline wc-btn-md wc-btn-pill"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {patientMeta.viewRecordsLabel}
        </button>
      </div>

      {/* 4-column stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-5)", marginBottom: "var(--space-5)" }}>
        {mockVitals.map((v, i) => (
          <VitalStatCard key={v.id} vital={v} visible={cardsShow} index={i} />
        ))}
      </div>

      {/* Detail row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--space-5)", alignItems: "start" }}>
        <ReferenceRangesCard visible={detailShow} />
        <LastRecordedCard    visible={detailShow} />
      </div>
    </DashboardLayout>
  );
}