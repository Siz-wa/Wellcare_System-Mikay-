// resources/js/pages/user/dashboard/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient dashboard — upcoming appointments, self check-in, and notification inbox.

import type { ReactElement }  from "react";
import { useState }           from "react";
import { router, usePage, Link } from "@inertiajs/react";
import type { PageProps }     from "@/types";
import WellcareLayout         from "@/layouts/app-gen-layout";

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

interface Stats {
  upcoming:  number;
  confirmed: number;
  pending:   number;
}

interface PageData extends PageProps {
  appointments:     AppointmentItem[];
  pastAppointments: AppointmentItem[];
  stats:            Stats;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): ReactElement {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    requested:   { label: "Pending Review",  bg: "#fef9c3", color: "#a16207" },
    confirmed:   { label: "Confirmed",       bg: "#dcfce7", color: "#15803d" },
    checked_in:  { label: "Checked In",      bg: "#dbeafe", color: "#1d4ed8" },
    in_progress: { label: "With Doctor",     bg: "#ede9fe", color: "#7c3aed" },
    completed:   { label: "Completed",       bg: "#f0fdf4", color: "#15803d" },
    cancelled:   { label: "Cancelled",       bg: "#fee2e2", color: "#b91c1c" },
  };
  const c = config[status] ?? { label: status, bg: "var(--wc-gray-100)", color: "var(--wc-gray-500)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: "100px", background: c.bg, color: c.color, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {c.label}
    </span>
  );
}



// ── Appointment card ──────────────────────────────────────────────────────────

