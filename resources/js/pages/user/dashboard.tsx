// resources/js/pages/user/dashboard/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient dashboard with:
//   - Upcoming appointment cards with timeline + check-in + cancel
//   - Past history slide-in panel grouped by patient with animated transitions
//   - Appointment detail view within the panel

import type { ReactElement }       from "react";
import { useState, useEffect }     from "react";
import { router, usePage, Link }   from "@inertiajs/react";
import { PatientDashboardLayout }  from "@/pages/user/layout/patient-dashboard-layout";
import type { PageProps }          from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentItem {
  id:             number;
  service:        string;
  date:           string;
  rawDate:        string;
  time:           string;
  status:         string;
  coverage:       string;
  patientStatus:  string;
  additionalInfo: string | null;
  canCheckIn:     boolean;
  isToday:        boolean;
  isTomorrow:     boolean;
  doctor:         string | null;
}

interface PastRecord {
  id:                 number;
  service:            string;
  date:               string;
  rawDate:            string;
  time:               string;
  status:             string;
  coverage:           string;
  patientStatus:      string;
  cancellationReason: string | null;
  doctor:             string | null;
  soap: {
    subjective:  string | null;
    objective:   string | null;
    assessment:  string | null;
    plan:        string | null;
  } | null;
  vitals: {
    bloodPressure:    string | null;
    heartRate:        string | null;
    temperature:      string | null;
    oxygenSaturation: string | null;
    weight:           string | null;
    height:           string | null;
  } | null;
}

interface PatientGroup {
  patient:  string;
  initials: string;
  records:  PastRecord[];
}

interface Stats {
  upcoming:  number;
  confirmed: number;
  pending:   number;
}

interface PageData extends PageProps {
  appointments:  AppointmentItem[];
  pastByPatient: PatientGroup[];
  stats:         Stats;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending_hmo_approval: { label: "HMO Verification", bg: "#f5f3ff", color: "#7c3aed" },
  requested:            { label: "Pending Review",   bg: "#fef9c3", color: "#a16207" },
  confirmed:            { label: "Confirmed",        bg: "#dcfce7", color: "#15803d" },
  checked_in:           { label: "Checked In",       bg: "#dbeafe", color: "#1d4ed8" },
  in_progress:          { label: "With Doctor",      bg: "#ede9fe", color: "#7c3aed" },
  completed:            { label: "Completed",        bg: "#f0fdf4", color: "#15803d" },
  cancelled:            { label: "Cancelled",        bg: "#fee2e2", color: "#b91c1c" },
  no_show:              { label: "No Show",          bg: "#f1f5f9", color: "#64748b" },
};

