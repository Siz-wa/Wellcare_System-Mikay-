// resources/js/pages/hr/hmo-applications/components/loa-review-modal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen modal for reviewing, approving, or rejecting an HMO LOA application.

import { useState, type ReactElement } from "react";
import type { HmoApplication }         from "../../hr-data";
import { hrMeta }                      from "../../hr-data";

// ── Icons ─────────────────────────────────────────────────────────────────────

const CheckIcon = (): ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = (): ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CloseIcon = (): ReactElement => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }): ReactElement {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "var(--space-3) 0", borderBottom: "1px solid var(--wc-gray-100)" }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#94a3b8", flexShrink: 0, marginRight: "var(--space-4)" }}>
        {label}
      </span>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: accent ? "var(--wc-blue-600)" : "#0f172a", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }): ReactElement {
  return (
    <p style={{ margin: "0 0 var(--space-2)", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {label}
    </p>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  app:       HmoApplication;
  onClose:   () => void;
  onApprove: (id: string) => void;
  onReject:  (id: string, reason: string) => void;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function LoaReviewModal({ app, onClose, onApprove, onReject }: Props): ReactElement {
  const [rejectMode,   setRejectMode]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirming,   setConfirming]   = useState<"approve" | "reject" | null>(null);

  const isReadOnly = app.status !== "pending";

  const handleApprove = () => {
    if (confirming === "approve") { onApprove(app.id); onClose(); }
    else setConfirming("approve");
  };

  const handleReject = () => {
    if (confirming === "reject") { onReject(app.id, rejectReason); onClose(); }
    else { setRejectMode(true); setConfirming("reject"); }
  };

  const STATUS_CFG = {
    pending:  { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", label: "PENDING"  },
    approved: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "APPROVED" },
    rejected: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "REJECTED" },
  };
  const statusCfg = STATUS_CFG[app.status];

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "var(--space-6)" }}
    >
      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:         "100%",
          maxWidth:      680,
          maxHeight:     "90vh",
          overflowY:     "auto",
          background:    "#ffffff",
          borderRadius:  "var(--radius-3xl)",
          boxShadow:     "0 32px 64px -16px rgba(0,0,0,0.25)",
          display:       "flex",
          flexDirection: "column",
          // v1.6 modal entrance
          animation:     "modalIn 220ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-6) var(--space-6) var(--space-5)", borderBottom: "1px solid var(--wc-gray-100)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {/* Avatar */}
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-xl)", background: app.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "var(--text-sm)", fontWeight: 700, flexShrink: 0 }}>
              {app.initials}
            </div>
            <div>
              <h2 style={{ margin: "0 0 2px", fontSize: "var(--text-xl)", fontWeight: 800, color: "#0f172a" }}>
                {app.patientName}
              </h2>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#64748b" }}>
                {hrMeta.modalTitle} · {app.id.toUpperCase()}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ display: "inline-flex", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-lg)", background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.06em" }}>
              {statusCfg.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: "var(--radius-lg)", border: "1px solid var(--wc-gray-200)", background: "var(--wc-white)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "all 150ms ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-white)"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)", flex: 1 }}>

          {/* Patient info + Appointment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
            <div>
              <SectionHeader label={hrMeta.patientInfoLabel} />
              <DetailRow label="Patient No."  value={app.patientNumber} accent />
              <DetailRow label="HMO Provider" value={app.hmoProvider} />
              <DetailRow label="Card No."     value={app.hmoCardNumber} />
              <DetailRow label="Coverage"     value={app.coverageLimit} accent />
            </div>
            <div>
              <SectionHeader label={hrMeta.appointmentLabel} />
              <DetailRow label="Doctor"     value={app.doctor} />
              <DetailRow label="Specialty"  value={app.specialty} />
              <DetailRow label="Date"       value={app.appointmentDate} />
              <DetailRow label="Time"       value={app.appointmentTime} />
            </div>
          </div>

          {/* Clinical notes */}
          {app.diagnosis && (
            <div>
              <SectionHeader label={hrMeta.clinicalNotesLabel} />
              <div style={{ background: "var(--wc-gray-50)", borderRadius: "var(--radius-xl)", padding: "var(--space-4)", border: "1px solid var(--wc-gray-200)" }}>
                <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: 700, color: "#0f172a" }}>
                  Diagnosis: <span style={{ fontWeight: 500, color: "#64748b" }}>{app.diagnosis}</span>
                </p>
                {app.notes && (
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#64748b", lineHeight: 1.6 }}>
                    {app.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Approved LOA info (read-only) */}
          {app.status === "approved" && app.loaNumber && (
            <div style={{ background: "#f0fdf4", borderRadius: "var(--radius-xl)", padding: "var(--space-4)", border: "1px solid #bbf7d0" }}>
              <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-xs)", fontWeight: 700, color: "#15803d" }}>LOA ISSUED</p>
              <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-sm)", fontWeight: 700, color: "#0f172a" }}>{app.loaNumber}</p>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#64748b" }}>Approved by {app.approvedBy}</p>
            </div>
          )}

          {/* Rejected reason (read-only) */}
          {app.status === "rejected" && app.rejectedReason && (
            <div style={{ background: "#fef2f2", borderRadius: "var(--radius-xl)", padding: "var(--space-4)", border: "1px solid #fecaca" }}>
              <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-xs)", fontWeight: 700, color: "#b91c1c" }}>REJECTION REASON</p>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#64748b" }}>{app.rejectedReason}</p>
            </div>
          )}

          {/* Reject reason textarea (only when rejecting a pending app) */}
          {!isReadOnly && rejectMode && (
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "#334155", marginBottom: "var(--space-2)" }}>
                {hrMeta.rejectReasonLabel}
              </label>
              <textarea
                className="wc-input wc-textarea"
                rows={3}
                placeholder={hrMeta.rejectReasonPlaceholder}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ width: "100%", fontSize: "var(--text-sm)", resize: "vertical" }}
              />
              <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "#94a3b8" }}>
                {hrMeta.rejectReasonHint}
              </p>
            </div>
          )}
        </div>

        {/* Modal footer — action buttons */}
        {!isReadOnly && (
          <div style={{ padding: "var(--space-5) var(--space-6)", borderTop: "1px solid var(--wc-gray-100)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-3)", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "var(--space-3) var(--space-5)", borderRadius: "var(--radius-lg)", border: "1px solid var(--wc-gray-200)", background: "var(--wc-white)", color: "#64748b", fontSize: "var(--text-sm)", fontWeight: 600, cursor: "pointer", transition: "all 150ms ease" }}
            >
              {hrMeta.cancelLabel}
            </button>

            {/* Reject button */}
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectMode && rejectReason.trim().length < 5}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "var(--space-2)",
                padding:      "var(--space-3) var(--space-5)",
                borderRadius: "var(--radius-lg)",
                border:       "none",
                background:   confirming === "reject" ? "#dc2626" : "#fef2f2",
                color:        confirming === "reject" ? "#fff" : "#dc2626",
                fontSize:     "var(--text-sm)",
                fontWeight:   700,
                cursor:       rejectMode && rejectReason.trim().length < 5 ? "not-allowed" : "pointer",
                opacity:      rejectMode && rejectReason.trim().length < 5 ? 0.5 : 1,
                transition:   "all 150ms ease",
              }}
            >
              <XIcon />
              {confirming === "reject" ? "Confirm Rejection" : hrMeta.rejectLabel}
            </button>

            {/* Approve button */}
            {!rejectMode && (
              <button
                type="button"
                onClick={handleApprove}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "var(--space-2)",
                  padding:      "var(--space-3) var(--space-5)",
                  borderRadius: "var(--radius-lg)",
                  border:       "none",
                  background:   confirming === "approve" ? "#15803d" : "var(--wc-blue-600)",
                  color:        "#fff",
                  fontSize:     "var(--text-sm)",
                  fontWeight:   700,
                  cursor:       "pointer",
                  transition:   "all 150ms ease, transform 180ms cubic-bezier(0.16,1,0.3,1)",
                  boxShadow:    "var(--shadow-brand)",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px) scale(1.02)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
              >
                <CheckIcon />
                {confirming === "approve" ? "Confirm Approval" : hrMeta.approveLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal entrance animation */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
}