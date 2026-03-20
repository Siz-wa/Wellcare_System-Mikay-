// resources/js/pages/generals/book-appointment/sections/step-review.tsx
// ────────────────────────────────────────────────────────────────────────────
// Step 4 — Review summary, additional info textarea, and submit button.

import type { ReactElement }            from "react";
import type { BookingFormData, StepId } from "../bookingdata";
import {
  genderOptions,
  serviceOptions,
  patientStatusOptions,
  coverageOptions,
  hmoOptions,
  REVIEW_LABELS,
  bookingMeta,
  STEP_HEADINGS,
}                                       from "../bookingdata";
import {
  ReviewRow,
  ReviewGroup,
  Field,
  StepNav,
  IconLock,
  IconMail,
}                                       from "../components";

// ── Helper ────────────────────────────────────────────────────────────────────

function resolveLabel(
  value: string,
  options: { value: string; label: string }[]
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StepReviewProps {
  data:         BookingFormData;
  errors:       Partial<Record<keyof BookingFormData, string>>;
  setData:      <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  isProcessing: boolean;
  onBack:       () => void;
  onGoToStep:   (s: StepId) => void;
}

export default function StepReview({
  data,
  errors,
  setData,
  isProcessing,
  onBack,
  onGoToStep,
}: StepReviewProps): ReactElement {
  const { title, subtitle }   = STEP_HEADINGS[4];
  const { disclaimer, hipaa } = bookingMeta;

  // 2-col inner grid used inside review group cards
  const twoColGrid: React.CSSProperties = {
    display:             "grid",
    gridTemplateColumns: "1fr 1fr",
    gap:                 "0 var(--space-4)",
  };

  return (
    <div>
      {/* Step heading */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <span
          className="wc-label"
          style={{ color: "var(--wc-sky-500)", display: "block", marginBottom: "var(--space-2)" }}
        >
          Step 4 of 4
        </span>
        <h2 style={{ marginBottom: "var(--space-1)" }}>{title}</h2>
        <p style={{ margin: 0 }}>{subtitle}</p>
      </div>

      {/* ── Summary cards ── */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:                 "var(--space-5)",
          marginBottom:        "var(--space-6)",
        }}
      >
        {/* ── Personal Info ── */}
        <ReviewGroup
          iconKey="personal"
          title="Personal Info"
          onEdit={() => onGoToStep(1)}
        >
          <div style={twoColGrid}>
            <ReviewRow
              label={REVIEW_LABELS.fullName}
              value={`${data.firstName} ${data.lastName}`.trim()}
            />
            <ReviewRow label={REVIEW_LABELS.ageGender} value={`${data.age} yrs · ${resolveLabel(data.gender, genderOptions)}`} />
            <ReviewRow label={REVIEW_LABELS.email}         value={data.email}         />
            <ReviewRow label={REVIEW_LABELS.contactNumber} value={data.contactNumber} />
          </div>
        </ReviewGroup>

        {/* ── Appointment ── */}
        <ReviewGroup
          iconKey="appointment"
          title="Appointment"
          onEdit={() => onGoToStep(2)}
        >
          <div style={twoColGrid}>
            <ReviewRow label={REVIEW_LABELS.service}         value={resolveLabel(data.service, serviceOptions)}             />
            <ReviewRow label={REVIEW_LABELS.patientStatus}   value={resolveLabel(data.patientStatus, patientStatusOptions)} />
            <ReviewRow label={REVIEW_LABELS.appointmentDate} value={data.appointmentDate}                                   />
            <ReviewRow label={REVIEW_LABELS.appointmentTime} value={data.appointmentTime}                                   />
          </div>
        </ReviewGroup>

        {/* ── Coverage & Doctor — full width ── */}
        <ReviewGroup
          iconKey="coverage"
          title="Coverage & Doctor"
          onEdit={() => onGoToStep(3)}
          fullWidth
        >
          <div style={twoColGrid}>
            <ReviewRow
              label={REVIEW_LABELS.coverage}
              value={resolveLabel(data.coverage, coverageOptions)}
            />
            {data.hmo && (
              <ReviewRow
                label={REVIEW_LABELS.hmo}
                value={resolveLabel(data.hmo, hmoOptions)}
              />
            )}
            {data.hmoId && (
              <ReviewRow label={REVIEW_LABELS.hmoId} value={data.hmoId} />
            )}
            {data.preferredDoctor && (
              <ReviewRow label={REVIEW_LABELS.preferredDoctor} value={data.preferredDoctor} />
            )}
          </div>
        </ReviewGroup>
      </div>

      {/* ── Additional info ── */}
      <Field
        label="Additional Information"
        hint="Optional — include anything else you'd like us to know about your visit."
        error={errors.additionalInfo}
      >
        <textarea
          className="wc-input wc-textarea"
          rows={4}
          placeholder="e.g. I have a known allergy to penicillin, or I need wheelchair access…"
          value={data.additionalInfo}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setData("additionalInfo", e.target.value)
          }
        />
      </Field>

      {/* ── Disclaimer ── */}
      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "var(--space-3)",
          marginTop:    "var(--space-5)",
          marginBottom: "var(--space-2)",
          padding:      "var(--space-4) var(--space-5)",
          borderRadius: "var(--radius-lg)",
          background:   "var(--wc-blue-50)",
          border:       "1px solid var(--wc-blue-100)",
          fontSize:     "var(--text-sm)",
          color:        "var(--wc-blue-700)",
        }}
      >
        <span style={{ color: "var(--wc-blue-600)", flexShrink: 0 }}>
          <IconMail />
        </span>
        {disclaimer}
      </div>

      {/* ── Nav ── */}
      <StepNav
        onBack={onBack}
        nextLabel="Submit Appointment Request"
        isSubmit
        isProcessing={isProcessing}
      />

      {/* HIPAA note */}
      <p
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "flex-end",
          gap:            "var(--space-1)",
          marginTop:      "var(--space-3)",
          fontSize:       "var(--text-xs)",
          color:          "var(--wc-gray-400)",
        }}
      >
        <IconLock /> {hipaa}
      </p>
    </div>
  );
}