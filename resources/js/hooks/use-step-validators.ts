// resources/js/hooks/use-step-validators.ts
// ─────────────────────────────────────────────────────────────────────────────
// Iron-clad validation for every booking step.
// Returns per-field error strings + a step-level isValid boolean.
// Pure functions — no UI, no side effects.

import type { BookingFormData } from "@/pages/user/book-appointment/sections/bookingdata";
import { doctorsData }          from "@/pages/generals/doctors/sections/doctors-data";

// Build a Set of valid doctor names from the real roster — O(1) lookup

// ── Exported error shapes ─────────────────────────────────────────────────────

export interface Step1Errors {
  firstName?:     string;
  lastName?:      string;
  email?:         string;
  contactNumber?: string;
  age?:           string;
  gender?:        string;
}

export interface Step2Errors {
  service?:         string;
  patientStatus?:   string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface Step3Errors {
  coverage?:        string;
  hmo?:             string;
  hmoId?:           string;
  doctorId?: string;
}

export interface StepValidators {
  step1Valid: boolean;
  step2Valid: boolean;
  step3Valid: boolean;
  errors1:    Step1Errors;
  errors2:    Step2Errors;
  errors3:    Step3Errors;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Philippine numbers: +63 followed by 10 digits, or 09XXXXXXXXX (11 digits)
const PH_PHONE_RE = /^(\+639|09)\d{9}$/;

// HMO ID: PH HMOs use 6–20 alphanumeric chars, sometimes with a hyphen prefix
// Real examples: MC-123456 (Maxicare), IC-987654321 (Intellicare), MD-00123456 (Medicard)
const HMO_ID_RE = /^[A-Z0-9\-]{6,20}$/;

// Booking window: min tomorrow, max 1 year from today
const BOOKING_MAX_DAYS = 365;

// Valid service values (must match bookingdata.ts serviceOptions)
const VALID_SERVICES = new Set([
  "general", "cardiology", "dermatology", "pediatrics",
  "ob-gyne", "laboratory", "imaging", "physical-therapy",
]);

// Valid coverage values
const VALID_COVERAGE = new Set(["cash", "hmo", "philhealth"]);

// Valid HMO values
const VALID_HMO = new Set([
  "maxicare", "medicard", "intellicare", "philcare", "carenet", "other",
]);

// Valid patient status values
const VALID_PATIENT_STATUS = new Set(["new", "returning"]);

// Valid gender values
const VALID_GENDER = new Set(["male", "female", "other"]);

// ── Date helpers ──────────────────────────────────────────────────────────────

function midnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseYMD(v: string): Date | null {
  // Accepts yyyy-mm-dd only
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  // Reject obviously invalid combos
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  // Guard against JS date overflow (e.g. Feb 30 → Mar 2)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

function validateStep1(data: BookingFormData): Step1Errors {
  const e: Step1Errors = {};

  // First name
  const fn = data.firstName.trim();
  if (!fn)
    e.firstName = "First name is required.";
  else if (fn.length < 2)
    e.firstName = "First name must be at least 2 characters.";
  else if (fn.length > 50)
    e.firstName = "First name must not exceed 50 characters.";
  else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/.test(fn))
    e.firstName = "First name may only contain letters, spaces, hyphens, or apostrophes.";

  // Last name
  const ln = data.lastName.trim();
  if (!ln)
    e.lastName = "Last name is required.";
  else if (ln.length < 2)
    e.lastName = "Last name must be at least 2 characters.";
  else if (ln.length > 50)
    e.lastName = "Last name must not exceed 50 characters.";
  else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/.test(ln))
    e.lastName = "Last name may only contain letters, spaces, hyphens, or apostrophes.";

  // Email
  const em = data.email.trim();
  if (!em)
    e.email = "Email address is required.";
  else if (!EMAIL_RE.test(em))
    e.email = "Please enter a valid email address (e.g. you@example.com).";
  else if (em.length > 255)
    e.email = "Email address is too long.";

  // Contact number
  const raw = data.contactNumber.trim().replace(/\s/g, "");
  if (!raw || raw === "+63")
    e.contactNumber = "Contact number is required.";
  else if (!PH_PHONE_RE.test(raw))
    e.contactNumber = "Enter a valid PH number — e.g. +639XXXXXXXXX or 09XXXXXXXXX.";

  // Age
  const age = data.age.trim();
  if (!age)
    e.age = "Age is required.";
  else if (!/^\d+$/.test(age))
    e.age = "Age must be a whole number.";
  else if (Number(age) < 1 || Number(age) > 120)
    e.age = "Age must be between 1 and 120.";

  // Gender
  if (!data.gender || !VALID_GENDER.has(data.gender))
    e.gender = "Please select your biological sex.";

  return e;
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

function validateStep2(data: BookingFormData): Step2Errors {
  const e: Step2Errors = {};

  // Service
  if (!data.service || !VALID_SERVICES.has(data.service))
    e.service = "Please select a service.";

  // Patient status
  if (!data.patientStatus || !VALID_PATIENT_STATUS.has(data.patientStatus))
    e.patientStatus = "Please select your patient record status.";

  // Date — must be valid, at least tomorrow, max 1 year from today
  const today    = midnight(new Date());
  const tomorrow = midnight(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);

  const maxDate = midnight(new Date());
  maxDate.setDate(maxDate.getDate() + BOOKING_MAX_DAYS);

  if (!data.appointmentDate) {
    e.appointmentDate = "Please select a preferred date.";
  } else {
    const picked = parseYMD(data.appointmentDate);
    if (!picked) {
      e.appointmentDate = "Invalid date. Please use the date picker.";
    } else if (picked <= today) {
      e.appointmentDate = "Appointment must be scheduled for a future date (at least tomorrow).";
    } else if (picked > maxDate) {
      e.appointmentDate = `Appointments can only be booked up to ${BOOKING_MAX_DAYS} days in advance.`;
    }
  }

  // Time slot
  if (!data.appointmentTime)
    e.appointmentTime = "Please select a time slot.";

  return e;
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

function validateStep3(data: BookingFormData): Step3Errors {
  const e: Step3Errors = {};

  // Coverage
  if (!data.coverage || !VALID_COVERAGE.has(data.coverage))
    e.coverage = "Please select your mode of coverage.";

  // HMO-specific fields
  if (data.coverage === "hmo") {
    if (!data.hmo || !VALID_HMO.has(data.hmo))
      e.hmo = "Please select your HMO provider.";

    const hmoId = data.hmoId.trim();
    if (!hmoId)
      e.hmoId = "HMO ID number is required.";
    else if (!HMO_ID_RE.test(hmoId))
      e.hmoId = "HMO ID must be 6–20 characters — letters and numbers only (e.g. MC-123456).";
  }

  // Preferred doctor — optional, but if provided must exactly match a roster entry.
  // The DoctorPicker component only allows selecting from the list, so this is
  // a safety net against any direct state manipulation.
  if (data.doctorId !== null && typeof data.doctorId !== "number") {
  e.doctorId = "Please select a doctor from the list.";
  }

  return e;
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useStepValidators(data: BookingFormData): StepValidators {
  const errors1 = validateStep1(data);
  const errors2 = validateStep2(data);
  const errors3 = validateStep3(data);

  return {
    step1Valid: Object.keys(errors1).length === 0,
    step2Valid: Object.keys(errors2).length === 0,
    step3Valid: Object.keys(errors3).length === 0,
    errors1,
    errors2,
    errors3,
  };
}