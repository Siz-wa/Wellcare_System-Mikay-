// resources/js/pages/settings/components/patient/health-information-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient-only settings panel — maps to patient_medical + patient_profiles.

import { type ReactElement, useState } from "react";
import { healthInformationStrings }    from "../../settings-data";

function Field({ id, label, placeholder, defaultValue, hint }: { id: string; label: string; placeholder: string; defaultValue?: string; hint?: string }): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-700)" }}>{label}</label>
      <textarea
        id={id} name={id} placeholder={placeholder} defaultValue={defaultValue}
        rows={2}
        className="wc-input wc-textarea"
        style={{ width: "100%", fontSize: "var(--text-sm)", resize: "vertical" }}
      />
      {hint && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>{hint}</p>}
    </div>
  );
}

function SelectField({ id, label, options, defaultValue }: { id: string; label: string; options: string[]; defaultValue?: string }): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-700)" }}>{label}</label>
      <select id={id} name={id} defaultValue={defaultValue} className="wc-input" style={{ width: "100%", fontSize: "var(--text-sm)", height: 42 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function InputField({ id, label, placeholder, defaultValue, type = "text" }: { id: string; label: string; placeholder: string; defaultValue?: string; type?: string }): ReactElement {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-700)" }}>{label}</label>
      <input id={id} name={id} type={type} placeholder={placeholder} defaultValue={defaultValue} className="wc-input" style={{ width: "100%", fontSize: "var(--text-sm)" }} />
    </div>
  );
}

function SectionLabel({ children }: { children: string }): ReactElement {
  return (
    <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--wc-gray-400)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {children}
    </p>
  );
}

export default function HealthInformationForm(): ReactElement {
  const s = healthInformationStrings;
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

      {/* Medical basics */}
      <div>
        <SectionLabel>Medical Details</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "var(--space-5)", alignItems: "start" }}>
          <SelectField id="blood_type" label={s.bloodTypeLabel} options={s.bloodTypeOptions} />
          <Field id="allergies"  label={s.allergiesLabel}  placeholder={s.allergiesPlaceholder}  hint="Separate multiple entries with commas" />
        </div>
        <div style={{ marginTop: "var(--space-5)", display: "grid", gap: "var(--space-5)" }}>
          <Field id="conditions"  label={s.conditionsLabel}  placeholder={s.conditionsPlaceholder}  hint="List any chronic or existing medical conditions" />
          <Field id="medications" label={s.medicationsLabel} placeholder={s.medicationsPlaceholder} hint="Include dosage and frequency if known" />
        </div>
      </div>

      <div style={{ height: 1, background: "var(--wc-gray-100)" }} />

      {/* Emergency contact */}
      <div>
        <SectionLabel>Emergency Contact</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <InputField id="emergency_name"     label={s.emergencyNameLabel}     placeholder={s.emergencyNamePlaceholder} />
          <InputField id="emergency_phone"    label={s.emergencyPhoneLabel}    placeholder={s.emergencyPhonePlaceholder} type="tel" />
          <SelectField id="emergency_relation" label={s.emergencyRelationLabel} options={s.emergencyRelationOptions} />
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button type="button" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} className="wc-btn wc-btn-primary wc-btn-md">
          {s.saveLabel}
        </button>
        {saved && (
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-success)", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {s.savedLabel}
          </span>
        )}
      </div>
    </div>
  );
}