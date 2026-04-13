// resources/js/pages/doctor/dashboard/consultations/consultations.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from mockup version:
//   - Receives `consultations` and `filters` from Inertia props (DB-driven)
//   - Search filter uses Inertia router to send server-side query
//   - "Start New Session" opens the SessionEditor with the selected patient
//   - No hardcoded recentConsultations array

import { useState, useCallback }  from "react";
import type { ReactElement }       from "react";
import { router, usePage }         from "@inertiajs/react";
import { DashboardLayout }         from "../layout/dashboard-layout";
import {
  consultationsMeta,
}                                  from "./consultations-data";
import type {
  ConsultationRecord,
  ConsultationFilters,
}                                  from "./consultations-data";
import { ConsultationsTable }      from "./components/consultation-table";
import { SessionEditor }           from "./session-editor/session-editor";
import { ConsultationDetailModal } from "./components/consultation-detail-modal";
import type { PageProps }          from "@/types";

// ── Inertia page props ────────────────────────────────────────────────────────

interface ConsultationsPageProps extends PageProps {
  consultations: ConsultationRecord[];
  filters:       ConsultationFilters;
}

export default function ConsultationsPage(): ReactElement {
  const { props }  = usePage<ConsultationsPageProps>();
  const meta       = consultationsMeta;

  const [editorOpen,           setEditorOpen]           = useState(false);
  const [editorConsultation,   setEditorConsultation]   = useState<ConsultationRecord | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRecord | null>(null);
  const [search,               setSearch]               = useState(props.filters.search ?? "");

  // ── Server-side search ────────────────────────────────────────────────────

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    router.get(
      window.location.pathname,
      { search: value, status: props.filters.status },
      { preserveState: true, replace: true }
    );
  }, [props.filters.status]);

  // ── Session editor ────────────────────────────────────────────────────────

  const handleOpenEditor = useCallback((record?: ConsultationRecord) => {
    setEditorConsultation(record ?? null);
    setEditorOpen(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditorConsultation(null);
  }, []);

  const handleViewSummary = useCallback((record: ConsultationRecord) => {
    setSelectedConsultation(record);
  }, []);

  return (
    <DashboardLayout activeId="consultations">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
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

        <button
          type="button"
          onClick={() => handleOpenEditor()}
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
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0056b3"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {meta.startSessionLabel}
        </button>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
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
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
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

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
          {["", "in_progress", "checked_in", "completed"].map((s) => {
            const label = s === "" ? "All" : s === "in_progress" ? "In Progress" : s === "checked_in" ? "Checked In" : "Completed";
            const active = (props.filters.status ?? "") === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => router.get(window.location.pathname, { search, status: s }, { preserveState: true, replace: true })}
                style={{
                  fontSize:      "var(--text-xs)",
                  fontWeight:    700,
                  padding:       "4px 12px",
                  borderRadius:  "var(--radius-full)",
                  border:        `1px solid ${active ? "var(--wc-blue-600)" : "var(--wc-gray-200)"}`,
                  background:    active ? "var(--wc-blue-600)" : "transparent",
                  color:         active ? "#fff" : "var(--wc-gray-500)",
                  cursor:        "pointer",
                  transition:    "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Consultations table ──────────────────────────────────────────────── */}
      <ConsultationsTable
        records={props.consultations}
        onViewSummary={handleViewSummary}
        onStartSession={handleOpenEditor}
      />

      {/* Session editor modal */}
      {editorOpen && (
        <SessionEditor
          consultation={editorConsultation}
          onClose={handleCloseEditor}
        />
      )}

      {/* Detail modal — passes full session data (SOAP, vitals, prescriptions) */}
      {selectedConsultation && (
        <ConsultationDetailModal
          consultation={{
            ...selectedConsultation,
            patientName:   selectedConsultation.patient,
            avatarColor:   selectedConsultation.color,
            type:          selectedConsultation.patientStatus === "new" ? "New Patient" : "Follow-up",
            notes:         selectedConsultation.additionalInfo ?? "",
            soap:          selectedConsultation.soap          ?? null,
            vitals:        selectedConsultation.vitals        ?? null,
            prescriptions: selectedConsultation.prescriptions ?? [],
          }}
          onClose={() => setSelectedConsultation(null)}
        />
      )}

    </DashboardLayout>
  );
}