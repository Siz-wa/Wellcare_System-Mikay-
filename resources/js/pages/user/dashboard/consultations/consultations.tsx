// resources/js/pages/user/consultations/consultations.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Consultations page — thin composer. Uses shared DashboardLayout.

import { useState, useCallback } from "react";
import type { ReactElement }     from "react";
import { DashboardLayout }       from "../layout/dashboard-layout";
import { consultationsMeta, recentConsultations } from "./consultations-data";
import type { ConsultationRecord }                from "./consultations-data";
import { SearchFilterBar }    from "@/pages/user/dashboard/layout/components/search-filter-bar";
import { ConsultationsTable } from "./components/consultations-table";
import { SessionEditor }      from "./components/session-editor/session-editor";
import { IconPlus }           from "@/pages/user/dashboard/icons";

export default function ConsultationsPage(): ReactElement {
  const meta = consultationsMeta;

  const [query,      setQuery]      = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  const filtered: ConsultationRecord[] = recentConsultations.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.patient.toLowerCase().includes(q) || r.diagnosis.toLowerCase().includes(q);
  });

  const handleOpenEditor  = useCallback((): void => setEditorOpen(true),  []);
  const handleCloseEditor = useCallback((): void => setEditorOpen(false), []);

  return (
    <>
      <DashboardLayout activeId="consultations">

        {/* ── Page header ────────────────────────────────────────────────── */}
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
            }}>
              {meta.pageTitle}
            </h1>
            <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
              {meta.pageSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenEditor}
            className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
          >
            <IconPlus />
            {meta.startSessionLabel}
          </button>
        </div>

        {/* ── Search + Filters ───────────────────────────────────────────── */}
        <SearchFilterBar value={query} onChange={setQuery} />

        {/* ── Recent consultations table ──────────────────────────────────── */}
        <ConsultationsTable records={filtered} />

      </DashboardLayout>

      {/* Session Editor modal — outside layout flow so backdrop covers all */}
      {editorOpen && <SessionEditor onClose={handleCloseEditor} />}
    </>
  );
}