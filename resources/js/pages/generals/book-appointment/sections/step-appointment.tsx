// resources/js/pages/generals/book-appointment/sections/step-appointment.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Appointment Details (service, branch, date, time, patient status).

import type { ReactElement }   from "react";
import type { BookingFormData } from "../bookingdata";
import {
  serviceOptions,
  patientStatusOptions,
  TIME_SLOTS,
  STEP_HEADINGS,
}                               from "../bookingdata";
import {
  Field,
  ToggleCard,
  TimeSlotPicker,
  StepNav,
  IconCalendar,
}                               from "../components";  // ← barrel

interface StepAppointmentProps {
  data:    BookingFormData;
  errors:  Partial<Record<keyof BookingFormData, string>>;
  setData: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  valid:   boolean;
  onNext:  () => void;
  onBack:  () => void;
}

export default function StepAppointment({
  data,
  errors,
  setData,
  valid,
  onNext,
  onBack,
}: StepAppointmentProps): ReactElement {
  const { title, subtitle } = STEP_HEADINGS[2];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

  const col: React.CSSProperties    = { display: "flex", flexDirection: "column", gap: "var(--space-5)" };

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <span className="wc-label" style={{ color: "var(--wc-sky-500)", display: "block", marginBottom: "var(--space-2)" }}>
          Step 2 of 4
        </span>
        <h2 style={{ marginBottom: "var(--space-1)" }}>{title}</h2>
        <p style={{ margin: 0 }}>{subtitle}</p>
      </div>

      <div style={col}>
        {/* Service */}
        <Field label="Service to be Availed" required error={errors.service}>
          <select
            className={`wc-input wc-select${errors.service ? " wc-input-error" : ""}`}
            value={data.service}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setData("service", e.target.value)}
          >
            {serviceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        {/* Patient status — icon toggle cards */}
        <Field label="Patient Record Status" required error={errors.patientStatus}>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            {patientStatusOptions.map((o) => (
              <ToggleCard
                key={o.value}
                value={o.value}
                label={o.label}
                iconKey={o.value}
                active={data.patientStatus === o.value}
                onClick={() => setData("patientStatus", o.value)}
              />
            ))}
          </div>
        </Field>

        {/* Date */}
        <Field
          label="Preferred Date"
          required
          error={errors.appointmentDate}
          hint="Select a date at least 1 day from today."
        >
          <div style={{ position: "relative" }}>
            <span
              style={{
                position:      "absolute",
                left:          "var(--space-3)",
                top:           "50%",
                transform:     "translateY(-50%)",
                color:         "var(--wc-gray-400)",
                pointerEvents: "none",
                display:       "flex",
              }}
            >
              <IconCalendar />
            </span>
            <input
              className={`wc-input${errors.appointmentDate ? " wc-input-error" : ""}`}
              type="date"
              min={tomorrow}
              value={data.appointmentDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setData("appointmentDate", e.target.value)
              }
              style={{ paddingLeft: "calc(var(--space-3) + 22px)" }}
            />
          </div>
        </Field>

        {/* Time slots */}
        <Field
          label="Preferred Time"
          required
          error={errors.appointmentTime}
          hint="Select an available time slot."
        >
          <TimeSlotPicker
            slots={TIME_SLOTS}
            value={data.appointmentTime}
            onChange={(v) => setData("appointmentTime", v)}
          />
        </Field>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue to Coverage"
        nextDisabled={!valid}
      />
    </div>
  );
}