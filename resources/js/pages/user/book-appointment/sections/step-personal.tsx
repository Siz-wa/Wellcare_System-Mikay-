// resources/js/pages/generals/book-appointment/sections/step-personal.tsx
// ──────────────────────────────────────────────────────────────────────────
// Step 1 — Personal Information fields only.
// Receives form data + setData + errors as props. No navigation logic.

import type { ReactElement }            from "react";
import type { BookingFormData }         from "@/pages/user/book-appointment/sections/bookingdata";
import { genderOptions, STEP_HEADINGS } from "@/pages/user/book-appointment/sections/bookingdata";
import { Field, StepNav }               from "../components";   // ← barrel

interface StepPersonalProps {
  data:    BookingFormData;
  errors:  Partial<Record<keyof BookingFormData, string>>;
  setData: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  valid:   boolean;
  onNext:  () => void;
}

export default function StepPersonal({
  data,
  errors,
  setData,
  valid,
  onNext,
}: StepPersonalProps): ReactElement {
  const { title, subtitle } = STEP_HEADINGS[1];

  const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" };
  const col: React.CSSProperties    = { display: "flex", flexDirection: "column", gap: "var(--space-5)" };

  return (
    <div>
      {/* Step heading */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <span className="wc-label" style={{ color: "var(--wc-sky-500)", display: "block", marginBottom: "var(--space-2)" }}>
          Step 1 of 4
        </span>
        <h2 style={{ marginBottom: "var(--space-1)" }}>{title}</h2>
        <p style={{ margin: 0 }}>{subtitle}</p>
      </div>

      {/* Fields */}
      <div style={col}>
        <div style={twoCol}>
          <Field label="First Name" required error={errors.firstName}>
            <input
              className={`wc-input${errors.firstName ? " wc-input-error" : ""}`}
              type="text"
              placeholder="e.g. Maria"
              value={data.firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData("firstName", e.target.value)}
            />
          </Field>
          <Field label="Last Name" required error={errors.lastName}>
            <input
              className={`wc-input${errors.lastName ? " wc-input-error" : ""}`}
              type="text"
              placeholder="e.g. Santos"
              value={data.lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData("lastName", e.target.value)}
            />
          </Field>
        </div>

        <div style={twoCol}>
          <Field label="Email Address" required error={errors.email}>
            <input
              className={`wc-input${errors.email ? " wc-input-error" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={data.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData("email", e.target.value)}
            />
          </Field>
          <Field label="Contact Number" required error={errors.contactNumber} hint="e.g. +63 9XX XXX XXXX">
            <input
              className={`wc-input${errors.contactNumber ? " wc-input-error" : ""}`}
              type="tel"
              placeholder="+63 9XX XXX XXXX"
              value={data.contactNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData("contactNumber", e.target.value)}
            />
          </Field>
        </div>

        <div style={twoCol}>
          <Field label="Age" required error={errors.age}>
            <input
              className={`wc-input${errors.age ? " wc-input-error" : ""}`}
              type="number"
              placeholder="e.g. 32"
              min={1}
              max={120}
              value={data.age}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData("age", e.target.value)}
            />
          </Field>
          <Field label="Biological Sex" required error={errors.gender}>
            <select
              className={`wc-input wc-select${errors.gender ? " wc-input-error" : ""}`}
              value={data.gender}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setData("gender", e.target.value)}
            >
              {genderOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <StepNav
        nextLabel="Continue to Appointment"
        nextDisabled={!valid}
        onNext={onNext}
      />
    </div>
  );
}