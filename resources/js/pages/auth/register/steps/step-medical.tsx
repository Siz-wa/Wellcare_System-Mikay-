// resources/js/pages/auth/register/steps/StepMedical.tsx
import { Field, errorBorder } from "@/pages/auth/register/components/register-ui";
import type { RegisterFields, StepErrors } from "@/pages/auth/register/hooks/use-register-form";
import type { ChangeEvent } from "react";

interface StepMedicalProps {
  fields: RegisterFields;
  errors: StepErrors;
  set: (key: keyof RegisterFields) => (e: ChangeEvent<HTMLInputElement>) => void;
  setRadio: (key: keyof RegisterFields) => (v: string) => void;
}

export default function StepMedical({ fields, errors, set }: StepMedicalProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Height (cm)" error={errors.height}>
          <input
            type="number"
            name="height"
            value={fields.height}
            onChange={set("height")}
            tabIndex={1}
            placeholder="165"
            min={50}
            max={250}
            className="wc-input"
            style={errorBorder(errors.height)}
          />
        </Field>

        <Field label="Weight (kg)" error={errors.weight}>
          <input
            type="number"
            name="weight"
            value={fields.weight}
            onChange={set("weight")}
            tabIndex={2}
            placeholder="60"
            min={1}
            max={300}
            className="wc-input"
            style={errorBorder(errors.weight)}
          />
        </Field>

        <Field label="BP (mmHg)" error={errors.blood_pressure}>
          <input
            type="text"
            name="blood_pressure"
            value={fields.blood_pressure}
            onChange={set("blood_pressure")}
            tabIndex={3}
            placeholder="120/80"
            className="wc-input"
            style={errorBorder(errors.blood_pressure)}
          />
        </Field>
      </div>

      <Field label="HMO Provider" error={errors.hmo}>
        <input
          type="text"
          name="hmo"
          value={fields.hmo}
          onChange={set("hmo")}
          tabIndex={4}
          placeholder="e.g. Maxicare, Medicard (optional)"
          className="wc-input"
        />
      </Field>
    </>
  );
}