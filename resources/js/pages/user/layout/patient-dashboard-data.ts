// resources/js/pages/user/dashboard/patient-dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All nav + meta for the patient portal dashboard.
// Mirrors the shape of doctor/dashboard-data.ts so the same AppSidebar
// component works — just import this instead.

export interface NavItem {
  id:      string;
  label:   string;
  href:    string;
  iconKey: "dashboard" | "schedule" | "patients" | "consultations" | "labreviews" | "records" | "settings";
}

export interface NavGroup {
  groupLabel: string;
  items:      NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    groupLabel: "MY HEALTH",
    items: [
      { id: "dashboard",    label: "My Appointments", href: "/user/dashboard", iconKey: "dashboard"    },
    ],
  },
  {
    groupLabel: "BOOKING",
    items: [
      { id: "schedule",     label: "Book Appointment", href: "/book",           iconKey: "schedule"     },
    ],
  },
  {
    groupLabel: "Generals",
    items: [
      { id: "home",     label: "Home Page",  href: "/",       iconKey: "records"      },
      { id: "doctors",  label: "Doctors List",  href: "/doctors",       iconKey: "records"      },
      { id: "contact",  label: "Contact Us",  href: "/contact",       iconKey: "records"      },
      { id: "patients", label: "FAQs",  href: "/faqs",       iconKey: "records"      },
    ],
  },
];

export const patientDashboardMeta = {
  searchPlaceholder: "Search appointments…",
  activeNav:         "dashboard",
};