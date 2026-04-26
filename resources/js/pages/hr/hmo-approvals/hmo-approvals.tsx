// resources/js/pages/hr/hmo-approvals/hmo-approvals.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HR / HMO Officer — full approval table with search, filtering, approve/reject.

import type { ReactElement } from "react";
import { useState, useCallback, useEffect } from "react";
import { router, usePage }   from "@inertiajs/react";
import { HRDashboardLayout } from "@/pages/hr/layout/hr-dashboard-layout";
import type { PageProps }    from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HmoAppointment {
  id:             number;
  patient:        string;
  initials:       string;
  email:          string;
  contactNumber:  string;
  age:            number;
  gender:         string;
  service:        string;
  date:           string;
  rawDate:        string;
  time:           string;
  hmo:            string | null;
  hmoId:          string | null;
  coverage:       string;
  patientStatus:  string;
  isToday:        boolean;
  isTomorrow:     boolean;
}

interface Stats {
  pending:       number;
  approvedToday: number;
  rejectedToday: number;
}

interface PageData extends PageProps {
  appointments: HmoAppointment[];
  stats:        Stats;
}

// ── Local toast ───────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type:    "success" | "error";
  key:     number;
}

function LocalToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }): ReactElement {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast.key]);

  const isSuccess = toast.type === "success";
  return (
    <div style={{
      position:     "fixed",
      bottom:       "32px",
      left:         "50%",
      transform:    "translateX(-50%)",
      zIndex:       9999,
      padding:      "14px 20px",
      borderRadius: "14px",
      background:   isSuccess ? "#f0fdf4" : "#fef2f2",
      border:       `1px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
      color:        isSuccess ? "#15803d" : "#b91c1c",
      fontSize:     "var(--text-sm)",
      fontWeight:   600,
      boxShadow:    "0 10px 40px -4px rgba(0,0,0,0.18)",
      display:      "flex",
      alignItems:   "center",
      gap:          "10px",
      minWidth:     280,
      maxWidth:     420,
    }}>
      {isSuccess ? (
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ) : (
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{
          marginLeft: "auto", background: "none", border: "none",
          cursor: "pointer", color: "inherit", opacity: 0.6,
          padding: 0, fontSize: "18px", lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show    = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, key: Date.now() });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  appointment,
  onClose,
  onSuccess,
  onError,
}: {
  appointment: HmoAppointment;
  onClose:     () => void;
  onSuccess:   (msg: string) => void;
  onError:     (msg: string) => void;
}): ReactElement {
  const [reason, setReason] = useState("");
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState("");

  function submit(): void {
    if (!reason.trim()) { setError("Please provide a reason for rejection."); return; }
    setBusy(true);
    router.post(`/hr/hmo-approvals/${appointment.id}/reject`, { reason }, {
      preserveScroll: true,
      onSuccess: () => {
        onClose();
        onSuccess(`Appointment for ${appointment.patient} has been rejected.`);
      },
      onError: () => {
        setBusy(false);
        onError("Failed to reject appointment. Please try again.");
      },
      onFinish: () => setBusy(false),
    });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", width: "100%", maxWidth: 500, borderRadius: "20px", padding: "var(--space-7)", boxShadow: "var(--shadow-2xl)", border: "1px solid var(--wc-gray-100)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          <div style={{ width: 40, height: 40, borderRadius: "12px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" stroke="#b91c1c" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--wc-dark)" }}>Reject HMO Appointment</h3>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--wc-gray-500)" }}>
              For <strong>{appointment.patient}</strong>
            </p>
          </div>
        </div>

        {/* Patient summary */}
        <div style={{ padding: "var(--space-4)", borderRadius: "12px", background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)", marginBottom: "var(--space-5)" }}>
          <div style={{ display: "flex", gap: "var(--space-5)" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase" }}>HMO Provider</p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)" }}>{appointment.hmo ?? "—"}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase" }}>HMO ID</p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", fontFamily: "monospace" }}>{appointment.hmoId ?? "—"}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase" }}>Appointment</p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)" }}>{appointment.date} · {appointment.time}</p>
            </div>
          </div>
        </div>

        {/* Reason field */}
        <div style={{ marginBottom: "var(--space-2)" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-500)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
            Reason for rejection *
          </label>
          <textarea
            rows={3}
            className={`wc-input${error ? " wc-input-error" : ""}`}
            placeholder="e.g. HMO ID not recognized, coverage expired, service not covered under this plan…"
            value={reason}
            onChange={e => { setReason(e.target.value); setError(""); }}
            style={{ width: "100%", resize: "vertical", fontSize: "var(--text-sm)" }}
          />
          {error && (
            <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--wc-error)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </p>
          )}
        </div>

        <p style={{ margin: "0 0 var(--space-5)", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
          The patient will be notified of this rejection and the reason provided.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <button onClick={onClose} className="wc-btn wc-btn-outline wc-btn-md wc-btn-pill">
            Cancel
          </button>
          <button
            onClick={submit} disabled={busy}
            style={{
              height: 44, padding: "0 24px", borderRadius: "var(--radius-full)",
              background: "var(--wc-error)", color: "#fff", border: "none",
              fontWeight: 700, fontSize: "var(--text-sm)",
              cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {busy ? "Rejecting…" : "Reject Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  onReject,
  onApproveSuccess,
  onApproveError,
}: {
  appt:             HmoAppointment;
  onReject:         (a: HmoAppointment) => void;
  onApproveSuccess: (msg: string) => void;
  onApproveError:   (msg: string) => void;
}): ReactElement {
  const [approving, setApproving] = useState(false);

  function handleApprove(): void {
    setApproving(true);
    router.post(`/hr/hmo-approvals/${appt.id}/approve`, {}, {
      preserveScroll: true,
      onSuccess: () => onApproveSuccess(`${appt.patient}'s appointment has been approved.`),
      onError:   () => onApproveError("Failed to approve appointment. Please try again."),
      onFinish:  () => setApproving(false),
    });
  }

  const dateLabel = appt.isToday ? "Today" : appt.isTomorrow ? "Tomorrow" : appt.date;

  return (
    <tr
      style={{ borderBottom: "1px solid var(--wc-gray-100)", transition: "background 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--wc-gray-50)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
    >
      {/* Patient */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ width: 38, height: 38, borderRadius: "10px", background: "var(--wc-blue-600)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: 800, flexShrink: 0 }}>
            {appt.initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-dark)" }}>{appt.patient}</p>
            <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
              {appt.age} yrs · <span style={{ textTransform: "capitalize" }}>{appt.gender}</span>
            </p>
          </div>
        </div>
      </td>

      {/* Service */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)" }}>{appt.service}</p>
      </td>

      {/* HMO details */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)" }}>{appt.hmo ?? "—"}</p>
        <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontFamily: "monospace" }}>{appt.hmoId ?? "—"}</p>
      </td>

      {/* Date */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: appt.isToday ? "var(--wc-blue-600)" : "var(--wc-dark)" }}>{dateLabel}</p>
        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>{appt.time}</p>
      </td>

      {/* Contact */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-600)" }}>{appt.email}</p>
        <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>{appt.contactNumber}</p>
      </td>

      {/* Actions */}
      <td style={{ padding: "var(--space-4) var(--space-5)", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button
            onClick={handleApprove} disabled={approving}
            style={{
              height: 34, padding: "0 16px", borderRadius: "var(--radius-full)",
              background: "#16a34a", color: "#fff", border: "none",
              cursor: approving ? "not-allowed" : "pointer",
              fontSize: "var(--text-xs)", fontWeight: 700,
              opacity: approving ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: "5px",
              transition: "opacity 0.15s",
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg>
            {approving ? "Approving…" : "Approve"}
          </button>
          <button
            onClick={() => onReject(appt)}
            style={{
              height: 34, padding: "0 14px", borderRadius: "var(--radius-full)",
              background: "transparent", color: "var(--wc-error)",
              border: "1px solid var(--wc-error)",
              cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 700,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }): ReactElement {
  return (
    <div className="wc-card" style={{ padding: "var(--space-5) var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
      <div style={{ width: 48, height: 48, borderRadius: "var(--radius-xl)", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</span>
      </div>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-500)" }}>{label}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HmoApprovalsPage(): ReactElement {
  const { props }                       = usePage<PageData>();
  const [rejectTarget, setRejectTarget] = useState<HmoAppointment | null>(null);
  const [search,       setSearch]       = useState("");
  const [hmoFilter,    setHmoFilter]    = useState("");

  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  // Client-side filter
  const filtered = props.appointments.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || (
      a.patient.toLowerCase().includes(q) ||
      (a.hmo ?? "").toLowerCase().includes(q) ||
      (a.hmoId ?? "").toLowerCase().includes(q) ||
      a.service.toLowerCase().includes(q)
    );
    const matchHmo = !hmoFilter || (a.hmo ?? "") === hmoFilter;
    return matchSearch && matchHmo;
  });

  // Unique HMO providers for filter dropdown
  const hmoProviders = [...new Set(props.appointments.map(a => a.hmo).filter(Boolean) as string[])];

  return (
    <HRDashboardLayout activeId="hmo-approvals">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>
            HMO Approvals
          </h1>
          <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
            Verify HMO coverage before appointments reach the doctor's queue
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <StatCard value={props.stats.pending}       label="Awaiting Review"  color="#8B5CF6" />
        <StatCard value={props.stats.approvedToday} label="Approved Today"   color="#16a34a" />
        <StatCard value={props.stats.rejectedToday} label="Rejected Today"   color="#b91c1c" />
      </div>

      {/* Info banner */}
      <div style={{ padding: "12px 18px", borderRadius: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", marginBottom: "var(--space-6)", display: "flex", alignItems: "center", gap: "10px" }}>
        <svg width="16" height="16" fill="none" stroke="#1d4ed8" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#1d4ed8" }}>
          <strong>Approving</strong> forwards the appointment to the assigned doctor's queue.
          <strong> Rejecting</strong> cancels it and notifies the patient with your reason.
        </p>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: "var(--space-4)", top: "50%", transform: "translateY(-50%)", color: "var(--wc-gray-400)", display: "flex", pointerEvents: "none" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="search"
            className="wc-input"
            placeholder="Search by patient name, HMO provider, or HMO ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "calc(var(--space-4) + 22px)", fontSize: "var(--text-sm)", width: "100%" }}
          />
        </div>
        {hmoProviders.length > 0 && (
          <select
            className="wc-input wc-select"
            value={hmoFilter}
            onChange={e => setHmoFilter(e.target.value)}
            style={{ fontSize: "var(--text-sm)", minWidth: 180 }}
          >
            <option value="">All HMO Providers</option>
            {hmoProviders.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="wc-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "var(--space-12)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--radius-2xl)", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-4)" }}>
              <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p style={{ margin: "0 0 4px", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--wc-gray-600)" }}>
              {search || hmoFilter ? "No results match your filter" : "No pending HMO appointments"}
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-400)" }}>
              {search || hmoFilter ? "Try adjusting your search." : "All HMO appointments have been reviewed."}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--wc-gray-50)" }}>
                {["Patient", "Service", "HMO / ID", "Date & Time", "Contact", "Actions"].map(col => (
                  <th
                    key={col}
                    style={{
                      padding: "10px var(--space-5)",
                      textAlign: col === "Actions" ? "right" : "left",
                      fontSize: "10px", fontWeight: 700,
                      color: "var(--wc-gray-400)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      borderBottom: "1px solid var(--wc-gray-100)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <AppointmentRow
                  key={a.id}
                  appt={a}
                  onReject={setRejectTarget}
                  onApproveSuccess={msg => showToast(msg)}
                  onApproveError={msg => showToast(msg, "error")}
                />
              ))}
            </tbody>
          </table>
        )}

        {/* Row count footer */}
        {filtered.length > 0 && (
          <div style={{ padding: "10px var(--space-5)", borderTop: "1px solid var(--wc-gray-100)", background: "var(--wc-gray-50)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontWeight: 500 }}>
              Showing {filtered.length} of {props.appointments.length} pending {props.appointments.length === 1 ? "appointment" : "appointments"}
            </p>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          appointment={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={msg => showToast(msg)}
          onError={msg => showToast(msg, "error")}
        />
      )}

      {/* Local toast */}
      {toast && <LocalToast toast={toast} onDismiss={dismissToast} />}

    </HRDashboardLayout>
  );
}