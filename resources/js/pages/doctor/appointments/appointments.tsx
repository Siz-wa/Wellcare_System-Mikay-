// resources/js/pages/doctor/dashboard/appointments/appointments.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Doctor's Appointments page — shows requested + confirmed upcoming appointments.
// Confirm action sends email to patient and creates an in-app notification.
// Separate from Consultations (which = active clinical sessions).

import type { ReactElement }   from "react";
import { useState }            from "react";
import { router, usePage }     from "@inertiajs/react";
import { DashboardLayout }     from "../layout/dashboard-layout";
import type { PageProps }      from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentItem {
  id:             number;
  patientId:      string;
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
  patientStatus:  string;
  coverage:       string;
  hmo:            string | null;
  status:         string;
  additionalInfo: string | null;
  isToday:        boolean;
  isTomorrow:     boolean;
}

interface Stats {
  pending:   number;
  confirmed: number;
  today:     number;
}

interface PageData extends PageProps {
  appointments: AppointmentItem[];
  stats:        Stats;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): ReactElement {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    requested:  { label: "Pending",   bg: "#fef9c3", color: "#a16207" },
    confirmed:  { label: "Confirmed", bg: "#dcfce7", color: "#15803d" },
    checked_in: { label: "Checked In", bg: "#dbeafe", color: "#1d4ed8" },
  };
  const c = config[status] ?? { label: status, bg: "var(--wc-gray-100)", color: "var(--wc-gray-500)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 12px", borderRadius: "100px",
      background: c.bg, color: c.color,
      fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
    }}>
      {c.label}
    </span>
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

// ── Cancel modal ──────────────────────────────────────────────────────────────

function CancelModal({ appointment, onClose }: { appointment: AppointmentItem; onClose: () => void }): ReactElement {
  const [reason, setReason] = useState("");
  const [busy,   setBusy]   = useState(false);

  function submit(): void {
    setBusy(true);
    router.post(`/doctor/appointments/${appointment.id}/cancel`, { reason }, {
      onFinish: () => { setBusy(false); onClose(); },
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 440, borderRadius: "20px", padding: "28px", boxShadow: "var(--shadow-2xl)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 6px", fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--wc-dark)" }}>Cancel Appointment</h3>
        <p style={{ margin: "0 0 20px", fontSize: "var(--text-sm)", color: "var(--wc-gray-500)" }}>
          This will notify <strong>{appointment.patient}</strong> via email.
        </p>
        <textarea
          className="wc-input wc-textarea"
          rows={3}
          placeholder="Reason for cancellation (optional)…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ marginBottom: "var(--space-5)" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <button onClick={onClose} style={{ height: 40, padding: "0 20px", borderRadius: "10px", border: "1px solid var(--wc-gray-200)", background: "transparent", fontWeight: 600, fontSize: "var(--text-sm)", cursor: "pointer", color: "var(--wc-gray-600)" }}>
            Keep
          </button>
          <button onClick={submit} disabled={busy} className="wc-btn wc-btn-danger wc-btn-md wc-btn-pill" style={{ opacity: busy ? 0.6 : 1 }}>
            {busy ? "Cancelling…" : "Cancel Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Appointment row ───────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  onCancel,
}: {
  appt:     AppointmentItem;
  onCancel: (a: AppointmentItem) => void;
}): ReactElement {
  const [confirming, setConfirming] = useState(false);

  function handleConfirm(): void {
    setConfirming(true);
    router.post(`/doctor/appointments/${appt.id}/confirm`, {}, {
      onFinish: () => setConfirming(false),
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
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "var(--wc-blue-600)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: 800, flexShrink: 0 }}>
            {appt.initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-dark)" }}>{appt.patient}</p>
            <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
              {appt.age} yrs · <span style={{ textTransform: "capitalize" }}>{appt.gender}</span> · {appt.patientStatus === "new" ? "New" : "Returning"}
            </p>
          </div>
        </div>
      </td>

      {/* Service */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)" }}>{appt.service}</p>
        <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", textTransform: "capitalize" }}>{appt.coverage}{appt.hmo ? ` · ${appt.hmo}` : ""}</p>
      </td>

      {/* Date / Time */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: appt.isToday ? "var(--wc-blue-600)" : "var(--wc-dark)" }}>{dateLabel}</p>
        <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>{appt.time}</p>
      </td>

      {/* Status */}
      <td style={{ padding: "var(--space-4) var(--space-5)" }}>
        <StatusBadge status={appt.status} />
      </td>

      {/* Actions */}
      <td style={{ padding: "var(--space-4) var(--space-5)", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          {appt.status === "requested" && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                height: 34, padding: "0 16px", borderRadius: "var(--radius-full)",
                background: "var(--wc-blue-600)", color: "#fff",
                border: "none", cursor: confirming ? "not-allowed" : "pointer",
                fontSize: "var(--text-xs)", fontWeight: 700,
                opacity: confirming ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {confirming ? "Confirming…" : "✓ Confirm"}
            </button>
          )}
          {["requested", "confirmed"].includes(appt.status) && (
            <button
              onClick={() => onCancel(appt)}
              style={{
                height: 34, padding: "0 14px", borderRadius: "var(--radius-full)",
                background: "transparent", color: "var(--wc-error)",
                border: "1px solid var(--wc-error)",
                cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 700,
              }}
            >
              Cancel
            </button>
          )}
          {appt.status === "confirmed" && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontWeight: 500 }}>
              Awaiting check-in
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DoctorAppointmentsPage(): ReactElement {
  const { props }                               = usePage<PageData>();
  const [cancelTarget, setCancelTarget]         = useState<AppointmentItem | null>(null);

  const today    = props.appointments.filter(a => a.isToday);
  const upcoming = props.appointments.filter(a => !a.isToday);

  return (
    <DashboardLayout activeId="appointments">
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>
            Appointments
          </h1>
          <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
            Review and confirm upcoming patient appointments
          </p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        <StatCard value={props.stats.pending}   label="Awaiting Confirmation" color="#ca8a04"          />
        <StatCard value={props.stats.confirmed} label="Confirmed"             color="#16a34a"          />
        <StatCard value={props.stats.today}     label="Today's Schedule"      color="var(--wc-blue-600)" />
      </div>

      {/* ── Today section ── */}
      {today.length > 0 && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: "var(--wc-blue-600)", flexShrink: 0, display: "inline-block" }} />
            <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700, color: "var(--wc-dark)" }}>Today</h2>
          </div>
          <div className="wc-card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Patient", "Service", "Time", "Status", "Actions"].map((col) => (
                    <th key={col} style={{ padding: "10px var(--space-5)", textAlign: col === "Actions" ? "right" : "left", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid var(--wc-gray-100)" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {today.map(a => <AppointmentRow key={a.id} appt={a} onCancel={setCancelTarget} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Upcoming section ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: "var(--wc-gray-300)", flexShrink: 0, display: "inline-block" }} />
          <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700, color: "var(--wc-dark)" }}>Upcoming</h2>
        </div>
        <div className="wc-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Patient", "Service", "Date / Time", "Status", "Actions"].map((col) => (
                  <th key={col} style={{ padding: "10px var(--space-5)", textAlign: col === "Actions" ? "right" : "left", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid var(--wc-gray-100)" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--wc-gray-400)", fontSize: "var(--text-sm)" }}>No upcoming appointments.</td></tr>
              ) : (
                upcoming.map(a => <AppointmentRow key={a.id} appt={a} onCancel={setCancelTarget} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}