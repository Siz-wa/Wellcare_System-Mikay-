// resources/js/pages/hr/dashboard/hr-dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All nav + meta for the HR / HMO Officer dashboard.

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
    groupLabel: "OVERVIEW",
    items: [
      { id: "dashboard",    label: "Dashboard",       href: "/hr/dashboard",      iconKey: "dashboard"    },
    ],
  },
  {
    groupLabel: "HMO MANAGEMENT",
    items: [
      { id: "hmo-approvals", label: "HMO Approvals",  href: "/hr/hmo-approvals",  iconKey: "consultations" },
      // { id: "appointments",  label: "All Appointments",href: "/hr/appointments",   iconKey: "schedule"      },
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
  // {
  //   groupLabel: "SYSTEM",
  //   items: [
  //     { id: "settings",     label: "Settings",         href: "/settings",          iconKey: "settings"      },
  //   ],
  // },
];

export const hrDashboardMeta = {
  searchPlaceholder: "Search appointments, patients…",
  activeNav:         "dashboard",
};