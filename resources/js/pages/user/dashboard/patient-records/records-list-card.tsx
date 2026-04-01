// resources/js/pages/user/patient-records/records-list-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Medical Records Archive card.
// Identical structure to my-patients/patient-list-card.tsx —
// only the data import differs (patient-records-data instead of my-patients-data).
// No duplicate component logic; this is the single source of truth for records.

import type { ReactElement }               from "react";
import { patients, myPatientsMeta }        from "./patient-records-data";
import type { Patient, PatientStatus }     from "./patient-records-data";

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconEye = (): ReactElement => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEdit = (): ReactElement => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PatientStatus, { label: string; bg: string; color: string; border: string }> = {
  stable:      { label: "STABLE",      bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  recovering:  { label: "RECOVERING",  bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  critical:    { label: "CRITICAL",    bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  observation: { label: "OBSERVATION", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
};

function StatusBadge({ status }: { status: PatientStatus }): ReactElement {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "var(--space-1) var(--space-3)",
      borderRadius:  "var(--radius-lg)",
      background:    cfg.bg,
      color:         cfg.color,
      border:        `1px solid ${cfg.border}`,
      fontSize:      "var(--text-xs)",
      fontWeight:    700,
      letterSpacing: "0.06em",
    }}>
      {cfg.label}
    </span>
  );
}

// ── Patient avatar ────────────────────────────────────────────────────────────

function PatientAvatar({ patient }: { patient: Patient }): ReactElement {
  return (
    <div style={{
      width:          44,
      height:         44,
      borderRadius:   "var(--radius-lg)",
      background:     patient.avatarColor,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      color:          "#ffffff",
      fontSize:       "var(--text-xs)",
      fontWeight:     700,
      flexShrink:     0,
      boxShadow:      "var(--shadow-sm)",
      letterSpacing:  "0.02em",
    }}>
      {patient.initials}
    </div>
  );
}

// ── Single table row ──────────────────────────────────────────────────────────

function RecordRow({ patient, isLast }: { patient: Patient; isLast: boolean }): ReactElement {
  const meta = myPatientsMeta;
  return (
    <tr style={{
      borderBottom: isLast ? "none" : "1px solid var(--wc-gray-100)",
      transition:   "background var(--duration-base) var(--ease-out)",
    }}>
      {/* Patient col */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <PatientAvatar patient={patient} />
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.3 }}>
              {patient.name}
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.3 }}>
              ID: {patient.patientId}
            </p>
          </div>
        </div>
      </td>

      {/* Age / Gender */}
      <td style={{ padding: "var(--space-4) var(--space-5)", fontSize: "var(--text-sm)", color: "var(--wc-gray-600)" }}>
        {patient.age} yrs / {patient.gender}
      </td>

      {/* Last Visit */}
      <td style={{ padding: "var(--space-4) var(--space-5)", fontSize: "var(--text-sm)", color: "var(--wc-gray-600)" }}>
        {patient.lastVisit}
      </td>

      {/* Status */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <StatusBadge status={patient.status} />
      </td>

      {/* Actions */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <a
            href={`/records/${patient.id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "var(--space-1)",
              padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-lg)",
              background: "var(--wc-blue-50)", color: "var(--wc-blue-600)",
              fontSize: "var(--text-xs)", fontWeight: 600, textDecoration: "none",
              border: "1px solid var(--wc-blue-100)",
              transition: "all var(--duration-base) var(--ease-out)",
            }}
          >
            <IconEye />{meta.viewLabel}
          </a>
          <a
            href={`/records/${patient.id}/edit`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "var(--space-1)",
              padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-lg)",
              background: "transparent", color: "var(--wc-gray-500)",
              fontSize: "var(--text-xs)", fontWeight: 600, textDecoration: "none",
              border: "1px solid var(--wc-gray-200)",
              transition: "all var(--duration-base) var(--ease-out)",
            }}
          >
            <IconEdit />{meta.editLabel}
          </a>
        </div>
      </td>
    </tr>
  );
}

// ── Records List Card ─────────────────────────────────────────────────────────

export function RecordsListCard(): ReactElement {
  const meta = myPatientsMeta;

  return (
    <div className="wc-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Card header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-5) var(--space-6)",
        borderBottom: "1px solid var(--wc-gray-100)",
      }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
          {meta.listCardTitle}
        </h2>
        <a
          href="/records"
          style={{
            fontSize: "var(--text-sm)", fontWeight: 600,
            color: "var(--wc-sky-500)", textDecoration: "none", letterSpacing: "0.04em",
          }}
        >
          {meta.viewAllLabel}
        </a>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>

          <thead>
            <tr style={{ borderBottom: "1px solid var(--wc-gray-100)" }}>
              {[meta.colPatient, meta.colAgeGender, meta.colLastVisit, meta.colStatus, meta.colActions].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "var(--space-3) var(--space-5)", textAlign: "left",
                    fontSize: "var(--text-xs)", fontWeight: 700,
                    color: "var(--wc-gray-400)", letterSpacing: "0.08em",
                    background: "var(--wc-gray-50)",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {patients.map((patient, i) => (
              <RecordRow
                key={patient.id}
                patient={patient}
                isLast={i === patients.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}