// resources/js/pages/user/settings/components/shared/security-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared across all roles. Maps to users table:
//   password, two_factor_secret, two_factor_recovery_codes, two_factor_confirmed_at

import { type ReactElement, useState } from "react";
import { securityStrings } from "../../settings-data";

// ── Password field with show/hide toggle ─────────────────────────────────────

function PasswordField({ id, label, placeholder }: { id: string; label: string; placeholder: string }): ReactElement {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-700)" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id} name={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="wc-input"
          style={{ width: "100%", fontSize: "var(--text-sm)", paddingRight: "44px" }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          style={{
            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--wc-gray-400)", display: "flex", padding: 0,
          }}
        >
          {visible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }): ReactElement {
  return (
    <div style={{ marginBottom: "var(--space-6)" }}>
      <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--wc-dark)" }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-500)" }}>
        {subtitle}
      </p>
    </div>
  );
}

// ── Security Form ─────────────────────────────────────────────────────────────

interface SecurityFormProps {
  twoFactorEnabled?:    boolean;
  canManageTwoFactor?:  boolean;
  requiresConfirmation?: boolean; // Fortify: whether password confirmation is required before 2FA toggle
}

export default function SecurityForm({
  twoFactorEnabled    = false,
  canManageTwoFactor  = true,
  requiresConfirmation = false,
}: SecurityFormProps): ReactElement {
  const s = profileStrings;
  const sec = securityStrings;
  const [saved, setSaved] = useState(false);
  const [twoFa, setTwoFa] = useState(twoFactorEnabled);

  const handleSavePassword = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>

      {/* ── Password section ───────────────────────────────────────────── */}
      <div>
        <SectionHeader title={sec.passwordTitle} subtitle={sec.passwordSubtitle} />
        <div style={{ display: "grid", gap: "var(--space-5)", maxWidth: "480px" }}>
          <PasswordField id="current_password" label={sec.currentPasswordLabel} placeholder="••••••••••••" />
          <PasswordField id="password"         label={sec.newPasswordLabel}     placeholder="New password" />
          <PasswordField id="password_confirmation" label={sec.confirmPasswordLabel} placeholder="Confirm password" />

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "var(--space-2)" }}>
            <button type="button" onClick={handleSavePassword} className="wc-btn wc-btn-primary wc-btn-md">
              {sec.savePasswordLabel}
            </button>
            {saved && (
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-success)", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Saved!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div style={{ height: "1px", background: "var(--wc-gray-100)" }} />

      {/* ── 2FA section ────────────────────────────────────────────────── */}
      {canManageTwoFactor && (
        <div>
          <SectionHeader title={sec.twoFactorTitle} subtitle={sec.twoFactorSubtitle} />

          {/* Status card */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "var(--space-5) var(--space-6)",
            borderRadius: "var(--radius-2xl)",
            border: `1px solid ${twoFa ? "var(--wc-blue-100)" : "var(--wc-gray-200)"}`,
            background: twoFa ? "var(--wc-blue-50)" : "var(--wc-gray-50)",
            maxWidth: "480px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "var(--radius-xl)",
                background: twoFa ? "var(--wc-blue-100)" : "var(--wc-gray-200)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={twoFa ? "var(--wc-blue-600)" : "var(--wc-gray-500)"} strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  {twoFa && <polyline points="9 12 11 14 15 10"/>}
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-dark)" }}>
                  {twoFa ? "2FA Enabled" : "2FA Disabled"}
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-500)" }}>
                  {twoFa ? sec.twoFactorEnabled : sec.twoFactorDisabled}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTwoFa(v => !v)}
              className={`wc-btn wc-btn-sm ${twoFa ? "wc-btn-danger" : "wc-btn-primary"}`}
            >
              {twoFa ? sec.disableLabel : sec.enableLabel}
            </button>
          </div>
        </div>
      )}

      {/* ── Privacy level indicator ─────────────────────────────────────── */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-5)",
        borderRadius: "var(--radius-full)",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        width: "fit-content",
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 800, color: "#15803d", letterSpacing: "0.05em" }}>
          {sec.privacyLabel}: {sec.privacyValue}
        </span>
      </div>

    </div>
  );
}

// Silence unused import warning from linter (used in icon only context)
const profileStrings = { savedLabel: "Saved!" };