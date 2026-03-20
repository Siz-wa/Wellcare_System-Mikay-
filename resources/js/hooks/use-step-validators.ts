// resources/js/pages/generals/book-appointment/hooks/use-step-validators.ts
// ────────────────────────────────────────────────────────────────────────────
// Pure validation logic for each step.
// Returns a boolean per step — no UI, no side-effects.

import type { BookingFormData } from "@/pages/generals/book-appointment/bookingdata";

interface StepValidators {
  step1Valid: boolean;
  step2Valid: boolean;
  step3Valid: boolean;
}
 
export function useStepValidators(data: BookingFormData): StepValidators {
  const step1Valid =
    data.firstName.trim().length > 0 &&
    data.lastName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    data.contactNumber.replace(/\D/g, "").length >= 10 &&
    Number(data.age) >= 1 &&
    Number(data.age) <= 120 &&
    data.gender.length > 0;
 
  const step2Valid =
    data.service.length > 0 &&
    data.appointmentDate.length > 0 &&
    data.appointmentTime.length > 0 &&
    data.patientStatus.length > 0;
 
  const step3Valid =
    data.coverage.length > 0 &&
    (data.coverage !== "hmo" || (
      data.hmo.length > 0 &&
      data.hmoId.trim().length > 0   // ← HMO ID required when HMO selected
    ));
 
  return { step1Valid, step2Valid, step3Valid };
}