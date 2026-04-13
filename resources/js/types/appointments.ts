// resources/js/types/appointments.ts
// ─────────────────────────────────────────────────────────────────────────────
// TypeScript interfaces for the Appointment booking system.
// These mirror the Laravel models / API responses exactly.

// ── State machine ─────────────────────────────────────────────────────────────

/**
 * All possible appointment states.
 *
 * Allowed transitions:
 *
 *   requested  ──► confirmed  ──► checked_in  ──► in_progress  ──► completed
 *               └─► cancelled
 *                              └─► cancelled
 *                                             └─► no_show
 *                                             └─► cancelled
 *
 * `requested`  : Form submitted; 10-min hold active. Clinic has not yet confirmed.
 * `confirmed`  : Clinic staff confirmed the appointment (email/SMS sent to patient).
 * `checked_in` : Patient arrived at the clinic.
 * `in_progress`: Patient is currently with the doctor.
 * `completed`  : Consultation finished.
 * `cancelled`  : Cancelled by patient or clinic. Terminal state.
 * `no_show`    : Patient did not arrive. Terminal state.
 */
export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

/** Terminal states — no further transitions allowed */
export const TERMINAL_STATES: ReadonlySet<AppointmentStatus> = new Set([
  "completed",
  "cancelled",
  "no_show",
]);

/** States from which a patient may cancel */
export const PATIENT_CANCELLABLE_STATES: ReadonlySet<AppointmentStatus> = new Set([
  "requested",
  "confirmed",
]);

/**
 * Valid transitions map.
 * Key = current state, Value = allowed next states.
 * Enforced on the backend in BookingService; mirrored here for UI guards.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<AppointmentStatus, AppointmentStatus[]>> = {
  requested:   ["confirmed", "cancelled"],
  confirmed:   ["checked_in", "cancelled"],
  checked_in:  ["in_progress", "cancelled"],
  in_progress: ["completed", "no_show", "cancelled"],
  completed:   [],
  cancelled:   [],
  no_show:     [],
};

// ── Coverage ──────────────────────────────────────────────────────────────────

export type CoverageType = "cash" | "hmo" | "philhealth" | "corporate";

export type PatientStatus = "new" | "returning";

export type Gender = "male" | "female" | "other";

// ── API shapes ────────────────────────────────────────────────────────────────

/** Doctor as returned by GET /appointments/slots */
export interface DoctorOption {
  id:             number;
  name:           string;
  specialty:      string;
  specialization: string;
  initials:       string;
  color:          string;
}

/** A single available time slot string, e.g. "10:00 AM" */
export type TimeSlot = string;

/** Response from GET /appointments/slots */
export interface AvailableSlotsResponse {
  slots: TimeSlot[];
}

/** Appointment as returned by the API after booking */
export interface AppointmentResource {
  id:               number;
  first_name:       string;
  last_name:        string;
  email:            string;
  contact_number:   string;
  age:              number;
  gender:           Gender;
  doctor:           DoctorOption | null;
  service:          string;
  branch:           string;
  appointment_date: string;   // "YYYY-MM-DD"
  appointment_time: string;   // "10:00 AM"
  patient_status:   PatientStatus;
  coverage:         CoverageType;
  hmo:              string | null;
  hmo_id:           string | null;
  additional_info:  string | null;
  status:           AppointmentStatus;
  hold_expires_at:  string | null;  // ISO 8601 or null
  created_at:       string;
  updated_at:       string;
}

// ── Form data (mirrors BookingFormData in bookingdata.ts) ─────────────────────

/**
 * Augmented form data that includes doctor_id resolved from the
 * `preferredDoctor` name selected in StepCoverage.
 *
 * The booking form keeps `preferredDoctor` as a display name string;
 * the controller receives `doctor_id` (integer) resolved by the service layer.
 */
export interface BookingPayload {
  first_name:       string;
  last_name:        string;
  email:            string;
  contact_number:   string;
  age:              string;        // sent as string, cast to int on server
  gender:           Gender | "";
  service:          string;
  branch:           string;
  appointment_date: string;
  appointment_time: string;
  patient_status:   PatientStatus | "";
  coverage:         CoverageType | "";
  hmo:              string;
  hmo_id:           string;
  doctor_id:        number | null;  // resolved from preferredDoctor name
  additional_info:  string;
}

// ── Availability block (for admin / doctor schedule management) ───────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = Sun … 6 = Sat

export interface AvailabilityBlock {
  id:                    number;
  doctor_id:             number;
  day_of_week:           DayOfWeek | null;    // null = specific date only
  specific_date:         string | null;        // "YYYY-MM-DD"
  start_time:            string;               // "HH:MM:SS"
  end_time:              string;               // "HH:MM:SS"
  slot_duration_minutes: number;
  is_available:          boolean;              // false = OOO block
}