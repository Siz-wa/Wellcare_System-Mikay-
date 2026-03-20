// resources/js/pages/generals/book-appointment/components/field.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Labeled form field wrapper with optional required marker, hint, and error.

import type { ReactElement, ReactNode } from "react";

interface FieldProps {
  label:     string;
  required?: boolean;
  error?:    string;
  hint?:     string;
  children:  ReactNode;
}

export function Field({ label, required, error, hint, children }: FieldProps): ReactElement {
  return (
    <div className="wc-field" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <label className="wc-label-text">
        {label}
        {required && (
          <span style={{ color: "var(--wc-error)", marginLeft: 3 }}>*</span>
        )}
      </label>

      {children}

      {hint  && !error && (
        <span className="wc-field-hint">{hint}</span>
      )}
      {error && (
        <span className="wc-field-hint" style={{ color: "var(--wc-error)" }}>
          {error}
        </span>
      )}
    </div>
  );
}