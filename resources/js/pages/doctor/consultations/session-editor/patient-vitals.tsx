// resources/js/pages/user/consultations/components/session-editor/patient-vitals.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient Vitals tab — 3×2 grid of vital sign input fields.

import type { ReactElement }          from "react";
import { vitalFields }                from "../consultations-data";
import type { VitalsFields }          from "../consultations-data";

interface PatientVitalsProps {
  values:   VitalsFields;
  onChange: (key: keyof VitalsFields, value: string) => void;
}

export function PatientVitals({ values, onChange }: PatientVitalsProps): ReactElement {
  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap:                 "var(--space-4)",
      alignContent:        "start",
    }}>
      {vitalFields.map((field) => (
        <div key={field.key}>
          {/* Label */}
          <p style={{
            margin:        "0 0 var(--space-2)",
            fontSize:      "var(--text-xs)",
            fontWeight:    700,
            color:         "var(--wc-gray-500)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}>
            {field.label}
          </p>

          {/* Input with unit suffix */}
          <div style={{
            display:      "flex",
            alignItems:   "center",
            borderRadius: "var(--radius-xl)",
            border:       "1px solid var(--wc-gray-200)",
            background:   "var(--wc-white)",
            overflow:     "hidden",
            transition:   "border-color var(--duration-base) var(--ease-out)",
          }}>
            <input
              type="text"
              value={values[field.key]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={{
                flex:       1,
                padding:    "var(--space-3) var(--space-4)",
                border:     "none",
                outline:    "none",
                fontSize:   "var(--text-sm)",
                fontWeight: 500,
                color:      "var(--wc-dark)",
                background: "transparent",
                fontFamily: "var(--font-sans, 'DM Sans')",
              }}
            />
            <span style={{
              padding:    "0 var(--space-3)",
              fontSize:   "var(--text-xs)",
              fontWeight: 700,
              color:      "var(--wc-gray-400)",
              flexShrink: 0,
            }}>
              {field.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}