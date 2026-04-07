// resources/js/components/StatusBadge.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Unified status badge for every page that shows a status pill.
// Used by: AppointmentList, Consultations, PatientRecords, LabReviews.
//
// Previously duplicated inline in:
//   dashboard/components/shared.tsx           ← update import after refactor
//   my-patients/patient-list-card.tsx         ← update import after refactor
//   lab-reviews/lab-submissions-card.tsx      ← update import after refactor
//
// New canonical import:
//   import { StatusBadge } from "@/components/StatusBadge";

import type { ReactElement } from "react";

// ── All status values across the entire app ───────────────────────────────────

export type BadgeStatus =
  // Appointment statuses
  | "confirmed"
  | "pending"
  | "cancelled"
  // Patient statuses
  | "stable"
  | "recovering"
  | "critical"
  | "observation"
  // Lab result statuses
  | "reviewed"
  | "normal";

interface StatusConfig {
  label:  string;
  bg:     string;
  color:  string;
  border: string;
}

const CONFIG: Record<BadgeStatus, StatusConfig> = {
  // ── Appointment ────────────────────────────────────────────────────────────
  confirmed:   { label: "CONFIRMED",   bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  pending:     { label: "PENDING",     bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  cancelled:   { label: "CANCELLED",  bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },

  // ── Patient ────────────────────────────────────────────────────────────────
  stable:      { label: "STABLE",      bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  recovering:  { label: "RECOVERING",  bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  critical:    { label: "CRITICAL",    bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  observation: { label: "OBSERVATION", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },

  // ── Lab ────────────────────────────────────────────────────────────────────
  reviewed:    { label: "REVIEWED",    bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  normal:      { label: "NORMAL",      bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: BadgeStatus;
  /** Override the display label — defaults to the config label */
  label?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatusBadge({ status, label }: StatusBadgeProps): ReactElement {
  const cfg = CONFIG[status];

  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "var(--space-1) var(--space-3)",
      borderRadius:  "var(--radius-lg)",
      background:    cfg.bg,
      color:         cfg.color,
      border:        `1px solid ${cfg.border}`,
      fontSize:      "var(--text-xs)",
      fontWeight:    700,
      letterSpacing: "0.06em",
      whiteSpace:    "nowrap",
    }}>
      {label ?? cfg.label}
    </span>
  );
}