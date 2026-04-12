// resources/js/pages/patient/doctors/components/doctor-card.tsx
import type { ReactElement } from "react";
import { Link }              from "@inertiajs/react";
import { AvatarTile }        from "@/pages/doctor/layout/components/avatar-tile";
import type { CareDoctor }   from "../../patient-data";
import { patientMeta }       from "../../patient-data";

interface Props { doctor: CareDoctor; index: number; visible: boolean; }

const CalendarIcon = (): ReactElement => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ClockIcon = (): ReactElement => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const PhoneIcon = (): ReactElement => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export function DoctorCard({ doctor, index, visible }: Props): ReactElement {
  const delay = index * 80;

  return (
    <div
      className="wc-card"
      style={{
        padding:    "var(--space-6)",
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 420ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 420ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, box-shadow 200ms ease`,
        cursor:     "default",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 30px -4px rgba(0,86,179,0.12)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Top: avatar + name + active dot */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
        <AvatarTile initials={doctor.initials} color={doctor.color} size={56} shape="rounded" />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
            <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {doctor.displayName}
            </h3>
          </div>
          <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-sm)", fontWeight: 600, color: "#0056b3" }}>
            {doctor.specialty}
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>
            {doctor.specialization}
          </p>
        </div>

        {/* Active / inactive badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: doctor.isActive ? "#16a34a" : "#94a3b8",
            display: "inline-block",
          }} />
          <span style={{ fontSize: "10px", fontWeight: 700, color: doctor.isActive ? "#16a34a" : "#94a3b8" }}>
            {doctor.isActive ? "Active" : "Away"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display:       "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap:           "var(--space-3)",
        marginBottom:  "var(--space-5)",
        padding:       "var(--space-4)",
        background:    "#f8fafc",
        borderRadius:  "var(--radius-xl)",
      }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 2px", fontSize: "var(--text-lg)", fontWeight: 800, color: "#0f172a" }}>
            {doctor.totalVisits}
          </p>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Visits
          </p>
        </div>
        <div style={{ textAlign: "center", borderInline: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 2px", fontSize: "var(--text-xs)", fontWeight: 700, color: "#0f172a" }}>
            {doctor.lastVisit}
          </p>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Last Visit
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 2px", fontSize: "var(--text-xs)", fontWeight: 700, color: "#0056b3" }}>
            {doctor.nextAvailable}
          </p>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Next Available
          </p>
        </div>
      </div>

      {/* Info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "#64748b" }}>
          <ClockIcon />
          <span style={{ fontSize: "var(--text-xs)" }}>{doctor.schedule}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "#64748b" }}>
          <PhoneIcon />
          <span style={{ fontSize: "var(--text-xs)" }}>{doctor.contact}</span>
        </div>
      </div>

      {/* Actions */}
      <Link
        href={`/user/appointments/book?doctor=${doctor.id}`}
        className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", width: "100%" }}
      >
        <CalendarIcon />
        {patientMeta.bookWithDoctorLabel}
      </Link>
    </div>
  );
}