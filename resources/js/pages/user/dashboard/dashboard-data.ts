// resources/js/pages/user/dashboard/dashboardData.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static and mock data for the dashboard page.
// Swap values here without touching any component files.

// ── Nav links ─────────────────────────────────────────────────────────────────

export interface NavItem {
  id:      string;
  label:   string;
  href:    string;
  iconKey: "dashboard" | "appointments" | "patients" | "doctors" | "reports" | "settings";
}

export const navItems: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",    href: "/dashboard",    iconKey: "dashboard"    },
  { id: "appointments", label: "Appointments", href: "/appointments", iconKey: "appointments" },
  { id: "patients",     label: "Patients",     href: "/patients",     iconKey: "patients"     },
  { id: "doctors",      label: "Doctors",      href: "/doctors",      iconKey: "doctors"      },
  { id: "reports",      label: "Reports",      href: "/reports",      iconKey: "reports"      },
  { id: "settings",     label: "Settings",     href: "/settings",     iconKey: "settings"     },
];

// ── Stat cards ────────────────────────────────────────────────────────────────

export interface StatCard {
  id:        string;
  label:     string;
  value:     string;
  delta:     string;
  positive:  boolean;
  iconKey:   "users" | "calendar" | "star" | "trending";
  iconColor: string;
  iconBg:    string;
}

export const statCards: StatCard[] = [
  {
    id:        "patients",
    label:     "Total Patients",
    value:     "1,284",
    delta:     "+12%",
    positive:  true,
    iconKey:   "users",
    iconColor: "var(--wc-blue-600)",
    iconBg:    "var(--wc-blue-50)",
  },
  {
    id:        "appointments",
    label:     "Appointments",
    value:     "42",
    delta:     "+8%",
    positive:  true,
    iconKey:   "calendar",
    iconColor: "#7c3aed",
    iconBg:    "#f3f0ff",
  },
  {
    id:        "rating",
    label:     "Avg. Rating",
    value:     "4.9",
    delta:     "+2%",
    positive:  true,
    iconKey:   "star",
    iconColor: "#ca8a04",
    iconBg:    "#fef9c3",
  },
  {
    id:        "revenue",
    label:     "Revenue",
    value:     "₱12,450",
    delta:     "-4%",
    positive:  false,
    iconKey:   "trending",
    iconColor: "#16a34a",
    iconBg:    "#dcfce7",
  },
];

// ── Today's appointments ──────────────────────────────────────────────────────

export type AppointmentStatus = "confirmed" | "pending" | "cancelled";

export interface TodayAppointment {
  id:        string;
  name:      string;
  service:   string;
  time:      string;
  status:    AppointmentStatus;
  initials:  string;
  color:     string;
}

export const todayAppointments: TodayAppointment[] = [
  { id: "ta1", name: "Sarah Jenkins",  service: "General Checkup", time: "09:00 AM", status: "confirmed",  initials: "SJ", color: "#0056b3" },
  { id: "ta2", name: "Michael Chen",   service: "Cardiology",      time: "10:30 AM", status: "pending",    initials: "MC", color: "#7c3aed" },
  { id: "ta3", name: "Emma Wilson",    service: "Dental",          time: "01:15 PM", status: "confirmed",  initials: "EW", color: "#16a34a" },
  { id: "ta4", name: "Robert Taylor",  service: "Orthopedic",      time: "03:45 PM", status: "confirmed",  initials: "RT", color: "#ca8a04" },
  { id: "ta5", name: "Lisa Gomez",     service: "Dermatology",     time: "04:30 PM", status: "pending",    initials: "LG", color: "#00a8e8" },
];

// ── Clinic activity ───────────────────────────────────────────────────────────

export interface ActivityItem {
  id:      string;
  label:   string;
  time:    string;
  dotColor: string;
}

export const activityItems: ActivityItem[] = [
  { id: "a1", label: "New patient registered",     time: "2 hours ago",  dotColor: "var(--wc-blue-600)" },
  { id: "a2", label: "Appointment confirmed",       time: "3 hours ago",  dotColor: "#16a34a"            },
  { id: "a3", label: "Lab results uploaded",        time: "4 hours ago",  dotColor: "#ca8a04"            },
  { id: "a4", label: "New patient registered",      time: "5 hours ago",  dotColor: "var(--wc-blue-600)" },
  { id: "a5", label: "Appointment rescheduled",     time: "6 hours ago",  dotColor: "#7c3aed"            },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const dashboardMeta = {
  greeting:      "Welcome back,",
  greetingName:  "Dr. Douglas",
  subtitle:      "Here's what's happening with your clinic today.",
  newAppointmentLabel: "+ New Appointment",
  todayAppointmentsTitle: "Today's Appointments",
  activityTitle:          "Clinic Activity",
  viewAll:                "View All",
  upgradeBadge:           "Pro Feature",
  upgradeTitle:           "Upgrade to Pro",
  upgradeDesc:            "Get access to advanced analytics and patient management tools.",
  upgradeLabel:           "Upgrade Now",
  helpTitle:              "Need help?",
  helpDesc:               "Contact our support for any issues.",
  helpLabel:              "Get Support",
  logoutLabel:            "Logout",
  searchPlaceholder:      "Search patients, doctors, records…",
  userName:               "Dr. Douglas McArthur",
  userRole:               "Senior Cardiologist",
  activeNav:              "dashboard",
};