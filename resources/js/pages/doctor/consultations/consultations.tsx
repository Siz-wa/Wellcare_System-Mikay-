// resources/js/pages/user/consultations/consultations.tsx

import { useState, useCallback } from "react";
import type { ReactElement }     from "react";
import { DashboardLayout }       from "../layout/dashboard-layout";
import { consultationsMeta, recentConsultations } from "../consultations/consultations-data";
import type { ConsultationRecord }                from "../consultations/consultations-data";
import { ConsultationsTable } from "./components/consultation-table";
import { SessionEditor }      from "./session-editor/session-editor";
import { ConsultationDetailModal } from "./components/consultation-detail-modal";

export default function ConsultationsPage(): ReactElement {
  const meta = consultationsMeta;

  const [query,               setQuery]               = useState("");
  const [editorOpen,          setEditorOpen]          = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRecord | null>(null);

  const filtered: ConsultationRecord[] = recentConsultations.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.patient.toLowerCase().includes(q) || r.diagnosis.toLowerCase().includes(q);
  });

  const handleOpenEditor   = useCallback((): void => setEditorOpen(true),  []);
  const handleCloseEditor  = useCallback((): void => setEditorOpen(false), []);
  const handleViewSummary  = useCallback((record: ConsultationRecord): void => {
    setSelectedConsultation(record);
  }, []);

  return (
    <DashboardLayout activeId="consultations">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        marginBottom:   "var(--space-8)",
      }}>
        <div>
          <h1 style={{
            margin:        "0 0 var(--space-1)",
            fontSize:      "var(--text-3xl)",
            fontWeight:    800,
            letterSpacing: "-0.03em",
            lineHeight:    1.15,
            color:         "var(--wc-dark)",
            fontFamily:    "var(--font-display, 'Bricolage Grotesque')",
          }}>
            {meta.pageTitle}
          </h1>
          <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
            {meta.pageSubtitle}
          </p>
        </div>

        {/* Dark navy pill button — matches image exactly */}
        <button
          type="button"
          onClick={handleOpenEditor}
          style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           "var(--space-2)",
            flexShrink:    0,
            height:        48,
            paddingInline: "var(--space-8)",
            borderRadius:  "100px",
            background:    "#0056b3",
            color:         "#ffffff",
            fontSize:      "var(--text-base)",
            fontWeight:    700,
            border:        "none",
            cursor:        "pointer",
            letterSpacing: "-0.01em",
            transition:    "background 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#133686"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0056b3" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {meta.startSessionLabel}
        </button>
      </div>

      {/* ── Search bar — full-width, outside the card ─────────────────────── */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "var(--space-3)",
        marginBottom: "var(--space-6)",
        padding:      "var(--space-3) var(--space-5)",
        background:   "var(--wc-white)",
        borderRadius: "var(--radius-xl)",
        border:       "1px solid var(--wc-gray-100)",
        boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <span style={{ color: "var(--wc-gray-400)", display: "flex", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>

        <input
          type="text"
          placeholder={meta.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex:       1,
            border:     "none",
            outline:    "none",
            fontSize:   "var(--text-sm)",
            color:      "var(--wc-dark)",
            background: "transparent",
            padding:    "var(--space-1) 0",
          }}
        />

        <button
          type="button"
          style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "var(--space-2)",
            flexShrink:   0,
            background:   "none",
            border:       "none",
            cursor:       "pointer",
            fontSize:     "var(--text-sm)",
            fontWeight:   600,
            color:        "var(--wc-gray-500)",
            padding:      "var(--space-1) var(--space-2)",
            borderRadius: "var(--radius-md)",
            transition:   "color 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--wc-blue-600)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--wc-gray-500)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          {meta.filtersLabel}
        </button>
      </div>

      {/* ── Consultations table ────────────────────────────────────────────── */}
      <ConsultationsTable
        records={filtered}
        onViewSummary={handleViewSummary}
      />

      {/* Session editor modal */}
      {editorOpen && (
        <SessionEditor onClose={handleCloseEditor} />
      )}

      {/* Consultation detail modal */}
      {selectedConsultation && (
        <ConsultationDetailModal
          consultation={{
            ...selectedConsultation,
            patientName:   selectedConsultation.patient,
            avatarColor:   selectedConsultation.color,
            type:          "Follow-up",
            notes:         "Patient is responding well to treatment. Continue observation.",
            prescriptions: [
              { medication: "Amoxicillin", dosage: "500mg", duration: "7 days" },
            ],
          }}
          onClose={() => setSelectedConsultation(null)}
        />
      )}

    </DashboardLayout>
  );
}