// resources/js/pages/generals/book-appointment/components/review-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Single label → value row inside a ReviewGroup card.
// Edit is handled at the card header level — no per-row edit button.
// Renders nothing when value is empty.

import type { ReactElement } from "react";

interface ReviewRowProps {
  label: string;
  value: string;
}

export function ReviewRow({ label, value }: ReviewRowProps): ReactElement {
  if (!value) return <></>;

  return (
    <div
      style={{
        display:      "flex",
        flexDirection: "column",
        padding:      "var(--space-3) 0",
        borderBottom: "1px solid var(--wc-gray-100)",
        gap:          "var(--space-1)",
      }}
    >
      <span
        style={{
          fontSize:      "var(--text-xs)",
          fontWeight:    600,
          color:         "var(--wc-gray-400)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize:   "var(--text-sm)",
          fontWeight: 600,
          color:      "var(--wc-dark)",
        }}
      >
        {value}
      </span>
    </div>
  );
}