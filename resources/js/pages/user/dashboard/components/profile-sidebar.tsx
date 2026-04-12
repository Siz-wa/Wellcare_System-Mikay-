// resources/js/pages/patient/dashboard/components/profile-sidebar.tsx
import type { ReactElement } from "react";
import { AvatarTile }        from "@/pages/doctor/layout/components/avatar-tile";
import {
  mockPatientProfile, mockPatientMedical, mockPreferredDoctor, patientMeta,
} from "../../patient-data";
import { InfoRow }      from "./info-row";
import { QuickActions } from "./quick-actions";

interface Props { visible: boolean; }

export function ProfileSidebar({ visible }: Props): ReactElement {
  const profile   = mockPatientProfile;
  const medical   = mockPatientMedical;
  const doctor    = mockPreferredDoctor;
  const fullName  = `${profile.firstName} ${profile.lastName}`;
  const initials  = `${profile.firstName[0]}${profile.lastName[0]}`;
  const age       = new Date().getFullYear() - new Date(profile.birthdate).getFullYear();
  const genderLbl = patientMeta.genderLabels[profile.gender];
  const civilLbl  = patientMeta.civilStatusLabels[profile.civilStatus];
  const classLbl  = patientMeta.classificationLabels[profile.classification];
  const payLbl    = patientMeta.paymentLabels[medical.paymentMethod];

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "var(--space-5)",
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(18px)",
      transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1) 80ms, transform 420ms cubic-bezier(0.16,1,0.3,1) 80ms",
    }}>

      {/* Identity card */}
      <div className="wc-card" style={{ padding: "var(--space-6)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-5)", paddingBottom: "var(--space-5)", borderBottom: "1px solid var(--wc-gray-100)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-3)" }}>
            <AvatarTile initials={initials} color="var(--wc-blue-600)" size={72} shape="rounded" />
          </div>
          <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-base)", fontWeight: 800, color: "#0f172a" }}>{fullName}</h3>
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", color: "#64748b" }}>
            {genderLbl} · {age} yrs · {civilLbl}
          </p>
          <span style={{
            padding: "3px 12px", borderRadius: "var(--radius-full)", fontSize: "10px", fontWeight: 800,
            background: profile.classification === "old" ? "var(--wc-blue-50)" : "#f0fdf4",
            color:      profile.classification === "old" ? "var(--wc-blue-600)" : "#16a34a",
            border:     `1px solid ${profile.classification === "old" ? "var(--wc-blue-200)" : "#bbf7d0"}`,
          }}>
            {classLbl.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>{patientMeta.profileCardTitle}</h2>
          <button style={{ background: "none", border: "none", color: "var(--wc-blue-600)", fontWeight: 700, fontSize: "var(--text-xs)", cursor: "pointer" }}>
            {patientMeta.editProfileLabel}
          </button>
        </div>
        <InfoRow label={patientMeta.clientNoLabel}  value={profile.clientNumber} accent />
        <InfoRow label={patientMeta.contactLabel}   value={profile.contactNumber} />
        <InfoRow label={patientMeta.birthdateLabel} value={new Date(profile.birthdate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} />
        <InfoRow label={patientMeta.addressLabel}   value={profile.address} />
        <InfoRow label={patientMeta.companyLabel}   value={profile.company} />
      </div>

      {/* Medical info */}
      <div className="wc-card" style={{ padding: "var(--space-6)" }}>
        <h2 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>{patientMeta.medicalCardTitle}</h2>
        <InfoRow label={patientMeta.hmoLabel}           value={medical.hmo} />
        <InfoRow label={patientMeta.paymentLabel}        value={payLbl} />
        <InfoRow label={patientMeta.heightLabel}         value={`${medical.height} cm`} />
        <InfoRow label={patientMeta.weightLabel}         value={`${medical.weight} kg`} />
        <InfoRow label={patientMeta.bloodPressureLabel}  value={`${medical.bloodPressure} mmHg`} accent />
      </div>

      {/* Preferred doctor */}
      <div className="wc-card" style={{ padding: "var(--space-6)" }}>
        <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: 700, color: "#0f172a" }}>{patientMeta.doctorCardTitle}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <AvatarTile initials={doctor.initials} color={doctor.color} size={48} shape="rounded" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {doctor.displayName}
            </p>
            <p style={{ margin: "0 0 2px", fontSize: "var(--text-xs)", color: "#64748b" }}>{doctor.specialty}</p>
            <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>{doctor.specialization}</p>
          </div>
          {doctor.isActive && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a" }}>Active</span>
            </div>
          )}
        </div>
      </div>

      <QuickActions />
    </div>
  );
}