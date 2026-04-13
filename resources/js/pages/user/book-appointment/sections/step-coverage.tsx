// resources/js/pages/generals/book-appointment/sections/step-coverage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from previous version:
//   - Receives `doctors: DoctorOption[]` as a prop (from Inertia page prop)
//     instead of importing the hardcoded doctorsData array.
//   - `data.doctorId` (number | null) replaces `data.preferredDoctor` (string).
//   - DoctorPicker now receives `value: number | null` and calls back with
//     the doctor's numeric id, not their display name.
//   - Filtering still uses SERVICE_TO_SPECIALTIES but matches against the
//     `specialty` field on DoctorOption (same string values as doctorsData).

import type { ReactElement }                          from "react";
import { useMemo }                                    from "react";
import type { BookingFormData, CoverageOption, DoctorOption } from "./bookingdata";
import {
  coverageOptions,
  hmoOptions,
  STEP_HEADINGS,
  SERVICE_TO_SPECIALTIES,
}                                                     from "./bookingdata";
import { Field, ToggleCard, StepNav, DoctorPicker }   from "../components";
import { sanitizeHmoId, makePasteHandler }            from "../utils/sanitizers";
import type { Step3Errors }                           from "@/hooks/use-step-validators";

// ── Props ─────────────────────────────────────────────────────────────────────

interface StepCoverageProps {
  data:    BookingFormData;
  errors:  Step3Errors;
  setData: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  valid:   boolean;
  onNext:  () => void;
  onBack:  () => void;
  /** Active doctors fetched from the DB, passed down from the Inertia page prop */
  doctors: DoctorOption[];
}

const HMO_MAX = 20;

// ── Component ─────────────────────────────────────────────────────────────────

export default function StepCoverage({
  data, errors, setData, valid, onNext, onBack, doctors,
}: StepCoverageProps): ReactElement {
  const { title, subtitle } = STEP_HEADINGS[3];

  // ── Filter doctors by the service chosen in Step 2 ────────────────────────
  const filteredDoctors = useMemo<DoctorOption[]>(() => {
    const specialties = SERVICE_TO_SPECIALTIES[data.service] ?? null;

    if (!specialties) return doctors;   // null = show all

    return doctors.filter(
      (d) =>
        specialties.includes(d.specialty as (typeof specialties)[number]) ||
        d.specialty === "In-House"
    );
  }, [data.service, doctors]);

  const serviceLabel = filteredDoctors.length < doctors.length
    ? `Showing ${filteredDoctors.length} doctor${filteredDoctors.length !== 1 ? "s" : ""} for your selected service`
    : "Optional — search our roster or leave blank for next available.";

  const handleCoverageChange = (value: string) => {
    setData("coverage", value);
    if (value !== "hmo") {
      setData("hmo",   "");
      setData("hmoId", "");
    }
  };

  // If the previously selected doctor is no longer in the filtered list, clear.
  // (Happens when user goes back and changes service.)
  const doctorIsValid =
    data.doctorId === null ||
    filteredDoctors.some((d) => d.id === data.doctorId);

  if (!doctorIsValid) {
    setData("doctorId", null);
  }

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

        {/* ── Mode of Coverage ── */}
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

        {/* ── HMO fields ── */}
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
              hint={!errors.hmoId ? `6–${HMO_MAX} chars — letters and numbers (e.g. MC-123456).` : undefined}
            >
              <input
                className={`wc-input${errors.hmoId ? " wc-input-error" : ""}`}
                type="text"
                placeholder="e.g. MC-123456"
                value={data.hmoId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setData("hmoId", sanitizeHmoId(e.target.value))
                }
                onPaste={makePasteHandler(sanitizeHmoId, (v) => setData("hmoId", v))}
              />
              <span style={{
                display: "block", textAlign: "right", marginTop: "2px",
                fontSize: "var(--text-xs)", fontWeight: 600,
                color: data.hmoId.length >= HMO_MAX
                  ? "var(--wc-error)"
                  : data.hmoId.length >= HMO_MAX - 3
                  ? "var(--wc-warning)"
                  : "var(--wc-gray-400)",
              }}>
                {data.hmoId.length} / {HMO_MAX}
              </span>
            </Field>
          </>
        )}

        {/* ── Preferred Doctor (DB-driven) ── */}
        <Field
          label="Name of Preferred Doctor"
          error={errors.doctorId}
          hint={!errors.doctorId ? serviceLabel : undefined}
        >
          <DoctorPicker
            doctors={filteredDoctors}
            value={data.doctorId}
            onChange={(id) => setData("doctorId", id)}
            error={errors.doctorId}
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
            View full list of doctors →
          </a>
        </Field>

      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Review Appointment"
        nextDisabled={false}
      />
    </div>
  );
}