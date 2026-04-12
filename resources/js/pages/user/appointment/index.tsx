// resources/js/pages/patient/appointments/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// My Appointments — dedicated page.
// Route: /patient/appointments → inertia('patient/appointments/index')

import type { ReactElement }   from "react";
import { useEffect, useState } from "react";
import { DashboardLayout }     from "@/pages/doctor/layout/dashboard-layout";
import { patientNavGroups, patientTopbarMeta } from "../patient-nav-data";
import { PATIENT_ICON_MAP }    from "../constants/patient-icons";
import { mockAppointments, patientMeta, type Appointment, type AppointmentStatus } from "../patient-data";
import { UpcomingHeroCard }    from "./components/upcoming-hero-card";
import { AppointmentRowCard }  from "./components/appointment-row-card";
import { FilterTab }           from "./components/filter-tab";

type FilterState = "all" | AppointmentStatus;

function useMounted(delay = 0) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show;
}

export default function MyAppointmentsPage(): ReactElement {
  const [activeFilter, setActiveFilter] = useState<FilterState>("all");
  const headerVisible  = useMounted(0);
  const contentVisible = useMounted(80);

  const upcoming  = mockAppointments.filter(a => a.status === "upcoming");
  const completed = mockAppointments.filter(a => a.status === "completed");
  const cancelled = mockAppointments.filter(a => a.status === "cancelled");

  const filtered: Appointment[] =
    activeFilter === "all"       ? mockAppointments :
    activeFilter === "upcoming"  ? upcoming  :
    activeFilter === "completed" ? completed : cancelled;

  const tabs = [
    { id: "all"       as FilterState, label: "All",       count: mockAppointments.length },
    { id: "upcoming"  as FilterState, label: "Upcoming",  count: upcoming.length         },
    { id: "completed" as FilterState, label: "Completed", count: completed.length        },
    { id: "cancelled" as FilterState, label: "Cancelled", count: cancelled.length        },
  ];

  return (
    <DashboardLayout
      activeId="appointments"
      navGroups={patientNavGroups}
      iconMap={PATIENT_ICON_MAP}
      userMeta={patientTopbarMeta}
      avatarColor="var(--wc-sky-500)"
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: "var(--space-8)",
        opacity:    headerVisible ? 1 : 0,
        transform:  headerVisible ? "translateY(0)" : "translateY(14px)",
        transition: "opacity 380ms cubic-bezier(0.16,1,0.3,1), transform 380ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "#0f172a" }}>
            My Appointments
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "var(--text-base)" }}>
            Manage and track all your consultations
          </p>
        </div>
        <button
          type="button"
          className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.02)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="12" y1="14" x2="12" y2="20"/><line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
          {patientMeta.bookAppointmentLabel}
        </button>
      </div>

      {/* Upcoming hero */}
      {upcoming.length > 0 && <UpcomingHeroCard appt={upcoming[0]} visible={contentVisible} />}

      {/* Filter + list */}
      <div style={{
        background: "#fff", borderRadius: "var(--radius-5xl, 40px)",
        border: "1px solid #f1f5f9", padding: "var(--space-6)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        opacity:    contentVisible ? 1 : 0,
        transform:  contentVisible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1) 100ms, transform 420ms cubic-bezier(0.16,1,0.3,1) 100ms",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "#0f172a" }}>
            Appointment History
          </h2>
          <div style={{ display: "flex", gap: "var(--space-1)", background: "#f8fafc", padding: "4px", borderRadius: "var(--radius-full)", border: "1px solid #e2e8f0" }}>
            {tabs.map(tab => (
              <FilterTab key={tab.id} label={tab.label} count={tab.count} active={activeFilter === tab.id} onClick={() => setActiveFilter(tab.id)} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-12) 0" }}>
              <p style={{ margin: 0, fontSize: "var(--text-base)", color: "#64748b" }}>No {activeFilter} appointments found.</p>
            </div>
          ) : (
            filtered.map((appt, i) => (
              <AppointmentRowCard key={appt.id} appt={appt} index={i} visible={contentVisible} />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}