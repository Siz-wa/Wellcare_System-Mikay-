// resources/js/pages/auth/register/steps/StepPersonal.tsx
import { Field, RadioGroup, errorBorder } from "@/pages/auth/register/components/register-ui";
import { genderOptions, civilStatusOptions } from "@/pages/auth/register/sections/register-data";
import type { RegisterFields, StepErrors } from "@/pages/auth/register/hooks/use-register-form";
import type { ChangeEvent } from "react";

interface StepPersonalProps {
  fields: RegisterFields;
  errors: StepErrors;
  set: (key: keyof RegisterFields) => (e: ChangeEvent<HTMLInputElement>) => void;
  setRadio: (key: keyof RegisterFields) => (v: string) => void;
}

export default function StepPersonal({ fields, errors, set, setRadio }: StepPersonalProps) {
  return (
    <>
      <Field label="Address" error={errors.address} required>
        <input
          type="text"
          name="address"
          value={fields.address}
          onChange={set("address")}
          tabIndex={1}
          placeholder="Street, Barangay, City"
          className="wc-input"
          style={errorBorder(errors.address)}
        />
      </Field>

      <Field label="Company" error={errors.company}>
        <input
          type="text"
          name="company"
          value={fields.company}
          onChange={set("company")}
          tabIndex={2}
          placeholder="Company or employer name (optional)"
          className="wc-input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Birthdate" error={errors.birthdate} required>
          <input
            type="date"
            name="birthdate"
            value={fields.birthdate}
            onChange={set("birthdate")}
            tabIndex={3}
            max={new Date().toISOString().split("T")[0]}
            className="wc-input"
            style={errorBorder(errors.birthdate)}
          />
        </Field>

        <Field label="Contact No." error={errors.contact_number} required>
          <input
            type="tel"
            name="contact_number"
            value={fields.contact_number}
            onChange={set("contact_number")}
            tabIndex={4}
            placeholder="09XX XXX XXXX"
            className="wc-input"
            style={errorBorder(errors.contact_number)}
          />
        </Field>
      </div>

      <Field label="Gender" required>
        <RadioGroup
          name="gender"
          options={genderOptions}
          value={fields.gender}
          onChange={setRadio("gender")}
          error={errors.gender}
        />
      </Field>

      <Field label="Civil Status" required>
        <RadioGroup
          name="civil_status"
          options={civilStatusOptions}
          value={fields.civil_status}
          onChange={setRadio("civil_status")}
          error={errors.civil_status}
        />
      </Field>
    </>
  );
}