// resources/js/pages/user/patient-nav-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// CHANGE: "My Profile" nav link replaced with "Settings".
// Profile is now accessible from /user/settings/profile.

export type PatientNavIconKey =
  | "dashboard" | "appointments" | "vitals"
  | "records"   | "doctors"      | "settings";

export interface PatientNavItem  { id: string; label: string; href: string; iconKey: PatientNavIconKey; }
export interface PatientNavGroup { groupLabel: string; items: PatientNavItem[]; }

export const patientNavGroups: PatientNavGroup[] = [
  {
    groupLabel: "Overview",
    items: [
      { id: "dashboard",    label: "Dashboard",       href: "/user/dashboard",    iconKey: "dashboard"    },
    ],
  },
  {
    groupLabel: "Health",
    items: [
      { id: "appointments", label: "My Appointments", href: "/user/appointments", iconKey: "appointments" },
      { id: "vitals",       label: "My Vitals",       href: "/user/vitals",       iconKey: "vitals"       },
      { id: "records",      label: "Medical Records", href: "/user/records",      iconKey: "records"      },
    ],
  },
  {
    groupLabel: "Care Team",
    items: [
      { id: "doctors",   label: "My Doctors", href: "/user/doctors",   iconKey: "doctors"   },
    ],
  },
  {
    groupLabel: "Account",
    items: [
      // "My Profile" removed — accessible via Settings > Profile
      { id: "settings",  label: "Settings",   href: "/user/settings",  iconKey: "settings"  },
    ],
  },
];

export const patientTopbarMeta = {
  searchPlaceholder: "Search appointments, records, doctors...",
  userName:          "Maria Santos",
  userRole:          "Patient",
  userInitials:      "MS",
};