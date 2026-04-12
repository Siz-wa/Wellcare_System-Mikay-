// resources/js/pages/user/appointments/components/upcoming-hero-card.tsx
import type { ReactElement } from "react";
import { AvatarTile }        from "@/pages/doctor/layout/components/avatar-tile";
import type { Appointment }  from "../../patient-data";

interface Props { appt: Appointment; visible: boolean; }

export function UpcomingHeroCard({ appt, visible }: Props): ReactElement {
  return (
    <div style={{
      background:   "linear-gradient(135deg, var(--wc-blue-600) 0%, #0284c7 100%)",
      borderRadius: "var(--radius-5xl, 40px)",
      padding:      "var(--space-8)",
      color:        "#fff",
      position:     "relative",
      overflow:     "hidden",
      boxShadow:    "var(--shadow-brand)",
      marginBottom: "var(--space-6)",
      opacity:      visible ? 1 : 0,
      transform:    visible ? "translateY(0)" : "translateY(20px)",
      transition:   "opacity 440ms cubic-bezier(0.16,1,0.3,1) 60ms, transform 440ms cubic-bezier(0.16,1,0.3,1) 60ms",
    }}>
      <div style={{ position: "absolute", top: -40,  right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
      <div style={{ position: "absolute", bottom:-60, right:  60, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <span style={{
          display: "inline-block", marginBottom: "var(--space-5)",
          background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
          padding: "4px 14px", borderRadius: "var(--radius-full)",
          fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em",
        }}>
          UPCOMING APPOINTMENT
        </span>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-6)" }}>
          <div>
            {/* Date and Time updated to white token */}
            <p style={{ margin: "0 0 4px", fontSize: "var(--text-3xl)", fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--wc-white)" }}>
              {appt.date}
            </p>
            <p style={{ margin: "0 0 var(--space-5)", fontSize: "var(--text-lg)", fontWeight: 600, opacity: 0.85, color: "var(--wc-white)" }}>
              {appt.time}
            </p>
            
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <AvatarTile initials="DM" color="rgba(255,255,255,0.25)" size={44} shape="rounded" />
              <div>
                {/* Doctor Name and Specialty updated to white token */}
                <p style={{ margin: "0 0 2px", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--wc-white)" }}>{appt.doctor}</p>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", opacity: 0.75, color: "var(--wc-white)" }}>{appt.specialty}</p>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", opacity: 0.8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{appt.location}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", flexShrink: 0 }}>
            <button style={{ padding: "var(--space-3) var(--space-6)", borderRadius: "var(--radius-full)", background: "#fff", border: "none", color: "var(--wc-blue-600)", fontSize: "var(--text-sm)", fontWeight: 800, cursor: "pointer" }}>
              Reschedule
            </button>
            <button style={{ padding: "var(--space-3) var(--space-6)", borderRadius: "var(--radius-full)", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)", color: "#fff", fontSize: "var(--text-sm)", fontWeight: 700, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}