function AppointmentCard({ appt }: { appt: AppointmentItem }): ReactElement {
  const [checking, setChecking] = useState(false);

  function handleCheckIn(): void {
    setChecking(true);
    router.post(`/user/appointments/${appt.id}/check-in`, {}, {
      onFinish: () => setChecking(false),
    });
  }

  const dateLabel = appt.isToday ? "Today" : appt.isTomorrow ? "Tomorrow" : appt.date;

  // Timeline steps
  const steps = [
    { key: "requested",   label: "Requested"   },
    { key: "confirmed",   label: "Confirmed"   },
    { key: "checked_in",  label: "Checked In"  },
    { key: "in_progress", label: "With Doctor" },
    { key: "completed",   label: "Completed"   },
  ];
  const stepIndex = steps.findIndex(s => s.key === appt.status);

  return (
    <div className="wc-card wc-card-hover" style={{ padding: "var(--space-5) var(--space-6)" }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div>
          <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-base)", fontWeight: 800, color: "var(--wc-dark)" }}>{appt.service}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: appt.isToday ? "var(--wc-blue-600)" : "var(--wc-gray-600)" }}>
              {dateLabel} · {appt.time}
            </p>
            {appt.doctor && (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-400)" }}>
                Dr. {appt.doctor.replace("Dr. ", "")}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      {/* Progress timeline */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "var(--space-4)" }}>
        {steps.map((step, i) => {
          const done    = i <  stepIndex;
          const current = i === stepIndex;
          const future  = i >  stepIndex;
          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: done ? "var(--wc-blue-600)" : current ? "var(--wc-blue-600)" : "var(--wc-gray-200)",
                  border: current ? "3px solid var(--wc-blue-200)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {done && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth={2.5}><polyline points="2 5 4 7 8 3"/></svg>}
                </div>
                <p style={{ margin: 0, fontSize: "9px", fontWeight: current ? 800 : 500, color: future ? "var(--wc-gray-300)" : done ? "var(--wc-blue-600)" : "var(--wc-dark)", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                  {step.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? "var(--wc-blue-600)" : "var(--wc-gray-200)", margin: "0 2px", marginBottom: "14px", transition: "background 0.3s" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Details row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--wc-gray-100)", paddingTop: "var(--space-4)" }}>
        <div style={{ display: "flex", gap: "var(--space-5)" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Coverage</p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", textTransform: "capitalize" }}>{appt.coverage}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Patient</p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", textTransform: "capitalize" }}>{appt.patientStatus}</p>
          </div>
        </div>

        {/* Check-in button — only shown when confirmed AND today */}
        {appt.canCheckIn && (
          <button
            onClick={handleCheckIn}
            disabled={checking}
            style={{
              height: 40, padding: "0 24px", borderRadius: "var(--radius-full)",
              background: "var(--wc-blue-600)", color: "#fff",
              border: "none", cursor: checking ? "not-allowed" : "pointer",
              fontSize: "var(--text-sm)", fontWeight: 700,
              opacity: checking ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: "6px",
              transition: "opacity 0.15s",
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            {checking ? "Checking in…" : "Check In Now"}
          </button>
        )}

        {appt.status === "confirmed" && !appt.canCheckIn && (
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontStyle: "italic" }}>
            Check-in available on {appt.isToday ? "today" : appt.date}
          </p>
        )}

        {appt.status === "requested" && (
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", fontStyle: "italic" }}>
            Awaiting doctor confirmation
          </p>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientDashboard(): ReactElement {
  const { props }                           = usePage<PageData>();
  const [showPast, setShowPast] = useState(false);

  const user = (props.auth as any)?.user;

  return (


    <WellcareLayout >



      {/* ── Main content ── */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>

        {/* Welcome */}
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--wc-dark)", fontFamily: "var(--font-display)" }}>
            Hello, <span className="wc-gradient-text">{user?.first_name ?? "there"}</span> 👋
          </h1>
          <p style={{ margin: 0, color: "var(--wc-gray-500)", fontSize: "var(--text-base)" }}>
           ⚠️⚠️⚠️ FOR TESTING LANG TO | DISABLED MUNA YUNG VALIDATOR FOR SMOOTH TESTING |THE REAL DASHBAORD IS IN DEVELOPMENT
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          {[
            { value: props.stats.upcoming,  label: "Upcoming",   color: "var(--wc-blue-600)" },
            { value: props.stats.confirmed, label: "Confirmed",  color: "#16a34a"            },
            { value: props.stats.pending,   label: "Pending",    color: "#ca8a04"            },
          ].map(s => (
            <div key={s.label} className="wc-card" style={{ padding: "var(--space-5)", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <span style={{ fontSize: "var(--text-3xl)", fontWeight: 800, color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</span>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-500)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming appointments */}
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
            My Appointments
          </h2>
          {props.appointments.length === 0 ? (
            <div className="wc-card" style={{ padding: "var(--space-12)", textAlign: "center" }}>
              <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--wc-gray-500)" }}>No upcoming appointments</p>
              <p style={{ margin: "0 0 var(--space-6)", fontSize: "var(--text-sm)", color: "var(--wc-gray-400)" }}>Book your first appointment to get started.</p>
              <Link href="/book" className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill">Book an Appointment</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {props.appointments.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </div>
          )}
        </div>

        {/* Past appointments */}
        {props.pastAppointments.length > 0 && (
          <div>
            <button
              onClick={() => setShowPast(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "var(--space-4)" }}
            >
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>Past Appointments</h2>
              <svg width="16" height="16" fill="none" stroke="var(--wc-gray-400)" strokeWidth={2.5} style={{ transform: showPast ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="2 5 8 11 14 5"/>
              </svg>
            </button>
            {showPast && (
              <div className="wc-card" style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Service", "Date", "Status"].map(col => (
                        <th key={col} style={{ padding: "10px var(--space-5)", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--wc-gray-100)" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {props.pastAppointments.map(a => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--wc-gray-100)" }}>
                        <td style={{ padding: "var(--space-4) var(--space-5)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)" }}>{a.service}</td>
                        <td style={{ padding: "var(--space-4) var(--space-5)", fontSize: "var(--text-sm)", color: "var(--wc-gray-500)" }}>{a.date} · {a.time}</td>
                        <td style={{ padding: "var(--space-4) var(--space-5)" }}><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
      </WellcareLayout>
    
  );
}