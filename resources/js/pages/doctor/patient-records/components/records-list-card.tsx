// resources/js/pages/user/patient-records/records-list-card.tsx

import { type ReactElement, useState } from "react";
// import { patients, myPatientsMeta } from "../patient-records-data";
import type { Patient } from "../patient-records-data";
import { ArchiveModal } from "./archive-modal";

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconFolder = ({ active }: { active?: boolean }): ReactElement => (
  <div style={{
    width: 48, height: 48, borderRadius: "14px",
    background: active ? "var(--wc-blue-600)" : "transparent",
    border: active ? "none" : "1.5px solid var(--wc-blue-600)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: active ? "#fff" : "var(--wc-blue-600)", marginBottom: "var(--space-4)",
    transition: "background 0.22s ease, border 0.22s ease, color 0.22s ease",
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  </div>
);

const IconMore = ({ hovered }: { hovered?: boolean }): ReactElement => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hovered ? "var(--wc-blue-600)" : "var(--wc-gray-400)"} strokeWidth="2" style={{ transition: "stroke 0.22s ease" }}>
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);

// ── Record Card ───────────────────────────────────────────────────────────────

function RecordCard({ patient, onOpenArchive }: { patient: Patient; onOpenArchive: (p: Patient) => void }): ReactElement {
  const [hovered, setHovered] = useState(false);
  // Folder is only filled when the card is hovered
  const isActive = hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "linear-gradient(135deg, #f0f5ff 0%, #e8f0fe 100%)" : "#fff",
        padding: "var(--space-6)",
        borderRadius: "24px",
        border: hovered ? "1px solid #c7d9fa" : "1px solid var(--wc-gray-100)",
        position: "relative",
        boxShadow: hovered
          ? "0 12px 32px -6px rgba(59, 130, 246, 0.18), 0 2px 8px -2px rgba(59,130,246,0.08)"
          : "none",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease, border 0.22s ease",
        cursor: "pointer",
      }}
    >
      {/* More menu button — top right, gets subtle bg on hover */}
      <div style={{
        position: "absolute", top: "16px", right: "16px", cursor: "pointer",
        width: 32, height: 32, borderRadius: "10px",
        background: hovered ? "rgba(59, 130, 246, 0.08)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.22s ease",
      }}>
        <IconMore hovered={hovered} />
      </div>

      {/* Folder icon — outline normally, filled blue on hover */}
      <IconFolder active={isActive} />

      {/* Patient name — turns blue on hover */}
      <h3 style={{
        margin: "0 0 4px",
        fontSize: "1.1rem",
        fontWeight: 700,
        color: hovered ? "var(--wc-blue-600)" : "var(--wc-dark)",
        transition: "color 0.22s ease",
      }}>
        {patient.name}
      </h3>

      <p style={{
        margin: "0 0 var(--space-5)",
        fontSize: "var(--text-xs)",
        color: "var(--wc-gray-400)",
        fontWeight: 600,
      }}>
        RECORD ID: {patient.patientId}
      </p>

      {/* Meta row: date + doc count */}
      <div style={{ display: "flex", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          color: "var(--wc-gray-500)", fontSize: "var(--text-xs)", fontWeight: 600,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {patient.lastUpdate}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          color: "var(--wc-gray-500)", fontSize: "var(--text-xs)", fontWeight: 600,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          {patient.docCount} DOCS
        </div>
      </div>

      {/* Footer row: VERIFIED badge + OPEN ARCHIVE link */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "#f0fdf4", color: "#16a34a",
          padding: "4px 10px", borderRadius: "12px",
          fontSize: "10px", fontWeight: 800, border: "1px solid #dcfce7",
        }}>
          {/* Shield-check style icon */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          VERIFIED
        </span>

        {/* OPEN ARCHIVE — fades in on hover, opens modal on click */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenArchive(patient); }}
          style={{
            background: "none", border: "none", padding: 0,
            color: "var(--wc-blue-600)",
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            cursor: "pointer",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.22s ease",
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          OPEN ARCHIVE ›
        </button>
      </div>
    </div>
  );
}

// ── Records List Card ─────────────────────────────────────────────────────────

export function RecordsListCard(): ReactElement {
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  return (
    <>
      {activePatient && (
        <ArchiveModal patient={activePatient} onClose={() => setActivePatient(null)} />
      )}

      <div className="wc-card" style={{ padding: "var(--space-6)", background: "transparent", border: "none" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "var(--space-6)",
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--wc-dark)" }}>
            {myPatientsMeta.listCardTitle}
          </h2>
          <button style={{
            background: "none", border: "none",
            color: "var(--wc-blue-600)", fontWeight: 700,
            fontSize: "var(--text-sm)", cursor: "pointer",
          }}>
            {myPatientsMeta.viewAllLabel}
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "var(--space-6)",
        }}>
          {patients.map((p) => (
            <RecordCard key={p.id} patient={p} onOpenArchive={setActivePatient} />
          ))}
        </div>
      </div>
    </>
  );
}