// resources/js/pages/user/dashboard/components/clinic-workflow.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Clinic Workflow card — numbered step list with icon tiles.

import type { ReactElement }               from "react";
import { workflowSteps, dashboardMeta }    from "../dashboard-data";
import type { WorkflowStep }               from "../dashboard-data";
import { WorkflowIcon }                    from "../icons/index";
import { IconArrowRight }                  from "../icons";

// ── Single step row ───────────────────────────────────────────────────────────

function WorkflowRow({ step }: { step: WorkflowStep }): ReactElement {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "flex-start",
      gap:          "var(--space-3)",
      padding:      "var(--space-3) 0",
      borderBottom: "1px solid var(--wc-gray-100)",
    }}>
      {/* Step number bubble */}
      <div style={{
        width:          28,
        height:         28,
        borderRadius:   "var(--radius-full)",
        background:     "var(--wc-gray-100)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       "var(--text-xs)",
        fontWeight:     700,
        color:          "var(--wc-gray-600)",
        flexShrink:     0,
        marginTop:      2,
      }}>
        {step.step}
      </div>

      {/* Icon tile */}
      <div style={{
        width:          36,
        height:         36,
        borderRadius:   "var(--radius-lg)",
        background:     "var(--wc-blue-50)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          "var(--wc-blue-600)",
        flexShrink:     0,
      }}>
        <WorkflowIcon iconKey={step.iconKey} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin:     0,
          fontSize:   "var(--text-sm)",
          fontWeight: 600,
          color:      "var(--wc-dark)",
          lineHeight: 1.3,
        }}>
          {step.title}
        </p>
        <p style={{
          margin:     "var(--space-1) 0 0",
          fontSize:   "var(--text-xs)",
          color:      "var(--wc-gray-500)",
          lineHeight: 1.4,
        }}>
          {step.description}
        </p>
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function ClinicWorkflow(): ReactElement {
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
          {meta.clinicWorkflowTitle}
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

      {/* Steps */}
      <div>
        {workflowSteps.map((step) => (
          <WorkflowRow key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}