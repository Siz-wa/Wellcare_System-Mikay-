// resources/js/pages/user/consultations/components/ConsultationDetailModal.tsx

import { ReactElement, ReactNode } from "react";
import { 
  IconClock, 
  IconCheck, 
  IconSearch, 
  IconBell, 
  IconSchedule
} from "@/pages/doctor/icons";

interface Prescription {
  medication: string;
  dosage: string;
  duration: string;
}

interface Consultation {
  id: string;
  patientName: string;
  patientId: string;
  date: string;
  time: string;
  type: string; // e.g., "Follow-up", "Initial"
  diagnosis: string;
  notes: string;
  prescriptions: Prescription[];
  avatarColor: string;
  initials: string;
}

interface ModalProps {
  consultation: Consultation;
  onClose: () => void;
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }): ReactElement {
  return (
    <h3 style={{ 
      margin: "0 0 16px 0", 
      fontSize: "11px", 
      fontWeight: 800, 
      color: "var(--wc-gray-400)", 
      textTransform: "uppercase", 
      letterSpacing: "0.06em" 
    }}>
      {title}
    </h3>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode, label: string, value: string }): ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "8px",
        background: "var(--wc-gray-50)", border: "1px solid var(--wc-gray-100)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--wc-blue-600)", flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: "10px", color: "var(--wc-gray-400)", fontWeight: 700, textTransform: "uppercase" }}>{label}</p>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--wc-dark)" }}>{value}</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ConsultationDetailModal({ consultation, onClose }: ModalProps): ReactElement {
  return (
    <div 
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, backdropFilter: "blur(6px)",
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: "#ffffff", width: "100%", maxWidth: "920px",
          borderRadius: "28px", padding: "40px", position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
          border: "1px solid var(--wc-gray-100)",
          display: "grid", gridTemplateColumns: "300px 1fr", gap: "40px"
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ position: "absolute", top: "24px", right: "24px", background: "none", border: "none", cursor: "pointer", color: "var(--wc-gray-300)" }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* LEFT COLUMN: Session Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ 
              width: "64px", height: "64px", borderRadius: "16px", 
              background: consultation.avatarColor, display: "flex", 
              alignItems: "center", justifyContent: "center",
              fontSize: "24px", fontWeight: 700, color: "white"
            }}>{consultation.initials}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--wc-dark)", letterSpacing: "-0.02em" }}>{consultation.patientName}</h2>
              <p style={{ margin: "2px 0 0", color: "var(--wc-gray-400)", fontSize: "12px", fontWeight: 500 }}>{consultation.patientId}</p>
            </div>
          </div>

          <div style={{ padding: "24px", border: "1px solid var(--wc-gray-100)", borderRadius: "20px" }}>
            <SectionHeader title="Session Details" />
            <InfoRow icon={<IconSchedule />} label="Date" value={consultation.date} />
            <InfoRow icon={<IconClock />} label="Time" value={consultation.time} />
            <InfoRow icon={<IconSearch />} label="Consultation Type" value={consultation.type} />
          </div>

          <div style={{ padding: "24px", border: "1px solid var(--wc-gray-100)", borderRadius: "20px", background: "var(--wc-blue-50)", borderColor: "rgba(59, 130, 246, 0.1)" }}>
             <SectionHeader title="Status" />
             <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--wc-blue-600)" }}>
                <IconCheck />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>Completed</span>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Diagnosis, Notes, Prescriptions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Final Diagnosis */}
          <div style={{ padding: "24px", border: "1px solid var(--wc-gray-100)", borderRadius: "20px" }}>
            <SectionHeader title="Final Diagnosis" />
            <div style={{ padding: "16px", background: "var(--wc-gray-50)", borderRadius: "12px", border: "1px solid var(--wc-gray-100)" }}>
               <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--wc-dark)" }}>{consultation.diagnosis}</p>
            </div>
          </div>

          {/* Clinical Notes */}
          <div style={{ padding: "24px", border: "1px solid var(--wc-gray-100)", borderRadius: "20px" }}>
            <SectionHeader title="Clinical Notes" />
            <p style={{ margin: 0, fontSize: "14px", color: "var(--wc-gray-600)", lineHeight: "1.6", fontWeight: 500 }}>
              {consultation.notes}
            </p>
          </div>

          {/* Prescriptions */}
          <div style={{ padding: "24px", border: "1px solid var(--wc-gray-100)", borderRadius: "20px", flex: 1 }}>
            <SectionHeader title="Prescriptions" />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {consultation.prescriptions.map((rx, idx) => (
                <div key={idx} style={{ 
                  display: "flex", alignItems: "center", justifyContent: "space-between", 
                  padding: "14px 20px", background: "var(--wc-gray-50)", borderRadius: "16px", border: "1px solid var(--wc-gray-100)" 
                }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "white", color: "var(--wc-blue-600)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--wc-gray-100)" }}>
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.5 3.5c4.7 0 8.5 3.8 8.5 8.5s-3.8 8.5-8.5 8.5-8.5-3.8-8.5-8.5 3.8-8.5 8.5-8.5z"/>
                          <path d="M10.5 12l5-5M10.5 12l-5 5"/>
                       </svg>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--wc-dark)" }}>{rx.medication}</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--wc-gray-400)", fontWeight: 500 }}>{rx.dosage} • {rx.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={onClose} style={{ height: "48px", padding: "0 28px", borderRadius: "14px", background: "var(--wc-gray-50)", color: "var(--wc-dark)", fontWeight: 700, border: "1px solid var(--wc-gray-100)", cursor: "pointer" }}>Close</button>
            <button style={{ height: "48px", padding: "0 28px", borderRadius: "14px", background: "var(--wc-blue-600)", color: "white", fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconBell /> Print Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}