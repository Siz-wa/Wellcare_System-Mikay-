// resources/js/pages/user/consultations/components/consultations-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Recent consultations table — patient, date/time, diagnosis, status, actions.

import type { ReactElement }                        from "react";
import { consultationsMeta }                        from "../../consultations/consultations-data";
import type { ConsultationRecord, ConsultationStatus } from "../../consultations/consultations-data";
import { IconCalendar, IconClock, IconChevronRight } from "@/pages/user/dashboard/icons";

// ── Status badge ──────────────────────────────────────────────────────────────

function ConsultationStatusBadge({ status }: { status: ConsultationStatus }): ReactElement {
  const config: Record<ConsultationStatus, { label: string; bg: string; color: string }> = {
    finalized:   { label: "Finalized",   bg: "#dcfce7", color: "#15803d" },
    "in-progress": { label: "In Progress", bg: "#dbeafe", color: "#1d4ed8" },
    draft:       { label: "Draft",       bg: "#fef9c3", color: "#a16207" },
  };
  const { label, bg, color } = config[status];
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "var(--space-1) var(--space-3)",
      borderRadius:  "var(--radius-full)",
      background:    bg,
      color:         color,
      fontSize:      "var(--text-xs)",
      fontWeight:    700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function ConsultationRow({ record }: { record: ConsultationRecord }): ReactElement {
  const meta = consultationsMeta;

  return (
    <tr style={{ borderBottom: "1px solid var(--wc-gray-100)", transition: "background var(--duration-fast) var(--ease-out)" }}>
      {/* Patient */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{
            width:          40,
            height:         40,
            borderRadius:   "var(--radius-lg)",
            background:     record.color,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            color:          "#ffffff",
            fontSize:       "var(--text-xs)",
            fontWeight:     700,
            flexShrink:     0,
          }}>
            {record.initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.3 }}>
              {record.patient}
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.3 }}>
              ID: {record.patientId}
            </p>
          </div>
        </div>
      </td>

      {/* Date / Time */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)", color: "var(--wc-gray-600)", fontSize: "var(--text-sm)" }}>
          <span style={{ color: "var(--wc-gray-400)" }}><IconCalendar /></span>
          {record.date}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--wc-gray-400)", fontSize: "var(--text-xs)" }}>
          <IconClock />
          {record.time}
        </div>
      </td>

      {/* Diagnosis */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--wc-dark)" }}>
          {record.diagnosis}
        </p>
      </td>

      {/* Status */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <ConsultationStatusBadge status={record.status} />
      </td>

      {/* Actions */}
      <td style={{ padding: "var(--space-5) var(--space-6)", textAlign: "right" }}>
        <button
          type="button"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "var(--space-1)",
            fontSize:       "var(--text-sm)",
            fontWeight:     700,
            color:          "var(--wc-blue-600)",
            background:     "none",
            border:         "none",
            cursor:         "pointer",
            padding:        0,
            letterSpacing:  "0.01em",
          }}
        >
          {meta.viewSummaryLabel}
          <IconChevronRight />
        </button>
      </td>
    </tr>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────

interface ConsultationsTableProps {
  records: ConsultationRecord[];
}

export function ConsultationsTable({ records }: ConsultationsTableProps): ReactElement {
  const meta = consultationsMeta;

  return (
    <div className="wc-card" style={{ overflow: "hidden" }}>
      {/* Card header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "var(--space-5) var(--space-6)",
        borderBottom:   "1px solid var(--wc-gray-100)",
      }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
          {meta.recentTitle}
        </h2>
        <button
          type="button"
          style={{
            fontSize:       "var(--text-sm)",
            fontWeight:     700,
            color:          "var(--wc-sky-500)",
            background:     "none",
            border:         "none",
            cursor:         "pointer",
            letterSpacing:  "0.04em",
            padding:        0,
          }}
        >
          {meta.viewAll}
        </button>
      </div>

      {/* Table */}
      <div className="wc-table-wrap">
        <table className="wc-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              {[meta.colPatient, meta.colDateTime, meta.colDiagnosis, meta.colStatus, meta.colActions].map((col) => (
                <th
                  key={col}
                  style={{
                    padding:       "var(--space-3) var(--space-6)",
                    textAlign:     col === meta.colActions ? "right" : "left",
                    fontSize:      "var(--text-xs)",
                    fontWeight:    700,
                    color:         "var(--wc-gray-400)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background:    "var(--wc-white)",
                    borderBottom:  "1px solid var(--wc-gray-100)",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <ConsultationRow key={record.id} record={record} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}