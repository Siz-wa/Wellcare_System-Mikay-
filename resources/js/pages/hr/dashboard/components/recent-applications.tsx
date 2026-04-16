// resources/js/pages/hr/dashboard/components/recent-applications.tsx
import type { ReactElement }    from "react";
import { Link }                  from "@inertiajs/react";
import { mockHmoApplications }  from "../../hr-data";

const STATUS_CONFIG = {
  pending:  { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", label: "PENDING"  },
  approved: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "APPROVED" },
  rejected: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "REJECTED" },
};

const AVATAR_COLORS = ["#0056b3", "#7c3aed", "#16a34a", "#ca8a04", "#0284c7", "#c2410c"];

export function RecentApplications(): ReactElement {
  // Show the 5 most recent, prioritising pending
  const sorted = [...mockHmoApplications].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return 0;
  }).slice(0, 5);

  return (
    <div className="wc-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-6) var(--space-6) var(--space-4)" }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>
            Recent Applications
          </h2>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>
            Latest HMO LOA submissions
          </p>
        </div>
        <Link
          href="/hr/hmo-applications"
          style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-sky-500)", textDecoration: "none" }}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-blue-600)")}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-sky-500)")}
        >
          View All →
        </Link>
      </div>

      {/* Rows */}
      {sorted.map((app, i) => {
        const cfg = STATUS_CONFIG[app.status];
        return (
          <div
            key={app.id}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "var(--space-4)",
              padding:      "var(--space-4) var(--space-6)",
              borderTop:    "1px solid var(--wc-gray-100)",
              transition:   "background 150ms ease",
              cursor:       "default",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--wc-gray-50)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {/* Avatar */}
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0 }}>
              {app.initials}
            </div>

            {/* Patient + HMO */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {app.patientName}
              </p>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#64748b" }}>
                {app.hmoProvider} · {app.doctor}
              </p>
            </div>

            {/* Date */}
            <span style={{ fontSize: "var(--text-xs)", color: "#94a3b8", flexShrink: 0 }}>
              {app.submittedDate}
            </span>

            {/* Status badge */}
            <span style={{ display: "inline-flex", alignItems: "center", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-lg)", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap", flexShrink: 0 }}>
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}