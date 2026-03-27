// resources/js/pages/user/dashboard/components/ClinicActivity.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Clinic activity feed with colored dot timeline.

import type { ReactElement }      from "react";
import { activityItems, dashboardMeta } from "../dashboard-data";
import type { ActivityItem }      from "../dashboard-data";
import { IconArrowRight }         from "../icons";

// ── Single row ────────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }): ReactElement {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "var(--space-3)",
      padding:      "var(--space-3) 0",
      borderBottom: "1px solid var(--wc-gray-100)",
    }}>
      <span style={{
        width:        8,
        height:       8,
        borderRadius: "var(--radius-full)",
        background:   item.dotColor,
        flexShrink:   0,
        marginTop:    1,
      }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--wc-dark)", lineHeight: 1.3 }}>
          {item.label}
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
          {item.time}
        </p>
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function ClinicActivity(): ReactElement {
  const meta = dashboardMeta;

  return (
    <div className="wc-card" style={{ padding: "var(--space-6)" }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "var(--space-2)",
      }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
          {meta.activityTitle}
        </h2>
        <a
          href="/reports"
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "var(--space-1)",
            fontSize:       "var(--text-sm)",
            fontWeight:     600,
            color:          "var(--wc-sky-500)",
            textDecoration: "none",
          }}
        >
          {meta.viewAll} <IconArrowRight />
        </a>
      </div>

      {/* Rows */}
      {activityItems.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}