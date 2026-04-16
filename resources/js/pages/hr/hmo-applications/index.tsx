// resources/js/pages/hr/hmo-applications/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HMO Applications page — core HR workflow.
// HR reviews LOA requests and approves or rejects each one.
//
// Route: GET /hr/hmo-applications → Inertia::render('hr/hmo-applications/index')

import { useState, useEffect, type ReactElement } from "react";
import { HrLayout }           from "../layout/hr-layout";
import { ApplicationsTable }  from "./components/applications-table";
import { hrMeta, mockHmoApplications } from "../hr-data";

function useMounted(delay = 0) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show;
}

export default function HmoApplicationsPage(): ReactElement {
  const headerShow = useMounted(0);
  const bodyShow   = useMounted(80);

  const pendingCount = mockHmoApplications.filter(a => a.status === "pending").length;

  return (
    <HrLayout activeId="hmo-applications">

      {/* Page header */}
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
            {hrMeta.hmoPageTitle}
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "var(--text-base)" }}>
            {hrMeta.hmoPageSubtitle}
          </p>
        </div>

        {/* Pending indicator */}
        {pendingCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-5)", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "var(--radius-xl)", flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "#c2410c" }}>
              {pendingCount} application{pendingCount !== 1 ? "s" : ""} awaiting review
            </span>
          </div>
        )}
      </div>

      {/* Applications table */}
      <ApplicationsTable
        applications={mockHmoApplications}
        visible={bodyShow}
      />

    </HrLayout>
  );
}