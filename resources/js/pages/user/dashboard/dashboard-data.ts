// resources/js/pages/user/dashboard/dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static and mock data for the dashboard page.
// Swap values here without touching any component files.

// ── Nav groups & links ────────────────────────────────────────────────────────

export interface NavItem {
  id:      string;
  label:   string;
  href:    string;
  iconKey: "dashboard" | "schedule" | "patients" | "consultations" | "labreviews" | "records" | "settings";
}

export interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    groupLabel: "OVERVIEW",
    items: [
      { id: "dashboard", label: "Dashboard",   href: "/dashboard", iconKey: "dashboard" },
      { id: "schedule", label: "My Schedule", href: "/dashboard/my-schedule", iconKey: "schedule" },
    ],
  },
  {
    groupLabel: "MEDICAL MANAGEMENT",
    items: [
      { id: "patients", label: "My Patients", href: "/dashboard/my-patients", iconKey: "patients" },
      { id: "consultations", label: "Consultations", href: "/dashboard/consultations", iconKey: "consultations" },
      { id: "labreviews",    label: "Lab Reviews",     href: "/dashboard/lab-reviews",   iconKey: "labreviews"    },
      { id: "records",       label: "Patient Records", href: "/dashboard/patient-records",       iconKey: "records"       },
    ],
  },
  {
    groupLabel: "SYSTEM",
    items: [
      { id: "settings", label: "Settings", href: "/settings", iconKey: "settings" },
    ],
  },
];

// ── Stat cards ────────────────────────────────────────────────────────────────

export interface StatCard {
  id:        string;
  label:     string;
  value:     string;
  delta:     string;
  positive:  boolean;
  iconKey:   "users" | "calendar" | "consultation" | "lab";
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
    label:     "Today's Appointments",
    value:     "12",
    delta:     "+8%",
    positive:  true,
    iconKey:   "calendar",
    iconColor: "#7c3aed",
    iconBg:    "#f3f0ff",
  },
  {
    id:        "consultations",
    label:     "Pending Consultations",
    value:     "5",
    delta:     "-2",
    positive:  false,
    iconKey:   "consultation",
    iconColor: "#ca8a04",
    iconBg:    "#fef9c3",
  },
  {
    id:        "lab",
    label:     "Lab Results to Review",
    value:     "8",
    delta:     "+3",
    positive:  true,
    iconKey:   "lab",
    iconColor: "#16a34a",
    iconBg:    "#dcfce7",
  },
];

// ── Recent Activity ───────────────────────────────────────────────────────────

export interface ActivityItem {
  id:       string;
  label:    string; // Added: e.g., "Consultation"
  user:     string;
  action:   string;
  target:   string;
  time:     string;
  type:     'appointment' | 'lab' | 'record' | 'system';
  dotColor: string; // Added: e.g., "var(--wc-blue-500)"
}

export const activityItems: ActivityItem[] = [
  {
    id:       "act1",
    label:    "Consultation",
    user:     "Dr. Douglas",
    action:   "completed consultation for",
    target:   "Sarah Jenkins",
    time:     "12m ago",
    type:     "appointment",
    dotColor: "var(--wc-blue-500)",
  },
  {
    id:       "act2",
    label:    "Lab Alert",
    user:     "System",
    action:   "flagged critical values in",
    target:   "Michael Chen's Lab Report",
    time:     "45m ago",
    type:     "lab",
    dotColor: "#ef4444",
  },
  {
    id:       "act3",
    label:    "Records",
    user:     "Nurse Joy",
    action:   "updated medical history for",
    target:   "Emma Wilson",
    time:     "2h ago",
    type:     "record",
    dotColor: "#10b981",
  },
];

// ── Patient activity chart (weekly) ───────────────────────────────────────────

export interface ChartPoint {
  day:   string;
  value: number;
}

export const patientActivityData: ChartPoint[] = [
  { day: "Mon", value: 38 },
  { day: "Tue", value: 27 },
  { day: "Wed", value: 22 },
  { day: "Thu", value: 28 },
  { day: "Fri", value: 24 },
  { day: "Sat", value: 20 },
  { day: "Sun", value: 33 },
];