function StatusBadge({ status }: { status: string }): ReactElement {
  const c = STATUS_CONFIG[status] ?? { label: status, bg: "var(--wc-gray-100)", color: "var(--wc-gray-500)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 12px", borderRadius: "100px",
      background: c.bg, color: c.color,
      fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, color, icon }: { value: number; label: string; color: string; icon: ReactElement }): ReactElement {
  return (
    <div className="wc-card" style={{ padding: "var(--space-5) var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
      <div style={{ width: 52, height: 52, borderRadius: "var(--radius-xl)", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 14px -2px ${color}55` }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: "var(--text-3xl)", fontWeight: 800, color: "var(--wc-dark)", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "var(--font-display)" }}>{value}</p>
        <p style={{ margin: "3px 0 0", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--wc-gray-500)" }}>{label}</p>
      </div>
    </div>
  );
}

// ── Appointment card ──────────────────────────────────────────────────────────

function AppointmentCard({ appt, onCancel }: { appt: AppointmentItem; onCancel: (id: number) => void }): ReactElement {
  const [busy, setBusy] = useState(false);

  function handleCheckIn(): void {
    setBusy(true);
    router.post(`/user/appointments/${appt.id}/check-in`, {}, { onFinish: () => setBusy(false) });
  }

  const dateLabel = appt.isToday ? "Today" : appt.isTomorrow ? "Tomorrow" : appt.date;
  const isHmo     = appt.status === "pending_hmo_approval";
  const steps = isHmo
    ? [
        { key: "pending_hmo_approval", label: "HMO Review" },
        { key: "requested",            label: "Pending"    },
        { key: "confirmed",            label: "Confirmed"  },
        { key: "checked_in",           label: "Checked In" },
        { key: "completed",            label: "Completed"  },
      ]
    : [
        { key: "requested",   label: "Requested"   },
        { key: "confirmed",   label: "Confirmed"   },
        { key: "checked_in",  label: "Checked In"  },
        { key: "in_progress", label: "With Doctor" },
        { key: "completed",   label: "Completed"   },
      ];
  const stepIndex = steps.findIndex(s => s.key === appt.status);

  return (
    <div className="wc-card" style={{ padding: "var(--space-5) var(--space-6)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "var(--text-base)", fontWeight: 800, color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>{appt.service}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: appt.isToday ? "var(--wc-blue-600)" : "var(--wc-gray-600)" }}>{dateLabel} · {appt.time}</p>
            {appt.doctor && <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-400)" }}>{appt.doctor.startsWith("Dr.") ? appt.doctor : `Dr. ${appt.doctor}`}</p>}
          </div>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
        {steps.map((step, i) => {
          const done    = i < stepIndex;
          const current = i === stepIndex;
          const future  = i > stepIndex;
          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: done || current ? "var(--wc-blue-600)" : "var(--wc-gray-200)",
                  border: current ? "3px solid #bfdbfe" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: current ? "0 0 0 3px rgba(0,86,179,0.12)" : "none",
                }}>
                  {done && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg>}
                </div>
                <p style={{ margin: 0, fontSize: "9px", fontWeight: current ? 800 : 500, color: future ? "var(--wc-gray-300)" : done ? "var(--wc-blue-600)" : "var(--wc-dark)", whiteSpace: "nowrap" }}>
                  {step.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? "var(--wc-blue-600)" : "var(--wc-gray-200)", margin: "0 3px", marginBottom: "14px", borderRadius: 1 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--wc-gray-100)", paddingTop: "var(--space-4)" }}>
        <div style={{ display: "flex", gap: "var(--space-6)" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "9px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Coverage</p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", textTransform: "capitalize" }}>{appt.coverage}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "9px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Type</p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", textTransform: "capitalize" }}>{appt.patientStatus}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {appt.status === "pending_hmo_approval" && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#7c3aed", fontStyle: "italic" }}>HMO coverage is being verified</p>}
          {appt.status === "requested"             && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontStyle: "italic" }}>Awaiting doctor confirmation</p>}
          {appt.status === "confirmed" && !appt.canCheckIn && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontStyle: "italic" }}>Check-in available on {appt.isToday ? "today" : appt.date}</p>}
          {appt.canCheckIn && (
            <button
              onClick={handleCheckIn} disabled={busy}
              style={{
                height: 38, padding: "0 18px", borderRadius: "var(--radius-full)",
                background: "var(--wc-blue-600)", color: "#fff", border: "none",
                cursor: busy ? "not-allowed" : "pointer", fontSize: "var(--text-sm)", fontWeight: 700,
                opacity: busy ? 0.6 : 1, display: "flex", alignItems: "center", gap: "6px",
                boxShadow: "0 4px 12px -2px rgba(0,86,179,0.4)",
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              {busy ? "Checking in…" : "Check In Now"}
            </button>
          )}
          {["requested", "confirmed", "pending_hmo_approval"].includes(appt.status) && (
            <button
              onClick={() => onCancel(appt.id)}
              style={{
                height: 36, padding: "0 14px", borderRadius: "var(--radius-full)",
                background: "transparent", color: "var(--wc-error)",
                border: "1px solid var(--wc-error)", cursor: "pointer",
                fontSize: "var(--text-xs)", fontWeight: 700,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Past appointment detail view ──────────────────────────────────────────────

function RecordDetail({ record, onBack }: { record: PastRecord; onBack: () => void }): ReactElement {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 10); return () => clearTimeout(t); }, []);

  const hasSoap   = record.soap && Object.values(record.soap).some(v => v);
  const hasVitals = record.vitals && Object.values(record.vitals).some(v => v);

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        transform: mounted ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Back header */}
      <div style={{ padding: "18px var(--space-6)", borderBottom: "1px solid var(--wc-gray-100)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wc-gray-400)", padding: "4px", borderRadius: "8px", display: "flex", alignItems: "center" }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="12 18 6 12 12 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 800, color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>{record.service}</p>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>{record.date} · {record.time}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {/* Scrollable detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-6)" }}>

        {/* Info row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          {[
            { label: "Doctor",   value: record.doctor ? (record.doctor.startsWith("Dr.") ? record.doctor : `Dr. ${record.doctor}`) : "Not assigned" },
            { label: "Coverage", value: record.coverage },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "var(--space-4)", borderRadius: "12px", background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)" }}>
              <p style={{ margin: "0 0 3px", fontSize: "9px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", textTransform: "capitalize" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Cancellation reason */}
        {record.status === "cancelled" && record.cancellationReason && (
          <div style={{ padding: "var(--space-4)", borderRadius: "12px", background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "var(--space-5)" }}>
            <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.07em" }}>Reason for cancellation</p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "#b91c1c" }}>{record.cancellationReason}</p>
          </div>
        )}

        {/* SOAP notes */}
        {hasSoap && record.soap && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Clinical Notes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {[
                { key: "subjective",  label: "Subjective (Chief Complaint)" },
                { key: "objective",   label: "Objective (Findings)"         },
                { key: "assessment",  label: "Assessment (Diagnosis)"       },
                { key: "plan",        label: "Plan / Treatment"             },
              ].map(({ key, label }) => {
                const val = record.soap![key as keyof typeof record.soap];
                if (!val) return null;
                return (
                  <div key={key} style={{ padding: "var(--space-4)", borderRadius: "12px", background: "#fff", border: "1px solid var(--wc-gray-100)" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "var(--wc-blue-600)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-dark)", lineHeight: 1.6 }}>{val}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vitals */}
        {hasVitals && record.vitals && (
          <div>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Vitals</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              {[
                { label: "Blood Pressure",  value: record.vitals.bloodPressure,    unit: "mmHg" },
                { label: "Heart Rate",      value: record.vitals.heartRate,        unit: "bpm"  },
                { label: "Temperature",     value: record.vitals.temperature,      unit: "°C"   },
                { label: "O₂ Saturation",  value: record.vitals.oxygenSaturation, unit: "%"    },
                { label: "Weight",          value: record.vitals.weight,           unit: "kg"   },
                { label: "Height",          value: record.vitals.height,           unit: "cm"   },
              ].map(({ label, value, unit }) => {
                if (!value) return null;
                return (
                  <div key={label} style={{ padding: "var(--space-3) var(--space-4)", borderRadius: "10px", background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "9px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 800, color: "#0c4a6e" }}>
                      {value} <span style={{ fontSize: "10px", fontWeight: 500, color: "#0284c7" }}>{unit}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No consultation data */}
        {record.status === "completed" && !hasSoap && !hasVitals && (
          <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--wc-gray-400)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>No consultation notes recorded for this visit.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History panel (slide-in from right) ───────────────────────────────────────

function HistoryPanel({
  groups,
  onClose,
}: {
  groups:  PatientGroup[];
  onClose: () => void;
}): ReactElement {
  const [open,           setOpen]           = useState(false);
  const [selectedGroup,  setSelectedGroup]  = useState<PatientGroup | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PastRecord | null>(null);
  // Track which group is expanded
  const [expandedGroup,  setExpandedGroup]  = useState<string | null>(
    groups.length === 1 ? groups[0].patient : null
  );

  useEffect(() => { const t = setTimeout(() => setOpen(true), 10); return () => clearTimeout(t); }, []);

  function close(): void {
    setOpen(false);
    setTimeout(onClose, 300);
  }

  const totalRecords = groups.reduce((s, g) => s + g.records.length, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 499,
          background: "rgba(15,23,42,0.3)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        onClick={close}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 500,
          width: 460, background: "#fff",
          borderLeft: "1px solid var(--wc-gray-100)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.1)",
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
        }}
      >
        {/* ─ Detail view overlay ─ */}
        {selectedRecord && (
          <div style={{ position: "absolute", inset: 0, background: "#fff", zIndex: 10, overflow: "hidden" }}>
            <RecordDetail record={selectedRecord} onBack={() => setSelectedRecord(null)} />
          </div>
        )}

        {/* Panel header */}
        <div style={{ padding: "20px var(--space-6)", borderBottom: "1px solid var(--wc-gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 800, color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>Past Appointment History</p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
              {totalRecords} {totalRecords === 1 ? "record" : "records"} across {groups.length} {groups.length === 1 ? "patient" : "patients"}
            </p>
          </div>
          <button
            onClick={close}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wc-gray-400)", padding: "6px", borderRadius: "8px", display: "flex" }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Patient groups */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {groups.length === 0 ? (
            <div style={{ padding: "var(--space-12)", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-400)" }}>No past appointments yet.</p>
            </div>
          ) : (
            groups.map((group, gi) => {
              const isExpanded = expandedGroup === group.patient;
              return (
                <div key={group.patient} style={{ borderBottom: gi < groups.length - 1 ? "1px solid var(--wc-gray-100)" : "none" }}>
                  {/* Patient header — collapsible */}
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isExpanded ? null : group.patient)}
                    style={{
                      width: "100%", padding: "var(--space-4) var(--space-6)",
                      display: "flex", alignItems: "center", gap: "var(--space-3)",
                      background: isExpanded ? "var(--wc-blue-50)" : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: "10px",
                      background: `hsl(${(gi * 67 + 210) % 360}, 70%, 50%)`,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "var(--text-xs)", fontWeight: 800, flexShrink: 0,
                    }}>
                      {group.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-dark)" }}>{group.patient}</p>
                      <p style={{ margin: "1px 0 0", fontSize: "10px", color: "var(--wc-gray-400)" }}>
                        {group.records.length} {group.records.length === 1 ? "visit" : "visits"}
                      </p>
                    </div>
                    <svg
                      width="16" height="16" fill="none" stroke="var(--wc-gray-400)" strokeWidth={2.5}
                      style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", flexShrink: 0 }}
                    >
                      <polyline points="2 5 8 11 14 5"/>
                    </svg>
                  </button>

                  {/* Records list — animated expand */}
                  <div style={{
                    maxHeight: isExpanded ? `${group.records.length * 90}px` : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s cubic-bezier(0.16,1,0.3,1)",
                  }}>
                    {group.records.map((record, ri) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                        style={{
                          width: "100%", padding: "var(--space-4) var(--space-6) var(--space-4) calc(var(--space-6) + 50px)",
                          display: "flex", alignItems: "center", gap: "var(--space-4)",
                          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                          borderTop: "1px solid var(--wc-gray-100)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-gray-50)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      >
                        {/* Service icon */}
                        <div style={{ width: 36, height: 36, borderRadius: "10px", background: "var(--wc-blue-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--wc-blue-600)" }}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            {record.status === "completed"
                              ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                              : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
                            }
                          </svg>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-dark)" }}>{record.service}</p>
                          <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
                            {record.date} · {record.time}
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                          <StatusBadge status={record.status} />
                          {record.soap && (
                            <span style={{ fontSize: "9px", color: "var(--wc-blue-600)", fontWeight: 600 }}>Has notes</span>
                          )}
                        </div>

                        <svg width="14" height="14" fill="none" stroke="var(--wc-gray-300)" strokeWidth={2} style={{ flexShrink: 0 }}>
                          <polyline points="5 2 11 8 5 14"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientDashboard(): ReactElement {
  const { props }               = usePage<PageData>();
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch]     = useState("");

  const user      = props.auth?.user;
  const firstName = user?.first_name ?? "there";
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const filteredAppointments = search.trim()
    ? props.appointments.filter(a =>
        a.service.toLowerCase().includes(search.toLowerCase()) ||
        a.status.toLowerCase().includes(search.toLowerCase()) ||
        a.date.toLowerCase().includes(search.toLowerCase())
      )
    : props.appointments;

  function handleCancel(id: number): void {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    router.post(`/user/appointments/${id}/cancel`, {}, { preserveScroll: true });
  }

  const totalPast = props.pastByPatient.reduce((s, g) => s + g.records.length, 0);

  return (
    <PatientDashboardLayout activeId="dashboard">

      {/* Welcome */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>
          {greeting}, <span style={{ color: "var(--wc-blue-600)" }}>{firstName}</span> 👋
        </h1>
        <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
          Here's an overview of your appointments and health updates.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)", marginBottom: "var(--space-8)" }}>
        <StatCard value={props.stats.upcoming}  label="Upcoming Appointments" color="#2B59C3"
          icon={<svg width="22" height="22" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <StatCard value={props.stats.confirmed} label="Confirmed" color="#10B981"
          icon={<svg width="22" height="22" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
        <StatCard value={props.stats.pending}   label="Pending Review" color="#F97316"
          icon={<svg width="22" height="22" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      {/* My Appointments */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>My Appointments</h2>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            {totalPast > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                style={{
                  height: 34, padding: "0 16px", borderRadius: "var(--radius-full)",
                  background: "transparent", color: "var(--wc-blue-600)",
                  border: "1px solid var(--wc-blue-200)", cursor: "pointer",
                  fontSize: "var(--text-sm)", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                History ({totalPast})
              </button>
            )}
            <Link href="/book" className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill">+ Book New</Link>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "var(--space-5)" }}>
          <span style={{ position: "absolute", left: "var(--space-4)", top: "50%", transform: "translateY(-50%)", color: "var(--wc-gray-400)", display: "flex", pointerEvents: "none" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="search" className="wc-input"
            placeholder="Search by service, status or date…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "calc(var(--space-4) + 22px)", fontSize: "var(--text-sm)", width: "100%" }}
          />
        </div>

        {props.appointments.length === 0 ? (
          <div className="wc-card" style={{ padding: "var(--space-12)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "var(--radius-2xl)", background: "var(--wc-blue-50)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-4)" }}>
              <svg width="28" height="28" fill="none" stroke="var(--wc-blue-600)" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--wc-gray-600)" }}>No upcoming appointments</p>
            <p style={{ margin: "0 0 var(--space-6)", fontSize: "var(--text-sm)", color: "var(--wc-gray-400)" }}>Book your first appointment to get started.</p>
            <Link href="/book" className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill">Book an Appointment</Link>
          </div>
        ) : (
          <>
            {filteredAppointments.length === 0 && search && (
              <div className="wc-card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                <p style={{ margin: 0, color: "var(--wc-gray-400)", fontSize: "var(--text-sm)" }}>No appointments match "{search}".</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {filteredAppointments.map(a => <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} />)}
            </div>
          </>
        )}
      </div>

      {/* History slide panel */}
      {showHistory && (
        <HistoryPanel
          groups={props.pastByPatient}
          onClose={() => setShowHistory(false)}
        />
      )}
    </PatientDashboardLayout>
  );
}