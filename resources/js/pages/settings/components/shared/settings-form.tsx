// resources/js/pages/user/settings/components/shared/profile-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared across Doctor / Nurse / HR — maps to doctor_profiles + users tables.

import { type ReactElement, useState } from "react";
import { profileStrings } from "../../settings-data";

// ── Avatar color palette (maps to doctor_profiles.color) ──────────────────────
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

// ── Input ─────────────────────────────────────────────────────────────────────

interface FieldProps {
  id:          string;
  label:       string;
  type?:       string;
  placeholder: string;
  defaultValue?: string;
  required?:   boolean;
  maxLength?:  number;
  hint?:       string;
}

function Field({ id, label, type = "text", placeholder, defaultValue, required, maxLength, hint }: FieldProps): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{
        fontSize: "var(--text-sm)", fontWeight: 600,
        color: "var(--wc-gray-700)",
      }}>
        {label}{required && <span style={{ color: "var(--wc-error)" }}> *</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        className="wc-input"
        style={{ width: "100%", fontSize: "var(--text-sm)" }}
      />
      {hint && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", margin: 0 }}>{hint}</p>
      )}
    </div>
  );
}

// ── Profile Form ──────────────────────────────────────────────────────────────

interface ProfileFormProps {
  /** Pre-filled from Inertia page props (doctor_profiles + users) */
  displayName?:       string;
  specialty?:         string;
  specialization?:    string;
  initials?:          string;
  color?:             string;
  email?:             string;
  /** Passed through from Fortify page props */
  mustVerifyEmail?:   boolean;
  verificationStatus?: string;
}

export default function ProfileForm({
  displayName    = "",
  specialty      = "",
  specialization = "",
  initials       = "",
  color          = "#0056b3",
  email          = "",
  mustVerifyEmail = false,
  verificationStatus,
}: ProfileFormProps): ReactElement {
  const s = profileStrings;
  const [selectedColor, setSelectedColor] = useState(color);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In real app: Form submission via Inertia
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

      {/* ── Avatar preview + color picker ──────────────────────────────── */}
      <div style={{
        background: "var(--wc-gray-50)", borderRadius: "var(--radius-2xl)",
        padding: "var(--space-6)", border: "1px solid var(--wc-gray-200)",
      }}>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-gray-700)" }}>
          {s.avatarSectionTitle}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          {/* Avatar preview */}
          <div style={{
            width: 72, height: 72, borderRadius: "var(--radius-2xl)",
            background: selectedColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "var(--shadow-md)",
          }}>
            <span style={{ color: "#fff", fontSize: "var(--text-xl)", fontWeight: 800, fontFamily: "var(--font-display)" }}>
              {initials || "DR"}
            </span>
          </div>

          {/* Color swatches */}
          <div>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--wc-gray-400)", letterSpacing: "0.06em" }}>
              {s.colorLabel.toUpperCase()}
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setSelectedColor(c.value)}
                  style={{
                    width: 28, height: 28, borderRadius: "var(--radius-lg)",
                    background: c.value, border: "none", cursor: "pointer",
                    outline: selectedColor === c.value ? `3px solid ${c.value}` : "3px solid transparent",
                    outlineOffset: "2px",
                    transition: "outline var(--duration-base) var(--ease-out)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form fields grid ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field
            id="display_name" label={s.displayNameLabel}
            placeholder={s.displayNamePlaceholder}
            defaultValue={displayName} required
          />
        </div>

        <Field
          id="specialty" label={s.specialtyLabel}
          placeholder={s.specialtyPlaceholder}
          defaultValue={specialty}
        />
        <Field
          id="specialization" label={s.specializationLabel}
          placeholder={s.specializationPlaceholder}
          defaultValue={specialization}
        />

        <Field
          id="initials" label={s.initialsLabel}
          placeholder={s.initialsPlaceholder}
          defaultValue={initials} maxLength={3}
          hint="Max 3 characters"
        />
        <Field
          id="email" label={s.emailLabel} type="email"
          placeholder={s.emailPlaceholder}
          defaultValue={email} required
        />
      </div>

      {/* ── Email verification notice (Fortify) ────────────────────────── */}
      {mustVerifyEmail && (
        <div style={{
          padding: "var(--space-4) var(--space-5)",
          borderRadius: "var(--radius-xl)",
          background: "#fefce8",
          border: "1px solid #fde047",
          fontSize: "var(--text-sm)",
          color: "#a16207",
          fontWeight: 500,
        }}>
          Your email address is unverified.{" "}
          <a href="/email/verification-notification" style={{ color: "var(--wc-blue-600)", fontWeight: 700, textDecoration: "underline" }}>
            Click here to resend the verification email.
          </a>
          {verificationStatus === "verification-link-sent" && (
            <p style={{ margin: "var(--space-2) 0 0", color: "#15803d", fontWeight: 600 }}>
              A new verification link has been sent to your email address.
            </p>
          )}
        </div>
      )}

      {/* ── Save button ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button
          type="button"
          onClick={handleSave}
          className="wc-btn wc-btn-primary wc-btn-md"
        >
          {s.saveLabel}
        </button>
        {saved && (
          <span style={{
            fontSize: "var(--text-sm)", fontWeight: 600,
            color: "var(--wc-success)", display: "flex", alignItems: "center", gap: "6px",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {s.savedLabel}
          </span>
        )}
      </div>
    </div>
  );
}