// ── Clinic workflow steps ─────────────────────────────────────────────────────

export interface WorkflowStep {
  id:          string;
  step:        number;
  title:       string;
  description: string;
  iconKey:     "labstep" | "nurse" | "notification" | "review" | "record" | "release";
}

export const workflowSteps: WorkflowStep[] = [
  { id: "w1", step: 1, title: "Lab Completion",    description: "Lab technician uploads raw test data to the system.",                 iconKey: "labstep"      },
  { id: "w2", step: 2, title: "Nurse Validation",  description: "Staff Nurse verifies data integrity and flags critical values.",      iconKey: "nurse"        },
  { id: "w3", step: 3, title: "Auto-Notification", description: "System triggers immediate alerts to the assigned Doctor and Patient.", iconKey: "notification" },
  { id: "w4", step: 4, title: "Doctor Review",     description: "Physician interprets results and provides clinical diagnosis.",        iconKey: "review"       },
  { id: "w5", step: 5, title: "Record Update",     description: "Final findings written to Lab Results and Patient Records.",          iconKey: "record"       },
  { id: "w6", step: 6, title: "Final Release",     description: "Verified report released to patient dashboard.",                      iconKey: "release"      },
];

// ── Today's appointments ──────────────────────────────────────────────────────

export type AppointmentStatus = "confirmed" | "pending" | "cancelled";

export interface TodayAppointment {
  id:       string;
  name:     string;
  service:  string;
  time:     string;
  status:   AppointmentStatus;
  initials: string;
  color:    string;
}

export const todayAppointments: TodayAppointment[] = [
  { id: "ta1", name: "Sarah Jenkins", service: "General Checkup", time: "09:00 AM", status: "confirmed", initials: "SJ", color: "#0056b3" },
  { id: "ta2", name: "Michael Chen",  service: "Cardiology",      time: "10:30 AM", status: "pending",   initials: "MC", color: "#7c3aed" },
  { id: "ta3", name: "Emma Wilson",   service: "Dental",          time: "01:15 PM", status: "confirmed", initials: "EW", color: "#16a34a" },
  { id: "ta4", name: "Robert Taylor", service: "Orthopedic",      time: "03:45 PM", status: "confirmed", initials: "RT", color: "#ca8a04" },
];

// ── Pending lab reviews ───────────────────────────────────────────────────────

export interface LabReview {
  id:       string;
  name:     string;
  test:     string;
  timeAgo:  string;
  initials: string;
  color:    string;
}

export const pendingLabReviews: LabReview[] = [
  { id: "lr1", name: "Sarah Jenkins", test: "Blood Panel", timeAgo: "1h ago", initials: "SJ", color: "#0056b3" },
  { id: "lr2", name: "Michael Chen",  test: "ECG Report",  timeAgo: "3h ago", initials: "MC", color: "#7c3aed" },
  { id: "lr3", name: "Emma Wilson",   test: "X-Ray Scan",  timeAgo: "5h ago", initials: "EW", color: "#16a34a" },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const dashboardMeta = {
  greeting:               "Welcome back,",
  greetingName:           "Dr. Douglas",
  subtitle:               "Here's what's happening with your clinic today.",
  newAppointmentLabel:    "New Appointment",
  patientActivityTitle:   "Patient Activity",
  activityTitle:          "Recent Activity",
  clinicWorkflowTitle:    "Clinic Workflow",
  todayAppointmentsTitle: "Today's Appointments",
  pendingLabTitle:        "Pending Lab Reviews",
  viewAll:                "VIEW ALL",
  reviewLabel:            "Review",
  helpTitle:              "Need help?",
  helpDesc:               "Contact our support for any issues.",
  helpLabel:              "Get Support",
  logoutLabel:            "Logout",
  searchPlaceholder:      "Search patients, doctors, records…",
  userName:               "Dr. Douglas McArthur",
  userRole:               "Senior Cardiologist",
  activeNav:              "dashboard",
};