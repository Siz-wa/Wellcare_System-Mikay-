// resources/js/pages/patient/records/components/records-list.tsx
import { useState, type ReactElement } from "react";
import { mockMedicalRecords, patientMeta } from "../../patient-data";
import type { RecordType } from "../../patient-data";
import { RecordRow } from "./record-row";

type FilterKey = "all" | RecordType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",          label: "All"          },
  { key: "lab",          label: "Lab Results"  },
  { key: "xray",         label: "X-Ray"        },
  { key: "imaging",      label: "Imaging"      },
  { key: "prescription", label: "Prescriptions"},
  { key: "consult",      label: "Consultations"},
];

const SearchIcon = (): ReactElement => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

interface Props { visible: boolean; }

export function RecordsList({ visible }: Props): ReactElement {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [query,        setQuery]        = useState("");

  const filtered = mockMedicalRecords.filter(r => {
    const matchType  = activeFilter === "all" || r.type === activeFilter;
    const matchQuery = !query.trim() ||
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.doctor.toLowerCase().includes(query.toLowerCase());
    return matchType && matchQuery;
  });

  return (
    <div style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1) 100ms, transform 420ms cubic-bezier(0.16,1,0.3,1) 100ms",
    }}>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "var(--space-4)" }}>
        <span style={{
          position:      "absolute",
          left:          "var(--space-4)",
          top:           "50%",
          transform:     "translateY(-50%)",
          color:         "#94a3b8",
          display:       "flex",
          pointerEvents: "none",
        }}>
          <SearchIcon />
        </span>
        <input
          type="search"
          className="wc-input"
          placeholder={patientMeta.searchRecordsPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            paddingLeft: "calc(var(--space-4) + 22px)",
            fontSize:    "var(--text-sm)",
            background:  "var(--wc-white)",
            border:      "1px solid var(--wc-gray-200)",
          }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-5)" }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding:      "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-full)",
              border:       activeFilter === f.key ? "none" : "1px solid var(--wc-gray-200)",
              background:   activeFilter === f.key ? "var(--wc-blue-600)" : "var(--wc-white)",
              color:        activeFilter === f.key ? "#ffffff" : "#64748b",
              fontSize:     "var(--text-sm)",
              fontWeight:   activeFilter === f.key ? 700 : 500,
              cursor:       "pointer",
              transition:   "all 150ms ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Records card */}
      <div className="wc-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Card header */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "var(--space-5) var(--space-6)",
          borderBottom:   "1px solid var(--wc-gray-100)",
        }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>
              Medical Records Archive
            </h2>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>
              {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <button
            type="button"
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "var(--space-2)",
              padding:      "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-full)",
              border:       "1px solid var(--wc-gray-200)",
              background:   "var(--wc-white)",
              color:        "#0056b3",
              fontSize:     "var(--text-sm)",
              fontWeight:   700,
              cursor:       "pointer",
              transition:   "all 150ms ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background   = "var(--wc-blue-50)";
              (e.currentTarget as HTMLButtonElement).style.borderColor  = "var(--wc-blue-200)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background   = "var(--wc-white)";
              (e.currentTarget as HTMLButtonElement).style.borderColor  = "var(--wc-gray-200)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {patientMeta.downloadAllLabel}
          </button>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "var(--space-12)", textAlign: "center" }}>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "var(--text-sm)" }}>
              No records found.
            </p>
          </div>
        ) : (
          filtered.map((record, i) => (
            <RecordRow
              key={record.id}
              record={record}
              isLast={i === filtered.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}