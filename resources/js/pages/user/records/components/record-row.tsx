// resources/js/pages/patient/records/components/record-row.tsx
import type { ReactElement }     from "react";
import type { MedicalRecord }    from "../../patient-data";
import { patientMeta }           from "../../patient-data";
import { RecordTypeIcon }        from "./record-type-icon";
import { RecordStatusBadge }     from "./record-status-badge";

interface Props { record: MedicalRecord; isLast: boolean; }

const DownloadIcon = (): ReactElement => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export function RecordRow({ record, isLast }: Props): ReactElement {
  const typeLabel = patientMeta.recordTypeLabels[record.type];

  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "var(--space-4)",
        padding:      "var(--space-5) var(--space-6)",
        borderBottom: isLast ? "none" : "1px solid var(--wc-gray-100)",
        transition:   "background 150ms ease",
        cursor:       "default",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--wc-gray-50)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Type icon */}
      <RecordTypeIcon type={record.type} />

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 3px", fontSize: "var(--text-sm)", fontWeight: 700, color: "#0f172a" }}>
          {record.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "#64748b" }}>
            {typeLabel} · {record.doctor}
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "#94a3b8" }}>
            {record.date}
          </span>
        </div>
        {record.notes && (
          <p style={{ margin: "3px 0 0", fontSize: "var(--text-xs)", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {record.notes}
          </p>
        )}
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <RecordStatusBadge status={record.status} />
      </div>

      {/* File size + download */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)", flexShrink: 0, minWidth: 72 }}>
        {record.fileSize && (
          <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>{record.fileSize}</span>
        )}
        <button
          type="button"
          style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "var(--space-1)",
            padding:      "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-full)",
            border:       "1px solid var(--wc-gray-200)",
            background:   "var(--wc-white)",
            color:        "#0056b3",
            fontSize:     "var(--text-xs)",
            fontWeight:   700,
            cursor:       "pointer",
            transition:   "all 150ms ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-blue-50)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--wc-blue-200)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-white)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--wc-gray-200)";
          }}
        >
          <DownloadIcon />
          Download
        </button>
      </div>
    </div>
  );
}