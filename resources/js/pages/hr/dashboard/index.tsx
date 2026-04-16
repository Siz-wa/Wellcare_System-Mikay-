// resources/js/pages/hr/dashboard/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HR Dashboard — overview page.
// Route: GET /hr/dashboard → Inertia::render('hr/dashboard/index')

import { useState, useEffect, type ReactElement } from "react";
import { Link }              from "@inertiajs/react";
import { HrLayout }          from "../layout/hr-layout";
import { HrStatCards }       from "./components/hr-stat-cards";
import { RecentApplications } from "./components/recent-applications";
import { hrMeta, mockHmoApplications, getLoaStats } from "../hr-data";

function useMounted(delay = 0) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show;
}

export default function HrDashboardPage(): ReactElement {
  const headerShow = useMounted(0);
  const stats      = getLoaStats(mockHmoApplications);

  return (
    <HrLayout activeId="dashboard">

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
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            {hrMeta.dashboardTitle}
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "var(--text-base)" }}>
            {hrMeta.dashboardSubtitle}
          </p>
        </div>

        {/* Pending badge + quick action */}
        {stats.pending > 0 && (
          <Link
            href="/hr/hmo-applications"
            className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Review {stats.pending} Pending
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <HrStatCards />

      {/* Recent applications table */}
      <RecentApplications />

    </HrLayout>
  );
}