// resources/js/pages/user/my-patients/components/patient-list-card.tsx

import { useState }          from "react";
import type { ReactElement } from "react";
import { patients, myPatientsMeta } from "../my-patient-data";
import type { Patient, PatientStatus } from "../my-patient-data";
import { PatientDetailModal }         from "./patient-detail-modal";

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PatientStatus }): ReactElement {
  const config: Record<PatientStatus, { bg: string; text: string; border: string }> = {
    stable:      { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    recovering:  { bg: "#eff6ff", text: "#0056b3", border: "#bfdbfe" },
    observation: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
    critical:    { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  };
  const s = config[status];
  return (
    <span style={{
      display:         "inline-flex",
      alignItems:      "center",
      padding:         "3px 12px",
      borderRadius:    "100px",
      fontSize:        "11px",
      fontWeight:      700,
      textTransform:   "uppercase",
      letterSpacing:   "0.05em",
      background:      s.bg,
      color:           s.text,
      border:          `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

// ── Patient Avatar ────────────────────────────────────────────────────────────

function PatientAvatar({ patient }: { patient: Patient }): ReactElement {
  if (patient.avatarSrc) {
    return (
      <img
        src={patient.avatarSrc}
        alt={patient.name}
        style={{
          width:        40,
          height:       40,
          borderRadius: "10px",
          objectFit:    "cover",
          flexShrink:   0,
        }}
      />
    );
  }
  return (
    <div style={{
      width:          40,
      height:         40,
      borderRadius:   "10px",
      background:     patient.avatarColor,
      color:          "#fff",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontSize:       "13px",
      fontWeight:     700,
      flexShrink:     0,
    }}>
      {patient.initials}
    </div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────────────

function PatientRow({
  patient,
  isLast,
  onView,
}: {
  patient: Patient;
  isLast:  boolean;
  onView:  (p: Patient) => void;
}): ReactElement {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onView(patient)}
      style={{
        background:   hovered ? "var(--wc-gray-50)" : "transparent",
        transition:   "background 0.15s ease",
        borderBottom: isLast ? "none" : "1px solid var(--wc-gray-100)",
        cursor:       "pointer",
      }}
    >
      {/* Patient */}
      <td style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <PatientAvatar patient={patient} />
          <div>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.3 }}>
              {patient.name}
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--wc-gray-400)", lineHeight: 1.3, marginTop: "2px" }}>
              ID: {patient.patientId}
            </p>
          </div>
        </div>
      </td>

      {/* Age / Gender */}
      <td style={{ padding: "16px 24px", fontSize: "14px", color: "var(--wc-gray-600)", fontWeight: 500 }}>
        {patient.age} yrs / {patient.gender}
      </td>

      {/* Last Visit */}
      <td style={{ padding: "16px 24px", fontSize: "14px", color: "var(--wc-gray-600)", fontWeight: 500 }}>
        {patient.lastVisit}
      </td>

      {/* Status */}
      <td style={{ padding: "16px 24px" }}>
        <StatusBadge status={patient.status} />
      </td>

      {/* Actions — hidden until hover */}
      <td style={{ padding: "16px 24px", textAlign: "right" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onView(patient); }}
          style={{
            width:      32,
            height:     32,
            borderRadius: "8px",
            border:     "1px solid var(--wc-gray-200)",
            background: "white",
            color:      "var(--wc-blue-600)",
            display:    "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor:     "pointer",
            opacity:    hovered ? 1 : 0,
            transform:  hovered ? "translateX(0)" : "translateX(4px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

export function PatientListCard({
  search,
}: {
  search: string;
}): ReactElement {
  const meta = myPatientsMeta;
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.patientId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div
        className="wc-card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        {/* Card header */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "var(--space-5) var(--space-6)",
          borderBottom:   "1px solid var(--wc-gray-100)",
        }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
            {meta.listCardTitle}
          </h2>
          <a
            href="/patients/all"
            style={{
              fontSize:       "var(--text-xs)",
              fontWeight:     700,
              color:          "var(--wc-sky-500)",
              textDecoration: "none",
              letterSpacing:  "0.06em",
            }}
          >
            {meta.viewAllLabel}
          </a>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--wc-gray-100)" }}>
                {[meta.colPatient, meta.colAgeGender, meta.colLastVisit, meta.colStatus, meta.colActions].map((col, i) => (
                  <th
                    key={col}
                    style={{
                      padding:       "12px 24px",
                      textAlign:     i === 4 ? "right" : "left",
                      fontSize:      "11px",
                      fontWeight:    700,
                      color:         "var(--wc-gray-400)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      background:    "transparent",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient, i) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  isLast={i === filtered.length - 1}
                  onView={setSelectedPatient}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--wc-gray-400)", fontSize: "14px" }}>
                    No patients found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </>
  );
}