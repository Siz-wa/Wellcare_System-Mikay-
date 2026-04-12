// resources/js/pages/user/settings/components/patient-profile-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient-specific profile form.
// Fields: Full Name, Contact Number, Birthdate, Address, Company, Email.
// NO specialty / specialization / initials — those are doctor-only fields.

import { type ReactElement, useState } from "react";

const AVATAR_COLORS = [
  { value: "#0056b3", label: "Blue"   },
  { value: "#00a8e8", label: "Sky"    },
  { value: "#16a34a", label: "Green"  },
  { value: "#7c3aed", label: "Purple" },
  { value: "#dc2626", label: "Red"    },
  { value: "#ea580c", label: "Orange" },
  { value: "#0891b2", label: "Cyan"   },
  { value: "#64748b", label: "Slate"  },
];

function Field({ id, label, type = "text", placeholder, defaultValue, required, hint }: {
  id: string; label: string; type?: string; placeholder: string;
  defaultValue?: string; required?: boolean; hint?: string;
}): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-700)" }}>
        {label}{required && <span style={{ color: "var(--wc-error)" }}> *</span>}
      </label>
      <input
        id={id} name={id} type={type} placeholder={placeholder}
        defaultValue={defaultValue} required={required}
        className="wc-input"
        style={{ width: "100%", fontSize: "var(--text-sm)" }}
      />
      {hint && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>{hint}</p>}
    </div>
  );
}

interface PatientProfileFormProps {
  displayName?:        string;
  contactNumber?:      string;
  birthdate?:          string;
  address?:            string;
  company?:            string;
  email?:              string;
  initials?:           string;
  color?:              string;
  mustVerifyEmail?:    boolean;
  verificationStatus?: string;
}

export default function PatientProfileForm({
  displayName    = "",
  contactNumber  = "",
  birthdate      = "",
  address        = "",
  company        = "",
  email          = "",
  initials       = "MS",
  color          = "#0056b3",
  mustVerifyEmail = false,
  verificationStatus,
}: PatientProfileFormProps): ReactElement {
  const [selectedColor, setSelectedColor] = useState(color);
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

      {/* Avatar preview + color picker */}
      <div style={{ background: "var(--wc-gray-50)", borderRadius: "var(--radius-2xl)", padding: "var(--space-6)", border: "1px solid var(--wc-gray-200)" }}>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-gray-700)" }}>
          Profile Avatar
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "var(--radius-2xl)",
            background: selectedColor, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, boxShadow: "var(--shadow-md)",
          }}>
            <span style={{ color: "#fff", fontSize: "var(--text-xl)", fontWeight: 800 }}>
              {initials || "MS"}
            </span>
          </div>
          <div>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--wc-gray-400)", letterSpacing: "0.06em" }}>
              PROFILE COLOR
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {AVATAR_COLORS.map((c) => (
                <button key={c.value} type="button" title={c.label} onClick={() => setSelectedColor(c.value)} style={{
                  width: 28, height: 28, borderRadius: "var(--radius-lg)",
                  background: c.value, border: "none", cursor: "pointer",
                  outline: selectedColor === c.value ? `3px solid ${c.value}` : "3px solid transparent",
                  outlineOffset: "2px", transition: "outline var(--duration-base) var(--ease-out)",
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form fields — patient-specific only */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field id="display_name"   label="Full Name"       placeholder="e.g. Maria Santos"         defaultValue={displayName}   required />
        </div>
        <Field   id="contact_number" label="Contact Number"  placeholder="+63 9XX XXX XXXX"          defaultValue={contactNumber} type="tel" />
        <Field   id="birthdate"      label="Birthdate"       placeholder=""                          defaultValue={birthdate}     type="date" />
        <div style={{ gridColumn: "1 / -1" }}>
          <Field id="address"        label="Address"         placeholder="Street, City, Province"    defaultValue={address} />
        </div>
        <Field   id="company"        label="Company / Employer" placeholder="e.g. Wellcare Clinics" defaultValue={company} />
        <Field   id="email"          label="Email Address"   placeholder="maria@email.com"           defaultValue={email}         type="email" required />
      </div>

      {/* Email verification */}
      {mustVerifyEmail && (
        <div style={{ padding: "var(--space-4) var(--space-5)", borderRadius: "var(--radius-xl)", background: "#fefce8", border: "1px solid #fde047", fontSize: "var(--text-sm)", color: "#a16207", fontWeight: 500 }}>
          Your email address is unverified.{" "}
          <a href="/email/verification-notification" style={{ color: "var(--wc-blue-600)", fontWeight: 700, textDecoration: "underline" }}>
            Resend verification email.
          </a>
          {verificationStatus === "verification-link-sent" && (
            <p style={{ margin: "var(--space-2) 0 0", color: "#15803d", fontWeight: 600 }}>
              Verification link sent to your email address.
            </p>
          )}
        </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button type="button" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} className="wc-btn wc-btn-primary wc-btn-md">
          Save Changes
        </button>
        {saved && (
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-success)", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Saved!
          </span>
        )}
      </div>
    </div>
  );
}