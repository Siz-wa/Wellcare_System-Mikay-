// resources/js/pages/generals/book-appointment/sections/step-coverage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Mode of Coverage, HMO provider (conditional), preferred doctor.

import type { ReactElement }                    from "react";
import type { BookingFormData, CoverageOption } from "../bookingdata";
import { coverageOptions, hmoOptions, STEP_HEADINGS } from "../bookingdata";
import { Field, ToggleCard, StepNav }           from "../components";  // ← barrel

interface StepCoverageProps {
  data:    BookingFormData;
  errors:  Partial<Record<keyof BookingFormData, string>>;
  setData: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  valid:   boolean;
  onNext:  () => void;
  onBack:  () => void;
}

export default function StepCoverage({
  data,
  errors,
  setData,
  valid,
  onNext,
  onBack,
}: StepCoverageProps): ReactElement {
  const { title, subtitle } = STEP_HEADINGS[3];

  const handleCoverageChange = (value: string) => {
    setData("coverage", value);
    if (value !== "hmo") {
      setData("hmo", "");
      setData("hmoId", "");  // ← clear HMO ID too
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <span className="wc-label" style={{ color: "var(--wc-sky-500)", display: "block", marginBottom: "var(--space-2)" }}>
          Step 3 of 4
        </span>
        <h2 style={{ marginBottom: "var(--space-1)" }}>{title}</h2>
        <p style={{ margin: 0 }}>{subtitle}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

        {/* Coverage — 2×2 toggle grid */}
        <Field label="Mode of Coverage" required error={errors.coverage}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            {coverageOptions.map((o: CoverageOption) => (
              <ToggleCard
                key={o.value}
                value={o.value}
                label={o.label}
                iconKey={o.icon}
                active={data.coverage === o.value}
                onClick={() => handleCoverageChange(o.value)}
              />
            ))}
          </div>
        </Field>

        {/* HMO provider + ID — only when HMO selected */}
        {data.coverage === "hmo" && (
          <>
            <Field label="HMO Provider" required error={errors.hmo}>
              <select
                className={`wc-input wc-select${errors.hmo ? " wc-input-error" : ""}`}
                value={data.hmo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setData("hmo", e.target.value)}
              >
                {hmoOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field
              label="HMO ID Number"
              required
              error={errors.hmoId}
              hint="Enter the ID number found on your HMO card."
            >
              <input
                className={`wc-input${errors.hmoId ? " wc-input-error" : ""}`}
                type="text"
                placeholder="e.g. MC-123456789"
                value={data.hmoId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setData("hmoId", e.target.value)
                }
              />
            </Field>
          </>
        )}

        {/* Preferred doctor — optional */}
        <Field
          label="Name of Preferred Doctor"
          hint="Optional — leave blank and we'll assign the next available doctor."
        >
          <input
            className="wc-input"
            type="text"
            placeholder="e.g. Dr. Maria Santos"
            value={data.preferredDoctor}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setData("preferredDoctor", e.target.value)
            }
          />
          <a
            href="/doctors"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize:  "var(--text-xs)",
              color:     "var(--wc-sky-500)",
              marginTop: "var(--space-1)",
              display:   "inline-block",
            }}
          >
            View full list of doctors per branch →
          </a>
        </Field>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Review Appointment"
        nextDisabled={!valid}
      />
    </div>
  );
}