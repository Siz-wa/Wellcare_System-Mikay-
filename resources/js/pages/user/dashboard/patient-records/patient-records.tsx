// resources/js/pages/user/patient-records.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient Records page — thin composer.
//
// Reused from existing codebase (zero changes needed):
//   • DashboardLayout  → @/layouts/app  (AppSidebar + AppTopbar shell)
//
// New files specific to this page:
//   • patient-records/patient-records-data.ts   (all strings + mock records)
//   • patient-records/records-list-card.tsx     (Medical Records Archive table)

import type { ReactElement } from "react";
import { Link }              from "@inertiajs/react";
import { DashboardLayout }   from "../layout/dashboard-layout";
import { RecordsListCard }   from "./records-list-card";
import { myPatientsMeta }    from "./patient-records-data";

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconChevronLeft = (): ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconSearch = (): ReactElement => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconFilter = (): ReactElement => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="11" y1="18" x2="13" y2="18"/>
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientRecordsPage(): ReactElement {
  const meta = myPatientsMeta;

  return (
    <DashboardLayout activeId={meta.activeNav}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        {/* Back link */}
        <Link
          href="/dashboard"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "var(--space-2)",
            fontSize:       "var(--text-sm)",
            fontWeight:     500,
            color:          "var(--wc-gray-500)",
            textDecoration: "none",
            marginBottom:   "var(--space-4)",
            transition:     "color var(--duration-base) var(--ease-out)",
          }}
        >
          <IconChevronLeft />
          {meta.backLabel}
        </Link>

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
        <p style={{
          margin:     0,
          fontSize:   "var(--text-base)",
          color:      "var(--wc-gray-500)",
          lineHeight: 1.5,
        }}>
          {meta.pageSubtitle}
        </p>
      </div>

      {/* ── Search + Filter bar ───────────────────────────────────────────── */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "var(--space-3)",
        marginBottom: "var(--space-5)",
      }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{
            position:      "absolute",
            left:          "var(--space-4)",
            top:           "50%",
            transform:     "translateY(-50%)",
            color:         "var(--wc-gray-400)",
            display:       "flex",
            pointerEvents: "none",
          }}>
            <IconSearch />
          </span>
          <input
            type="search"
            className="wc-input"
            placeholder={meta.searchPlaceholder}
            style={{
              paddingLeft: "calc(var(--space-4) + 22px)",
              fontSize:    "var(--text-sm)",
              background:  "var(--wc-white)",
              border:      "1px solid var(--wc-gray-200)",
              width:       "100%",
            }}
          />
        </div>

        <button
          type="button"
          className="wc-btn wc-btn-outline wc-btn-md"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
        >
          <IconFilter />
          {meta.filtersLabel}
        </button>
      </div>

      {/* ── Medical Records Archive card ──────────────────────────────────── */}
      <RecordsListCard />

    </DashboardLayout>
  );
}