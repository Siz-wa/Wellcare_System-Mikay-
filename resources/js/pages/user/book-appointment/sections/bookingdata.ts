// resources/js/pages/user/book-appointment/sections/bookingdata.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static data and types for the booking form.

export const bookingMeta = {
  label:          "Book an Appointment",
  heading:        { line1: "Request an", line2: "Appointment." },
  body:           "Complete the steps below to schedule your visit. We'll confirm your booking within 36 hours.",
  disclaimer:     "Please expect a confirmation email from our team within 36 hours of submitting this form.",
  hipaa:          "Your data is encrypted and HIPAA-compliant.",
  successHeading: { line1: "Appointment", line2: "Requested!" },
  successBody:    "Your booking request has been received. Expect a confirmation email within 36 hours.",
};

export const STEPS = [
  { id: 1 as const, label: "Personal Info"   },
  { id: 2 as const, label: "Appointment"     },
  { id: 3 as const, label: "Coverage"        },
  { id: 4 as const, label: "Review & Submit" },
];

export type StepId = (typeof STEPS)[number]["id"];

export const STEP_HEADINGS: Record<StepId, { title: string; subtitle: string }> = {
  1: { title: "Personal Information",         subtitle: "Tell us a bit about yourself so we can prepare for your visit." },
  2: { title: "Appointment Details",          subtitle: "Choose your preferred service, branch, and schedule." },
  3: { title: "Coverage & Doctor Preference", subtitle: "Let us know how you'll be covering your visit and if you have a preferred doctor." },
  4: { title: "Review Your Appointment",      subtitle: "Please check all details before submitting. You can go back to edit any section." },
};

export interface SelectOption {
  value: string;
  label: string;
}

export interface CoverageOption extends SelectOption {
  icon: "cash" | "hmo" | "philhealth" | "corporate";
}

// ── Doctor shape ─────────────────────────────────────────────────────────────

export interface DoctorOption {
  id:              number;
  name:            string;
  specialty:       string;
  specialization:  string;
  initials:        string;
  color:           string;
  is_active:       boolean;
  availableSlots?: number;
}

export const genderOptions: SelectOption[] = [
  { value: "",       label: "Select biological sex" },
  { value: "male",   label: "Male"                  },
  { value: "female", label: "Female"                },
  { value: "other",  label: "Prefer not to say"     },
];

export const branchOptions: SelectOption[] = [
  { value: "",            label: "Choose a branch"      },
  { value: "dasmarinas",  label: "Wellcare Dasmarinas"  },
];

export const patientStatusOptions: SelectOption[] = [
  { value: "new",       label: "New Patient"      },
  { value: "returning", label: "Returning Patient" },
];

export const serviceOptions: SelectOption[] = [
  { value: "",                 label: "Select a service"      },
  { value: "general",          label: "General Consultation"  },
  { value: "cardiology",       label: "Cardiology"            },
  { value: "dermatology",      label: "Dermatology"           },
  { value: "pediatrics",       label: "Pediatrics"            },
  { value: "ob-gyne",          label: "OB-Gyne"               },
  { value: "orthopedics",      label: "Orthopedics"           },
  { value: "laboratory",       label: "Laboratory Services"   },
  { value: "imaging",          label: "Imaging / Radiology"   },
  { value: "physical-therapy", label: "Physical Therapy"      },
];

export const coverageOptions: CoverageOption[] = [
  { value: "cash",       label: "Cash / Self-Pay", icon: "cash"       },
  { value: "hmo",        label: "HMO",             icon: "hmo"        },
  { value: "philhealth", label: "PhilHealth",      icon: "philhealth" },
];

export const hmoOptions: SelectOption[] = [
  { value: "",            label: "Select HMO provider" },
  { value: "maxicare",    label: "Maxicare"             },
  { value: "medicard",    label: "Medicard"             },
  { value: "intellicare", label: "Intellicare"          },
  { value: "philcare",    label: "PhilCare"             },
  { value: "carenet",     label: "CareNet"              },
  { value: "other",       label: "Other"                },
];

export const TIME_SLOTS: string[] = [
  "8:00 AM",  "8:30 AM",  "9:00 AM",  "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM",  "1:30 PM",  "2:00 PM",  "2:30 PM",
  "3:00 PM",  "3:30 PM",  "4:00 PM",  "4:30 PM",
];

// ── Service to Specialty mapping ──────────────────────────────────────────────
// Values MUST match the `specialty` column in doctor_profiles exactly.
// null = show ALL doctors (no specialty filter).

export const SERVICE_TO_SPECIALTIES: Record<string, string[] | null> = {
  "general":          null,
  "cardiology":       ["cardiology"],
  "dermatology":      ["dermatology"],
  "pediatrics":       ["pediatrics"],
  "ob-gyne":          ["obstetrics"],
  "orthopedics":      ["orthopedics"],
  "laboratory":       null,
  "imaging":          null,
  "physical-therapy": null,
};

export const REVIEW_LABELS: Record<string, string> = {
  fullName:        "Full Name",
  email:           "Email",
  contactNumber:   "Contact Number",
  ageGender:       "Age / Gender",
  service:         "Service",
  branch:          "Branch",
  appointmentDate: "Preferred Date",
  appointmentTime: "Time Slot",
  patientStatus:   "Patient Status",
  coverage:        "Mode of Coverage",
  hmo:             "HMO Provider",
  hmoId:           "HMO ID Number",
  preferredDoctor: "Preferred Doctor",
};

export const HMO_NOTICE = "HMO appointments are subject to coverage verification by our HR team before being forwarded to the doctor. You will receive a notification once your HMO is verified.";

// ── Form data ─────────────────────────────────────────────────────────────────

export interface BookingFormData {
  firstName:       string;
  lastName:        string;
  email:           string;
  contactNumber:   string;
  age:             string;
  gender:          string;
  service:         string;
  branch:          string;
  appointmentDate: string;
  appointmentTime: string;
  patientStatus:   string;
  coverage:        string;
  hmo:             string;
  hmoId:           string;
  doctorId:        number | null;
  additionalInfo:  string;
}

export const BOOKING_FORM_DEFAULTS: BookingFormData = {
  firstName:       "",
  lastName:        "",
  email:           "",
  contactNumber:   "+63",
  age:             "",
  gender:          "",
  service:         "",
  branch:          "",
  appointmentDate: "",
  appointmentTime: "",
  patientStatus:   "",
  coverage:        "",
  hmo:             "",
  hmoId:           "",
  doctorId:        null,
  additionalInfo:  "",
};