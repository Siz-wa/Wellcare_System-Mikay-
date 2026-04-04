// resources/js/pages/user/dashboard/components/stat-cards.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Responsive 4-column stat card grid.

import type { ReactElement } from "react";
import { statCards }         from "../dashboard-data";
import type { StatCard }     from "../dashboard-data";
import { StatIcon }          from "../icons/index";

// ── Single card ───────────────────────────────────────────────────────────────

function StatCardItem({ card }: { card: StatCard }): ReactElement {
  return (
    <div className="wc-card" style={{ padding: "var(--space-5)" }}>
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        marginBottom:   "var(--space-4)",
      }}>
        {/* Icon tile */}
        <div style={{
          width:          52,
          height:         52,
          borderRadius:   "var(--radius-xl)",
          background:     card.iconBg,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          color:          card.iconColor,
          flexShrink:     0,
        }}>
          <StatIcon iconKey={card.iconKey} />
        </div>

        {/* Delta badge */}
        <span style={{
          display:      "inline-flex",
          alignItems:   "center",
          gap:          "var(--space-1)",
          padding:      "var(--space-1) var(--space-2)",
          borderRadius: "var(--radius-full)",
          background:   card.positive ? "#dcfce7" : "#fee2e2",
          color:        card.positive ? "#15803d"  : "#b91c1c",
          fontSize:     "var(--text-xs)",
          fontWeight:   700,
        }}>
          {card.delta}
        </span>
      </div>

      <p style={{
        margin:     "0 0 var(--space-1)",
        fontSize:   "var(--text-xs)",
        color:      "var(--wc-gray-500)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        {card.label}
      </p>
      <p style={{
        margin:        0,
        fontSize:      "var(--text-3xl)",
        fontWeight:    800,
        color:         "var(--wc-dark)",
        fontFamily:    "var(--font-display)",
        letterSpacing: "-0.03em",
        lineHeight:    1,
      }}>
        {card.value}
      </p>
    </div>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────────

export function StatCards(): ReactElement {
  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap:                 "var(--space-5)",
      marginBottom:        "var(--space-8)",
    }}>
      {statCards.map((card) => (
        <StatCardItem key={card.id} card={card} />
      ))}
    </div>
  );
}