// resources/js/pages/user/dashboard/components/pending-lab-reviews.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Pending Lab Reviews card — avatar, test name, time, review button.

import type { ReactElement }                from "react";
import { pendingLabReviews, dashboardMeta } from "../dashboard-data";
import type { LabReview }                   from "../dashboard-data";
import { IconArrowRight }                   from "../icons";

// ── Single row ────────────────────────────────────────────────────────────────

function LabReviewRow({ review, reviewLabel }: { review: LabReview; reviewLabel: string }): ReactElement {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "var(--space-3)",
      padding:      "var(--space-4) 0",
      borderBottom: "1px solid var(--wc-gray-100)",
    }}>
      {/* Avatar */}
      <div style={{
        width:          40,
        height:         40,
        borderRadius:   "var(--radius-lg)",
        background:     review.color,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          "#ffffff",
        fontSize:       "var(--text-xs)",
        fontWeight:     700,
        flexShrink:     0,
      }}>
        {review.initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin:     0,
          fontSize:   "var(--text-sm)",
          fontWeight: 600,
          color:      "var(--wc-dark)",
          lineHeight: 1.3,
        }}>
          {review.name}
        </p>
        <p style={{
          margin:     0,
          fontSize:   "var(--text-xs)",
          color:      "var(--wc-gray-400)",
          lineHeight: 1.3,
        }}>
          {review.test}
        </p>
      </div>

      {/* Right: time + review link */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)", flexShrink: 0 }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
          {review.timeAgo}
        </span>
        <a
          href={`/lab-reviews/${review.id}`}
          style={{
            fontSize:       "var(--text-xs)",
            fontWeight:     600,
            color:          "var(--wc-sky-500)",
            textDecoration: "none",
          }}
        >
          {reviewLabel}
        </a>
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function PendingLabReviews(): ReactElement {
  const meta = dashboardMeta;

  return (
    <div className="wc-card" style={{ padding: "var(--space-6)" }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "var(--space-2)",
      }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
          {meta.pendingLabTitle}
        </h2>
        <a
          href="/lab-reviews"
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "var(--space-1)",
            fontSize:       "var(--text-sm)",
            fontWeight:     600,
            color:          "var(--wc-sky-500)",
            textDecoration: "none",
          }}
        >
          {meta.viewAll} <IconArrowRight />
        </a>
      </div>

      {/* Rows */}
      <div>
        {pendingLabReviews.map((review) => (
          <LabReviewRow key={review.id} review={review} reviewLabel={meta.reviewLabel} />
        ))}
      </div>
    </div>
  );
}