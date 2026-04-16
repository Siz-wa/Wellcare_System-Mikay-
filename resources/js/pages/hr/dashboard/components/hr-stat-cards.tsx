// resources/js/pages/hr/dashboard/components/hr-stat-cards.tsx
import { useState, useEffect, type ReactElement } from "react";
import { mockHmoApplications, hrMeta, getLoaStats } from "../../hr-data";

function useMounted(delay = 0) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show;
}

const STAT_ICONS: Record<string, ReactElement> = {
  pending: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  approved: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  rejected: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  total: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

export function HrStatCards(): ReactElement {
  const stats   = getLoaStats(mockHmoApplications);
  const visible = useMounted(60);

  const values: Record<string, number> = {
    pending:  stats.pending,
    approved: stats.approved,
    rejected: stats.rejected,
    total:    stats.total,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-5)", marginBottom: "var(--space-6)" }}>
      {hrMeta.statCards.map((card, i) => (
        <div
          key={card.id}
          className="wc-card"
          style={{
            padding:    "var(--space-6)",
            position:   "relative",
            overflow:   "hidden",
            opacity:    visible ? 1 : 0,
            transform:  visible ? "translateY(0)" : "translateY(20px)",
            transition: `opacity 420ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, transform 420ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
            cursor:     "default",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.transform  = "translateY(-3px)";
            (e.currentTarget as HTMLDivElement).style.boxShadow  = `0 16px 32px -8px ${card.colorAccent}33`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.transform  = "translateY(0)";
            (e.currentTarget as HTMLDivElement).style.boxShadow  = "";
          }}
        >
          {/* Glow */}
          <div style={{ position: "absolute", right: -20, top: -20, width: 96, height: 96, backgroundColor: card.colorAccent, borderRadius: 9999, filter: "blur(24px)", opacity: 0.08, pointerEvents: "none" }} />

          {/* Icon */}
          <div style={{ width: 52, height: 52, backgroundColor: card.colorAccent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: "var(--space-5)", boxShadow: `0 8px 16px -4px ${card.colorAccent}55` }}>
            {STAT_ICONS[card.id]}
          </div>

          {/* Value */}
          <div style={{ fontSize: "2.25rem", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: "var(--space-2)" }}>
            {values[card.id]}
          </div>

          {/* Label */}
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "#64748b" }}>
            {card.label}
          </p>

          {/* Bottom accent bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: card.colorAccent, borderRadius: "0 0 var(--radius-xl) var(--radius-xl)", opacity: 0.6 }} />
        </div>
      ))}
    </div>
  );
}