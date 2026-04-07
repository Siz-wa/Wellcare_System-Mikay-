// resources/js/pages/user/dashboard/components/pending-lab-reviews.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Pending Lab Reviews — rows stagger in on scroll, hover highlight,
// "Review" link slides in with an underline on hover.

import { useState }          from "react";
import type { ReactElement } from "react";
import { pendingLabReviews, dashboardMeta } from "../dashboard-data";
import type { LabReview }                   from "../dashboard-data";
import { IconArrowRight }                   from "../icons";
import { useInView }                        from "@/hooks/useInView";

// ── Single row ────────────────────────────────────────────────────────────────

interface LabReviewRowProps {
  review:      LabReview;
  reviewLabel: string;
  delay:       number;
  inView:      boolean;
}

function LabReviewRow({ review, reviewLabel, delay, inView }: LabReviewRowProps): ReactElement {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "var(--space-3)",
        padding:      "var(--space-4) var(--space-3)",
        borderBottom: "1px solid var(--wc-gray-100)",
        borderRadius: hovered ? "var(--radius-xl)" : "0",
        background:   hovered ? "var(--wc-gray-50)" : "transparent",
        marginInline: hovered ? "calc(-1 * var(--space-3))" : "0",
        cursor:       "pointer",
        // Staggered reveal
        opacity:    inView ? 1 : 0,
        transform:  inView ? "translateY(0)" : "translateY(12px)",
        transition: `
          opacity    350ms var(--ease-out) ${delay}ms,
          transform  350ms var(--ease-out) ${delay}ms,
          background 150ms var(--ease-out),
          border-radius 150ms var(--ease-out),
          margin     150ms var(--ease-out)
        `,
      }}
    >
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
        transition:     "transform 200ms var(--ease-spring)",
        transform:      hovered ? "scale(1.1)" : "scale(1)",
      }}>
        {review.initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.3 }}>
          {review.name}
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.3 }}>
          {review.test}
        </p>
      </div>

      {/* Time + Review link */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)", flexShrink: 0 }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
          {review.timeAgo}
        </span>
        <a
          href={`/lab-reviews/${review.id}`}
          style={{
            fontSize:        "var(--text-xs)",
            fontWeight:      600,
            color:           hovered ? "var(--wc-blue-600)" : "var(--wc-sky-500)",
            textDecoration:  "none",
            borderBottom:    hovered ? "1px solid var(--wc-blue-600)" : "1px solid transparent",
            paddingBottom:   "1px",
            transition:      "color 150ms var(--ease-out), border-color 150ms var(--ease-out)",
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
  const meta            = dashboardMeta;
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className="wc-card"
      style={{
        padding:    "var(--space-6)",
        opacity:    inView ? 1 : 0,
        transform:  inView ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 500ms var(--ease-out) 100ms, transform 500ms var(--ease-out) 100ms",
        willChange: "transform, opacity",
      }}
    >
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
            transition:     "color 150ms var(--ease-out)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-blue-600)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-sky-500)";  }}
        >
          {meta.viewAll} <IconArrowRight />
        </a>
      </div>

      {/* Rows */}
      <div>
        {pendingLabReviews.map((review, i) => (
          <LabReviewRow
            key={review.id}
            review={review}
            reviewLabel={meta.reviewLabel}
            delay={i * 60}
            inView={inView}
          />
        ))}
      </div>
    </div>
  );
}