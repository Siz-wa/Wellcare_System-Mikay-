// resources/js/pages/user/book-appointment/sections/step-coverage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Mode of Coverage, HMO fields (conditional), preferred doctor picker.
// Doctor list is filtered to match the service selected in Step 2.

import type { ReactElement }                    from "react";
import { useMemo }                              from "react";
import type { BookingFormData, CoverageOption } from "./bookingdata";
import {
  coverageOptions,
  hmoOptions,
  STEP_HEADINGS,
  SERVICE_TO_SPECIALTIES,
}                                               from "./bookingdata";
import { Field, ToggleCard, StepNav, DoctorPicker } from "../components";
import { sanitizeHmoId, makePasteHandler }      from "../utils/sanitizers";
import { doctorsData }                          from "@/pages/generals/doctors/sections/doctors-data";
import type { Step3Errors }                     from "@/hooks/use-step-validators";

// ── Props ─────────────────────────────────────────────────────────────────────

interface StepCoverageProps {
  data:    BookingFormData;
  errors:  Step3Errors;
  setData: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void;
  valid:   boolean;
  onNext:  () => void;
  onBack:  () => void;
}

const HMO_MAX = 20;

// ── Component ─────────────────────────────────────────────────────────────────

export default function StepCoverage({
  data, errors, setData, valid, onNext, onBack,
}: StepCoverageProps): ReactElement {
  const { title, subtitle } = STEP_HEADINGS[3];

  // ── Filter doctors by the service chosen in Step 2 ──────────────────────
  const filteredDoctors = useMemo(() => {
    const specialties = SERVICE_TO_SPECIALTIES[data.service] ?? null;

    // null = no specific mapping → show all doctors
    if (!specialties) return doctorsData;

    // Filter to matching specialties, but always include In-House doctors
    return doctorsData.filter(
      (d) =>
        specialties.includes(d.specialty as typeof specialties[number]) ||
        d.specialty === "In-House"
    );
  }, [data.service]);

  // Derived label for the field hint
  const serviceLabel = filteredDoctors.length < doctorsData.length
    ? `Showing ${filteredDoctors.length} doctor${filteredDoctors.length !== 1 ? "s" : ""} for your selected service`
    : "Optional — search our roster or leave blank for next available.";

  const handleCoverageChange = (value: string) => {
    setData("coverage", value);
    if (value !== "hmo") {
      setData("hmo",   "");
      setData("hmoId", "");
    }
  };

  // If the previously selected doctor is no longer in the filtered list, clear
  // (happens when user goes back and changes their service)
  const doctorIsValid =
    data.preferredDoctor === "" ||
    filteredDoctors.some((d) => d.name === data.preferredDoctor);

  if (!doctorIsValid) {
    setData("preferredDoctor", "");
  }

  return (
    <div>
      {/* Step heading */}
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

        {/* ── HMO fields — shown only when HMO is selected ── */}
        {data.coverage === "hmo" && (
          <>
            <Field label="HMO Provider" required error={errors.hmo}>
              <select
                className={`wc-input wc-select${errors.hmo ? " wc-input-error" : ""}`}
                value={data.hmo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setData("hmo", e.target.value)
                }
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
              hint={!errors.hmoId
                ? `6–${HMO_MAX} chars — letters and numbers (e.g. MC-123456).`
                : undefined
              }
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
                display:    "block",
                textAlign:  "right",
                marginTop:  "2px",
                fontSize:   "var(--text-xs)",
                fontWeight: 600,
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

        {/* ── Preferred Doctor — filtered by service ── */}
        <Field
          label="Name of Preferred Doctor"
          error={errors.preferredDoctor}
          hint={!errors.preferredDoctor ? serviceLabel : undefined}
        >
          <DoctorPicker
            doctors={filteredDoctors}
            value={data.preferredDoctor}
            onChange={(name) => setData("preferredDoctor", name)}
            error={errors.preferredDoctor}
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
        nextDisabled={false}
      />
    </div>
  );
}