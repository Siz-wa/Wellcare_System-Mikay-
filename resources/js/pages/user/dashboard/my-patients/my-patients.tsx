// resources/js/pages/user/my-patients.tsx
import type { ReactElement } from "react";
import { Link, Head }        from "@inertiajs/react";
import { DashboardLayout }   from "../layout/dashboard-layout"; 
import { PatientListCard }   from "../my-patients/components/patient-list-card";
import { myPatientsMeta }    from "./my-patient-data";

// ── Icon ─────────────────────────────────────────────────────────────────────
function IconChevronLeft(): ReactElement {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

export default function MyPatientsPage(): ReactElement {
  const meta = myPatientsMeta;

  return (
    <DashboardLayout activeId="patients">
      <Head title={meta.pageTitle} />

      <div style={{ marginBottom: "var(--space-8)" }}>
        <Link
          href="/dashboard"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "var(--space-2)",
            marginBottom:   "var(--space-4)",
            fontSize:       "var(--text-xs)",
            fontWeight:     700,
            color:          "var(--wc-gray-400)",
            textDecoration: "none",
            textTransform:  "uppercase",
            letterSpacing:  "0.05em",
          }}
        >
          <IconChevronLeft />
          {meta.backLabel}
        </Link>

        <h1 style={{
          margin:        "0 0 var(--space-1)",
          fontSize:      "var(--text-3xl)",
          fontWeight:    800,
          letterSpacing: "-0.03em",
          lineHeight:    1.15,
          color:         "var(--wc-dark)",
          fontFamily:    "var(--font-display, 'Bricolage Grotesque')",
        }}>
          {meta.pageTitle}
        </h1>
        <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
          {meta.pageSubtitle}
        </p>
      </div>

      <PatientListCard />
    </DashboardLayout>
  );
}