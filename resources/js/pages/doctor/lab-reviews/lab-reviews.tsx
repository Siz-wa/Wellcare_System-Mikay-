// resources/js/pages/user/lab-reviews/lab-reviews.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Lab Reviews page — thin composer.
// Uses the shared DashboardLayout (sidebar + topbar already included).
// activeId="labreviews" highlights the correct nav item in the sidebar.
//
// Laravel route to add in web.php:
//   Route::get('/lab-reviews', [DashboardController::class, 'labReviews'])
//        ->name('lab-reviews');
//
// Controller method:
//   public function labReviews(): Response {
//     return Inertia::render('user/lab-reviews/lab-reviews');
//   }

import { useState }           from "react";
import type { ReactElement }  from "react";
import { DashboardLayout }    from "../layout/dashboard-layout";
import { labReviewsMeta, labResultDetails } from "./lab-reviews-data";
import { LabSubmissionsCard } from "./components/lab-submissions-card";
import { LaboratoryResultModal } from "./components/lab-reviews-modal";
import type { LabResultDetail }  from "./components/type";

// ── Search + Filter bar ───────────────────────────────────────────────────────

function SearchFilterBar(): ReactElement {
  const meta = labReviewsMeta;

  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "var(--space-3)",
      marginBottom: "var(--space-6)",
    }}>
      {/* Search */}
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
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
            height:      44,
          }}
        />
      </div>

      {/* Filter button */}
      <button
        type="button"
        className="wc-btn wc-btn-outline wc-btn-md"
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           "var(--space-2)",
          flexShrink:    0,
          height:        44,
          paddingInline: "var(--space-5)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
        {meta.filterLabel}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LabReviewsPage(): ReactElement {
  const meta = labReviewsMeta;

  // ── Modal state ────────────────────────────────────────────────────────────
  const [selectedResult, setSelectedResult] = useState<LabResultDetail | null>(null);

  function handleOpenModal(id: string): void {
    const detail = labResultDetails.find((r) => r.id === id) ?? null;
    setSelectedResult(detail);
  }

  function handleCloseModal(): void {
    setSelectedResult(null);
  }

  function handleValidate(id: string, notes: string): void {
    // TODO: wire up to your API / Inertia form submission
    console.log("Validated:", id, notes);
    setSelectedResult(null);
  }

  return (
    <DashboardLayout activeId={meta.activeNavId}>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        {/* Back link */}
        <a
          href={meta.backHref}
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            marginBottom:   "var(--space-4)",
            color:          "var(--wc-gray-400)",
            textDecoration: "none",
            transition:     `color var(--duration-base) var(--ease-out)`,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-blue-600)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-gray-400)"; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </a>

        {/* Title */}
        <h1 style={{
          margin:        "0 0 var(--space-1)",
          fontSize:      "clamp(1.75rem, 3vw, 2.25rem)",
          fontWeight:    800,
          letterSpacing: "-0.03em",
          lineHeight:    1.15,
          color:         "var(--wc-dark)",
          fontFamily:    "var(--font-display,'Bricolage Grotesque')",
        }}>
          {meta.pageTitle}
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-500)" }}>
          {meta.pageSubtitle}
        </p>
      </div>

      {/* ── Search + Filter ────────────────────────────────────────────── */}
      <SearchFilterBar />

      {/* ── Lab submissions list ───────────────────────────────────────── */}
      <LabSubmissionsCard onReview={handleOpenModal} />

      {/* ── Modal (portal-style, rendered at page root) ────────────────── */}
      {selectedResult !== null && (
        <LaboratoryResultModal
          result={selectedResult}
          onClose={handleCloseModal}
          onValidate={handleValidate}
        />
      )}

    </DashboardLayout>
  );
}