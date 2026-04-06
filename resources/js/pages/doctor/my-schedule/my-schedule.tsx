// resources/js/pages/user/my-schedule/my-schedule.tsx
// ─────────────────────────────────────────────────────────────────────────────
// My Schedule page — matches the exact design from the reference images.

import type { ReactElement }    from "react";
import { DashboardLayout }      from "../layout/dashboard-layout";
import FullScheduleCard         from "./components/full-schedule-card";
import ScheduleOverviewCard     from "./components/schedule-overview-card";
import { SCHEDULE_META, SCHEDULE_STATS } from "./my-schedule-data";
import type { StatCard }        from "./my-schedule-data";
import { IconPlus }             from "@/pages/doctor/icons";

// ── Stat card icons (one per card, matching image colors) ─────────────────────

function StatIcon({ index, color }: { index: number; color: string }): ReactElement {
  // 0 = calendar, 1 = people, 2 = clock/timer, 3 = check-circle
  const icons = [
    // Calendar
    <svg key="cal" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>,
    // People / users
    <svg key="ppl" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>,
    // Clock / timer
    <svg key="clk" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>,
    // Check circle
    <svg key="chk" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>,
  ];
  return icons[index] ?? icons[0];
}

// ── Single stat card ──────────────────────────────────────────────────────────

function StatCardItem({ card, index }: { card: StatCard; index: number }): ReactElement {
  return (
    <div
      className="wc-card"
      style={{
        padding:        "var(--space-5) var(--space-6)",
        display:        "flex",
        alignItems:     "center",
        gap:            "var(--space-4)",
        flex:           1,
        minWidth:       0,
      }}
    >
      {/* Icon box */}
      <div style={{
        width:          48,
        height:         48,
        borderRadius:   "var(--radius-xl)",
        background:     card.iconBg,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        <StatIcon index={index} color={card.iconColor} />
      </div>

      {/* Text */}
      <div>
        <p style={{
          margin:        0,
          fontSize:      "var(--text-xs)",
          fontWeight:    700,
          color:         "var(--wc-gray-400)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          lineHeight:    1,
          marginBottom:  "var(--space-1)",
        }}>
          {card.label}
        </p>
        <p style={{
          margin:     0,
          fontSize:   "var(--text-2xl)",
          fontWeight: 800,
          color:      "var(--wc-dark)",
          lineHeight: 1.1,
        }}>
          {card.value}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MySchedulePage(): ReactElement {
  return (
    <DashboardLayout activeId="schedule">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        marginBottom:   "var(--space-8)",
      }}>
        <div>
          {/* Back arrow */}
          <a
            href={SCHEDULE_META.backHref}
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              marginBottom:   "var(--space-2)",
              color:          "var(--wc-gray-400)",
              textDecoration: "none",
              transition:     "color 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-blue-600)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-gray-400)"; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </a>

          <h1 style={{
            margin:        "0 0 var(--space-1)",
            fontSize:      "var(--text-3xl)",
            fontWeight:    800,
            letterSpacing: "-0.03em",
            lineHeight:    1.15,
            color:         "var(--wc-dark)",
          }}>
            {SCHEDULE_META.pageTitle}
          </h1>
          <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
            {SCHEDULE_META.pageSubtitle}
          </p>
        </div>

        <button
          type="button"
          className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
        >
          <IconPlus />
          New Appointment
        </button>
      </div>

      {/* ── Stat cards row ────────────────────────────────────────────────── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap:                 "var(--space-5)",
        marginBottom:        "var(--space-6)",
      }}>
        {SCHEDULE_STATS.map((card, i) => (
          <StatCardItem key={card.label} card={card} index={i} />
        ))}
      </div>

      {/* ── Two-column layout: schedule list + sidebar ────────────────────── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 360px",
        gap:                 "var(--space-5)",
        alignItems:          "start",
      }}>
        <FullScheduleCard />
        <ScheduleOverviewCard />
      </div>

    </DashboardLayout>
  );
}