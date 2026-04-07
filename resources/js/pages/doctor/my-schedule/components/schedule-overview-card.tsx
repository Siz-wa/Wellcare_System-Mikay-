// resources/js/pages/user/my-schedule/components/schedule-overview-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Right sidebar: "Schedule Overview" (daily progress) + "Quick Tasks"

import { useState }                                          from "react";
import type { ReactElement }                                 from "react";
import { SCHEDULE_OVERVIEW, QUICK_TASKS }                    from "../my-schedule-data";
import type { QuickTask }                                    from "../my-schedule-data";

// ── Quick task row ────────────────────────────────────────────────────────────

function QuickTaskRow({ task, isLast, onToggle }: {
  task:     QuickTask;
  isLast:   boolean;
  onToggle: (id: string) => void;
}): ReactElement {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "var(--space-3)",
      padding:      "var(--space-4) 0",
      borderBottom: isLast ? "none" : "1px solid var(--wc-gray-100)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin:          0,
          fontSize:        "var(--text-sm)",
          fontWeight:      600,
          color:           task.done ? "var(--wc-gray-400)" : "var(--wc-dark)",
          lineHeight:      1.3,
          textDecoration:  task.done ? "line-through" : "none",
        }}>
          {task.label}
        </p>
        <p style={{
          margin:     "2px 0 0",
          fontSize:   "var(--text-xs)",
          color:      "var(--wc-gray-400)",
          lineHeight: 1,
        }}>
          {task.time}
        </p>
      </div>

      {/* Checkbox — square, unchecked by default, matches image */}
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        style={{
          flexShrink:    0,
          width:         20,
          height:        20,
          borderRadius:  "4px",
          border:        task.done ? "none" : "1.5px solid var(--wc-gray-300)",
          background:    task.done ? "var(--wc-blue-600)" : "transparent",
          cursor:        "pointer",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          padding:       0,
          transition:    "all 0.15s ease",
        }}
      >
        {task.done && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 6 5 9 10 3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Schedule Overview Card ────────────────────────────────────────────────────

export default function ScheduleOverviewCard(): ReactElement {
  const ov = SCHEDULE_OVERVIEW;
  const [tasks, setTasks] = useState<QuickTask[]>(QUICK_TASKS);

  function toggleTask(id: string): void {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* ── Schedule Overview ─────────────────────────────────────────────── */}
      <div className="wc-card" style={{ padding: "var(--space-6)" }}>
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginBottom:   "var(--space-5)",
        }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
            {ov.title}
          </h2>
          <a
            href={ov.viewAllHref}
            style={{
              fontSize:       "var(--text-xs)",
              fontWeight:     700,
              color:          "var(--wc-sky-500)",
              textDecoration: "none",
              letterSpacing:  "0.06em",
            }}
          >
            {ov.viewAllLabel}
          </a>
        </div>

        {/* Daily Progress */}
        <div>
          <p style={{
            margin:     "0 0 var(--space-3)",
            fontSize:   "var(--text-base)",
            fontWeight: 700,
            color:      "var(--wc-dark)",
          }}>
            {ov.dailyProgressLabel}
          </p>

          {/* Progress bar label row */}
          <div style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            marginBottom:   "var(--space-2)",
          }}>
            <span style={{
              fontSize:      "var(--text-xs)",
              fontWeight:    700,
              color:         "var(--wc-gray-400)",
              letterSpacing: "0.06em",
            }}>
              {ov.completedLabel}
            </span>
            <span style={{
              fontSize:   "var(--text-xs)",
              fontWeight: 700,
              color:      "var(--wc-gray-500)",
            }}>
              {ov.completedPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            width:        "100%",
            height:       8,
            borderRadius: "var(--radius-full)",
            background:   "var(--wc-gray-100)",
            overflow:     "hidden",
            marginBottom: "var(--space-4)",
          }}>
            <div style={{
              height:       "100%",
              width:        `${ov.completedPercent}%`,
              borderRadius: "var(--radius-full)",
              background:   "var(--wc-blue-600)",
            }} />
          </div>

          <p style={{
            margin:     0,
            fontSize:   "var(--text-xs)",
            color:      "var(--wc-gray-500)",
            lineHeight: 1.5,
          }}>
            {ov.remainingMessage}
          </p>
        </div>
      </div>

      {/* ── Quick Tasks ───────────────────────────────────────────────────── */}
      <div className="wc-card" style={{ padding: "var(--space-6)" }}>
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginBottom:   "var(--space-2)",
        }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
            Quick Tasks
          </h2>
          <a
            href="/tasks"
            style={{
              fontSize:       "var(--text-xs)",
              fontWeight:     700,
              color:          "var(--wc-sky-500)",
              textDecoration: "none",
              letterSpacing:  "0.06em",
            }}
          >
            VIEW ALL
          </a>
        </div>

        <div>
          {tasks.map((task, i) => (
            <QuickTaskRow
              key={task.id}
              task={task}
              isLast={i === tasks.length - 1}
              onToggle={toggleTask}
            />
          ))}
        </div>
      </div>

    </div>
  );
}