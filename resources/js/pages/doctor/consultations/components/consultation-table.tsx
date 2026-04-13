// resources/js/pages/doctor/dashboard/consultations/components/consultation-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from mockup:
//   - `id` is now a number (from DB), not a string
//   - Added `onStartSession` prop — opens the session editor for in-progress records
//   - Status badge now handles rawStatus from DB
//   - Empty state shows when no records returned from server

import type { ReactElement }                           from "react";
import { consultationsMeta }                           from "../consultations-data";
import type { ConsultationRecord, ConsultationStatus } from "../consultations-data";

function IconCalendar(): ReactElement {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function IconClock(): ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconChevronRight(): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function ConsultationStatusBadge({ status, rawStatus }: { status: ConsultationStatus; rawStatus: string }): ReactElement {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    finalized:     { label: "Completed",   bg: "#dcfce7", color: "#15803d" },
    "in-progress": { label: rawStatus === "checked_in" ? "Checked In" : "In Progress", bg: "#dbeafe", color: "#1d4ed8" },
    draft:         { label: "Draft",       bg: "#fef9c3", color: "#a16207" },
  };
  const { label, bg, color } = config[status] ?? config["draft"];
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "3px 12px",
      borderRadius:  "100px",
      background:    bg,
      color:         color,
      fontSize:      "11px",
      fontWeight:    700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

function ConsultationRow({
  record,
  onViewSummary,
  onStartSession,
}: {
  record:         ConsultationRecord;
  onViewSummary:  (record: ConsultationRecord) => void;
  onStartSession: (record: ConsultationRecord) => void;
}): ReactElement {
  const meta = consultationsMeta;

  return (
    <tr
      style={{ borderBottom: "1px solid var(--wc-gray-100)", transition: "background 0.15s ease" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--wc-gray-50)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
    >
      {/* Patient */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "var(--radius-lg)",
            background: record.color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0,
          }}>
            {record.initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.3 }}>
              {record.patient}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.3 }}>
              {record.patientId}
            </p>
          </div>
        </div>
      </td>

      {/* Date / Time */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--wc-gray-700)", fontSize: "var(--text-sm)", marginBottom: "4px" }}>
          <span style={{ color: "var(--wc-gray-400)" }}><IconCalendar /></span>
          {record.date}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--wc-gray-400)", fontSize: "var(--text-xs)" }}>
          <IconClock /> {record.time}
        </div>
      </td>

      {/* Diagnosis / Service */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--wc-dark)" }}>
          {record.diagnosis}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", textTransform: "capitalize" }}>
          {record.coverage} · {record.patientStatus} patient
        </p>
      </td>

      {/* Status */}
      <td style={{ padding: "var(--space-5) var(--space-6)" }}>
        <ConsultationStatusBadge status={record.status} rawStatus={record.rawStatus} />
      </td>

      {/* Actions */}
      <td style={{ padding: "var(--space-5) var(--space-6)", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          {/* Start/Continue session button — only for active consultations */}
          {(record.rawStatus === "checked_in" || record.rawStatus === "in_progress") && (
            <button
              type="button"
              onClick={() => onStartSession(record)}
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "4px",
                fontSize:      "var(--text-xs)",
                fontWeight:    700,
                color:         "#fff",
                background:    "var(--wc-blue-600)",
                border:        "none",
                cursor:        "pointer",
                padding:       "6px 14px",
                borderRadius:  "var(--radius-full)",
                letterSpacing: "0.02em",
              }}
            >
              {record.rawStatus === "checked_in" ? "Start" : "Continue"}
            </button>
          )}

          {/* View summary */}
          <button
            type="button"
            onClick={() => onViewSummary(record)}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           "4px",
              fontSize:      "var(--text-sm)",
              fontWeight:    700,
              color:         "var(--wc-blue-600)",
              background:    "none",
              border:        "none",
              cursor:        "pointer",
              padding:       0,
              letterSpacing: "0.02em",
              transition:    "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            {meta.viewSummaryLabel}
            <IconChevronRight />
          </button>
        </div>
      </td>
    </tr>
  );
}

interface ConsultationsTableProps {
  records:        ConsultationRecord[];
  onViewSummary:  (record: ConsultationRecord) => void;
  onStartSession: (record: ConsultationRecord) => void;
}

export function ConsultationsTable({ records, onViewSummary, onStartSession }: ConsultationsTableProps): ReactElement {
  const meta = consultationsMeta;

  return (
    <div className="wc-card" style={{ overflow: "hidden" }}>
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
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--wc-gray-400)" }}>
          {records.length} record{records.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[meta.colPatient, meta.colDateTime, meta.colDiagnosis, meta.colStatus, meta.colActions].map((col) => (
                <th key={col} style={{
                  padding:       "12px var(--space-6)",
                  textAlign:     col === meta.colActions ? "right" : "left",
                  fontSize:      "11px",
                  fontWeight:    700,
                  color:         "var(--wc-gray-400)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  borderBottom:  "1px solid var(--wc-gray-100)",
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <ConsultationRow
                key={record.id}
                record={record}
                onViewSummary={onViewSummary}
                onStartSession={onStartSession}
              />
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--wc-gray-400)", fontSize: "var(--text-sm)" }}>
                  {meta.emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}