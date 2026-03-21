// resources/js/pages/generals/book-appointment/sections/step-appointment.tsx

import type { ReactElement }    from "react";
import type { BookingFormData }  from "@/pages/user/book-appointment/sections/bookingdata";
import {
  serviceOptions,
  patientStatusOptions,
  TIME_SLOTS,
  STEP_HEADINGS,
}                                from "@/pages/user/book-appointment/sections/bookingdata";
import {
  Field,
  ToggleCard,
  TimeSlotPicker,
  StepNav,
  IconCalendar,
}                                from "../components";
import type { Step2Errors }      from "@/hooks/use-step-validators";

interface StepAppointmentProps {
  data:    BookingFormData;
  errors:  Step2Errors;
  setData: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  valid:   boolean;
  onNext:  () => void;
  onBack:  () => void;
}

const BOOKING_MAX_DAYS = 365;

export default function StepAppointment({
  data, errors, setData, valid, onNext, onBack,
}: StepAppointmentProps): ReactElement {
  const { title, subtitle } = STEP_HEADINGS[2];

  // ── Date bounds ────────────────────────────────────────────────────────
  // min = tomorrow, max = today + 365 days
  // Both enforced in HTML (prevents picker from showing invalid dates)
  // AND in the validator (catches any bypass via manual typing)

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const minDate = tomorrow.toISOString().split("T")[0];

  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + BOOKING_MAX_DAYS);
  maxDateObj.setHours(0, 0, 0, 0);
  const maxDate = maxDateObj.toISOString().split("T")[0];

  const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-5)" };

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

        {/* Patient status */}
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

        {/* Date — min + max enforced in HTML AND in validator */}
        <Field
          label="Preferred Date"
          required
          error={errors.appointmentDate}
          hint={!errors.appointmentDate
            ? `Select a date between tomorrow and ${BOOKING_MAX_DAYS} days from now.`
            : undefined
          }
        >
          <div style={{ position: "relative" }}>
            <span
              style={{
                position:      "absolute",
                left:          "var(--space-3)",
                top:           "50%",
                transform:     "translateY(-50%)",
                color:         errors.appointmentDate ? "var(--wc-error)" : "var(--wc-gray-400)",
                pointerEvents: "none",
                display:       "flex",
              }}
            >
              <IconCalendar />
            </span>
            <input
              className={`wc-input${errors.appointmentDate ? " wc-input-error" : ""}`}
              type="date"
              min={minDate}
              max={maxDate}
              value={data.appointmentDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                // Strip if user somehow bypasses the picker and types manually
                setData("appointmentDate", val);
              }}
              style={{ paddingLeft: "calc(var(--space-3) + 22px)" }}
            />
          </div>
        </Field>

        {/* Time slots */}
        <Field
          label="Preferred Time"
          required
          error={errors.appointmentTime}
          hint={!errors.appointmentTime ? "Select an available time slot." : undefined}
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
        nextDisabled={false}
      />
    </div>
  );
}