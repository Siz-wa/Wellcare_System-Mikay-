// resources/js/pages/user/dashboard/components/patient-activity.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient Activity card with an inline SVG smooth line chart.

import type { ReactElement }            from "react";
import { patientActivityData, dashboardMeta } from "../dashboard-data";
import { IconArrowRight }               from "../icons";

// ── SVG line chart ────────────────────────────────────────────────────────────

function ActivityChart(): ReactElement {
  const data   = patientActivityData;
  const W      = 640;
  const H      = 200;
  const padX   = 8;
  const padTop = 16;
  const padBot = 32;

  const min = 0;
  const max = 40;

  const toX = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
  const toY = (v: number) => padTop + ((max - v) / (max - min)) * (H - padTop - padBot);

  // Build smooth cubic bezier path
  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX  = (prev.x + curr.x) / 2;
    pathD += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
  }

  // Area fill path (close below)
  const areaD =
    pathD +
    ` L ${points[points.length - 1].x},${H - padBot}` +
    ` L ${points[0].x},${H - padBot} Z`;

  // Y-axis gridlines
  const gridValues = [0, 10, 20, 30, 40];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      style={{ display: "block", overflow: "visible" }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0056b3" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0056b3" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines + labels */}
      {gridValues.map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line
              x1={padX} y1={y} x2={W - padX} y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={0} y={y + 4}
              fontSize="11"
              fill="#94a3b8"
              textAnchor="start"
              fontFamily="var(--font-sans, 'DM Sans')"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="url(#activityGrad)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="#0056b3"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Day labels */}
      {data.map((d, i) => (
        <text
          key={d.day}
          x={toX(i)}
          y={H - 6}
          fontSize="11"
          fill="#94a3b8"
          textAnchor="middle"
          fontFamily="var(--font-sans, 'DM Sans')"
        >
          {d.day}
        </text>
      ))}
    </svg>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function PatientActivity(): ReactElement {
  const meta = dashboardMeta;

  return (
    <div className="wc-card" style={{ padding: "var(--space-6)" }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "var(--space-5)",
      }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
          {meta.patientActivityTitle}
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

      {/* Chart */}
      <div style={{ height: 220 }}>
        <ActivityChart />
      </div>
    </div>
  );
}