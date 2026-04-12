// resources/js/pages/patient/dashboard/components/appointments-summary.tsx
import type { ReactElement } from "react";
import { Link }              from "@inertiajs/react";
import { mockAppointments, patientMeta } from "../../patient-data";
import { UpcomingCard }  from "./upcoming-card";
import { HistoryRow }    from "./history-row";

interface Props { visible: boolean; }

export function AppointmentsSummary({ visible }: Props): ReactElement {
  const upcoming = mockAppointments.filter(a => a.status === "upcoming");
  const history  = mockAppointments.filter(a => a.status !== "upcoming");

  return (
    <section style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(18px)",
      transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1), transform 420ms cubic-bezier(0.16,1,0.3,1)",
    }}>
      {upcoming.length > 0 ? (
        <UpcomingCard appt={upcoming[0]} />
      ) : (
        <div style={{
          borderRadius: "var(--radius-5xl, 40px)", border: "1.5px dashed var(--wc-gray-200)",
          padding: "var(--space-10)", textAlign: "center", marginBottom: "var(--space-5)",
        }}>
          <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-base)", color: "#64748b" }}>
            No upcoming appointments
          </p>
          <Link href="/patient/appointments" className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill">
            {patientMeta.bookAppointmentLabel}
          </Link>
        </div>
      )}

      <div className="wc-card" style={{ padding: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>
            {patientMeta.appointmentHistoryTitle}
          </h2>
          <Link
            href="/patient/appointments"
            style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-sky-500)", textDecoration: "none" }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-blue-600)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--wc-sky-500)")}
          >
            {patientMeta.viewAllLabel} →
          </Link>
        </div>
        {history.map((a, i) => (
          <HistoryRow key={a.id} appt={a} isLast={i === history.length - 1} index={i} />
        ))}
      </div>
    </section>
  );
}