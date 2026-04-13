// resources/js/pages/user/my-patients/my-patients.tsx

import { useState }          from "react";
import type { ReactElement } from "react";
import { Link, Head }        from "@inertiajs/react";
import { DashboardLayout }   from "../layout/dashboard-layout";
import { PatientListCard }   from "./components/patient-list-card";
import { myPatientsMeta }    from "./my-patient-data";

export default function MyPatientsPage(): ReactElement {
  const meta = myPatientsMeta;
  const [search, setSearch] = useState("");

  return (
    <DashboardLayout activeId="patients">
      <Head title={meta.pageTitle} />

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <Link
          href={meta.backHref}
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            marginBottom:   "var(--space-3)",
            color:          "var(--wc-gray-400)",
            textDecoration: "none",
            transition:     "color 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-blue-600)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-gray-400)"; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>

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

      {/* ── Search bar — full width, OUTSIDE the card ─────────────────────── */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "var(--space-3)",
        marginBottom:  "var(--space-6)",
        padding:       "var(--space-3) var(--space-5)",
        background:    "var(--wc-white)",
        borderRadius:  "var(--radius-xl)",
        border:        "1px solid var(--wc-gray-100)",
        boxShadow:     "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Search icon */}
        <span style={{ color: "var(--wc-gray-400)", display: "flex", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>

        {/* Input */}
        <input
          type="text"
          placeholder={meta.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

        {/* Filters button — right side */}
        <button
          type="button"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "var(--space-2)",
            flexShrink:     0,
            background:     "none",
            border:         "none",
            cursor:         "pointer",
            fontSize:       "var(--text-sm)",
            fontWeight:     600,
            color:          "var(--wc-gray-500)",
            padding:        "var(--space-1) var(--space-2)",
            borderRadius:   "var(--radius-md)",
            transition:     "color 0.15s ease",
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

      {/* ── Patient list card ──────────────────────────────────────────────── */}
      <PatientListCard search={search} />

    </DashboardLayout>
  );
}