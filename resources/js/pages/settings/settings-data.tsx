// resources/js/pages/settings/settings-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centralized tab config + all static strings for every settings panel.
// CHANGES: Appearance tab removed from all roles. Patient-specific tabs added.

// ── Types ─────────────────────────────────────────────────────────────────────

export type SettingsTabId =
  | "profile"
  | "security"
  | "clinic-schedule"
  | "notifications"
  | "health-information"
  | "my-appointments"
  | "my-vitals";

export interface SettingsTab {
  id:    SettingsTabId;
  label: string;
  icon:  string;
  href?: string; // optional override — defaults to /settings/{id}
}

// ── Doctor tabs (Appearance removed) ─────────────────────────────────────────

export const doctorTabs: SettingsTab[] = [
  { id: "profile",          label: "Profile",           icon: "user"          },
  { id: "security",         label: "Security",          icon: "shield"        },
  { id: "clinic-schedule",  label: "Clinic Schedule",   icon: "calendar"      },
  { id: "notifications",    label: "Notifications",     icon: "bell"          },
];

// ── Patient / User tabs (Appearance removed, profile → settings) ──────────────

export const patientTabs: SettingsTab[] = [
  { id: "profile",          label: "Profile",           icon: "user"          },
  { id: "security",         label: "Security",          icon: "shield"        },
  { id: "health-information", label: "Health Info",     icon: "heart"         },
  { id: "notifications",    label: "Notifications",     icon: "bell"          },
];

// ── Shared panel strings ──────────────────────────────────────────────────────

export const profileStrings = {
  sectionTitle:            "Profile Information",
  sectionSubtitle:         "Update your display name, specialization, and contact details",
  displayNameLabel:        "Display Name",
  displayNamePlaceholder:  "e.g. Dr. Douglas McArthur",
  specialtyLabel:          "Specialty",
  specialtyPlaceholder:    "e.g. Cardiology",
  specializationLabel:     "Specialization",
  specializationPlaceholder: "e.g. Interventional Cardiology",
  initialsLabel:           "Initials",
  initialsPlaceholder:     "e.g. DM",
  colorLabel:              "Profile Color",
  emailLabel:              "Email Address",
  emailPlaceholder:        "doctor@wellcare.com",
  saveLabel:               "Save Changes",
  savedLabel:              "Saved!",
  avatarSectionTitle:      "Profile Avatar",
  avatarSubtitle:          "Choose a color to represent your initials avatar",
};

export const securityStrings = {
  passwordTitle:            "Update Password",
  passwordSubtitle:         "Use a long, random password to keep your account secure",
  currentPasswordLabel:     "Current Password",
  newPasswordLabel:         "New Password",
  confirmPasswordLabel:     "Confirm New Password",
  savePasswordLabel:        "Save Password",
  twoFactorTitle:           "Two-Factor Authentication",
  twoFactorSubtitle:        "Add an extra layer of security to your account",
  twoFactorEnabled:         "2FA is currently enabled on your account.",
  twoFactorDisabled:        "2FA is currently disabled. Enable it for added security.",
  enableLabel:              "Enable 2FA",
  disableLabel:             "Disable 2FA",
  privacyLabel:             "Privacy Level",
  privacyValue:             "SECURE",
};

export const notificationsStrings = {
  title:    "Notification Preferences",
  subtitle: "Choose how and when Wellcare sends you updates",
  channels: [
    { id: "email",  label: "Email Notifications",       desc: "Receive updates via your registered email address" },
    { id: "sms",    label: "SMS Notifications",          desc: "Get text alerts for appointment reminders"         },
    { id: "system", label: "In-App Notifications",       desc: "Show alerts inside the Wellcare dashboard"         },
  ],
  events: [
    { id: "appointment_confirmed", label: "Appointment Confirmed",    default: true  },
    { id: "appointment_reminder",  label: "Appointment Reminder",     default: true  },
    { id: "appointment_cancelled", label: "Appointment Cancelled",    default: true  },
    { id: "lab_results_ready",     label: "Lab Results Ready",        default: true  },
    { id: "prescription_issued",   label: "Prescription Issued",      default: false },
    { id: "billing_update",        label: "Billing / Payment Update", default: false },
  ],
  saveLabel: "Save Preferences",
  savedLabel: "Preferences saved!",
};

export const healthInformationStrings = {
  title:    "Health Information",
  subtitle: "Keep your medical details up to date for accurate records",
  bloodTypeLabel:    "Blood Type",
  bloodTypeOptions:  ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"],
  allergiesLabel:    "Known Allergies",
  allergiesPlaceholder: "e.g. Penicillin, Aspirin, Shellfish",
  conditionsLabel:   "Existing Conditions",
  conditionsPlaceholder: "e.g. Hypertension, Diabetes Type 2",
  medicationsLabel:  "Current Medications",
  medicationsPlaceholder: "e.g. Metformin 500mg, Losartan 50mg",
  emergencyNameLabel:    "Emergency Contact Name",
  emergencyNamePlaceholder: "Full name",
  emergencyPhoneLabel:   "Emergency Contact Number",
  emergencyPhonePlaceholder: "+63 9XX XXX XXXX",
  emergencyRelationLabel:  "Relationship",
  emergencyRelationOptions: ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"],
  saveLabel:  "Save Health Info",
  savedLabel: "Saved!",
};

export const clinicScheduleStrings = {
  title:             "Clinic Schedule",
  subtitle:          "Manage your weekly availability and consultation slots",
  daysLabel:         "Working Days",
  days: [
    { value: "mon", label: "Mon" }, { value: "tue", label: "Tue" },
    { value: "wed", label: "Wed" }, { value: "thu", label: "Thu" },
    { value: "fri", label: "Fri" }, { value: "sat", label: "Sat" },
    { value: "sun", label: "Sun" },
  ],
  startTimeLabel:    "Start Time",
  endTimeLabel:      "End Time",
  slotDurationLabel: "Slot Duration",
  slotOptions: [
    { value: "15", label: "15 minutes" }, { value: "20", label: "20 minutes" },
    { value: "30", label: "30 minutes" }, { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour"     },
  ],
  maxPatientsLabel:  "Max Patients / Day",
  preferredHmoLabel: "Preferred HMO",
  hmoOptions: [
    { value: "cash",   label: "Cash"   }, { value: "pwd",    label: "PWD"    },
    { value: "senior", label: "Senior" }, { value: "mwc",    label: "MWC"    },
    { value: "hmo",    label: "HMO"    },
  ],
  breakStartLabel: "Break Start",
  breakEndLabel:   "Break End",
  saveLabel:       "Save Schedule",
  statusLabel:     "Availability Status",
  statusOptions: [
    { value: "active",      label: "Active"      },
    { value: "on_leave",    label: "On Leave"    },
    { value: "unavailable", label: "Unavailable" },
  ],
};

// ── Page-level meta ───────────────────────────────────────────────────────────

export const settingsPageMeta = {
  pageTitle:    "Settings",
  pageSubtitle: "Manage your account preferences and clinic configuration",
  activeNav:    "settings",
};