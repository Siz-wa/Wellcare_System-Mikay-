// resources/js/pages/patient/doctors/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// My Doctors page — thin composer. Mirrors records/index.tsx structure.
//
// Route: GET /user/doctors → Inertia::render('patient/doctors/index')

import type { ReactElement }   from "react";
import { useEffect, useState } from "react";
import { DashboardLayout }     from "@/pages/doctor/layout/dashboard-layout";
import { patientNavGroups, patientTopbarMeta } from "../patient-nav-data";
import { PATIENT_ICON_MAP }    from "../constants/patient-icons";
import { patientMeta }         from "../patient-data";
import { DoctorsGrid }         from "./components/doctors-grid";

function useMounted(delay = 0) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show;
}

export default function MyDoctorsPage(): ReactElement {
  const headerShow = useMounted(0);
  const bodyShow   = useMounted(100);

  return (
    <DashboardLayout
      activeId="doctors"
      navGroups={patientNavGroups}
      iconMap={PATIENT_ICON_MAP}
      userMeta={patientTopbarMeta}
      avatarColor="var(--wc-sky-500)"
    >
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        marginBottom:   "var(--space-8)",
        opacity:        headerShow ? 1 : 0,
        transform:      headerShow ? "translateY(0)" : "translateY(14px)",
        transition:     "opacity 380ms cubic-bezier(0.16,1,0.3,1), transform 380ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "#0f172a" }}>
            {patientMeta.doctorsPageTitle}
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "var(--text-base)" }}>
            {patientMeta.doctorsPageSubtitle}
          </p>
        </div>
      </div>

      {/* ── Doctors grid ──────────────────────────────────────────────── */}
      <DoctorsGrid visible={bodyShow} />

    </DashboardLayout>
  );
}