// resources/js/pages/user/my-schedule/my-schedule-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content, types and mock data for the My Schedule page.

// ── Appointment ───────────────────────────────────────────────────────────────

export type SchedStatus = "confirmed" | "pending" | "cancelled";

export interface ScheduleAppointment {
  id:        string;
  name:      string;
  service:   string;
  time:      string;
  status:    SchedStatus;
  avatarBg:  string;
  avatarSrc?: string;
}

export const SCHEDULE_APPOINTMENTS: ScheduleAppointment[] = [
  { id: "s1", name: "Sarah Jenkins", service: "General Checkup", time: "09:00 AM", status: "confirmed", avatarBg: "#94a3b8", avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" },
  { id: "s2", name: "Michael Chen",  service: "Cardiology",      time: "10:30 AM", status: "pending",   avatarBg: "#64748b", avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" },
  { id: "s3", name: "Emma Wilson",   service: "Dental",          time: "01:15 PM", status: "confirmed", avatarBg: "#94a3b8", avatarSrc: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face" },
  { id: "s4", name: "Robert Taylor", service: "Orthopedic",      time: "03:45 PM", status: "confirmed", avatarBg: "#78716c", avatarSrc: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face" },
  { id: "s5", name: "Alice Cooper",  service: "Follow-up",       time: "04:30 PM", status: "confirmed", avatarBg: "#b45309", avatarSrc: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face" },
];

// ── Stat cards ────────────────────────────────────────────────────────────────

export interface StatCard {
  label:     string;
  value:     string;
  iconColor: string;
  iconBg:    string;
}

export const SCHEDULE_STATS: StatCard[] = [
  { label: "TOTAL APPOINTMENTS", value: "12",     iconColor: "#0056b3", iconBg: "#eff6ff" },
  { label: "NEW PATIENTS",        value: "4",      iconColor: "#0056b3", iconBg: "#faf5ff" },
  { label: "AVG. WAIT TIME",      value: "15 min", iconColor: "#f97316", iconBg: "#fff7ed" },
  { label: "COMPLETED",           value: "8",      iconColor: "#22c55e", iconBg: "#f0fdf4" },
];

// ── Schedule overview ─────────────────────────────────────────────────────────

export const SCHEDULE_OVERVIEW = {
  title:               "Schedule Overview",
  viewAllLabel:        "VIEW ALL",
  viewAllHref:         "/schedule/overview",
  dailyProgressLabel:  "Daily Progress",
  completedLabel:      "COMPLETED",
  completedPercent:    65,
  remainingMessage:    "You have 4 appointments remaining for today.",
};

// ── Quick tasks ───────────────────────────────────────────────────────────────

export interface QuickTask {
  id:    string;
  label: string;
  time:  string;
  done:  boolean;
}

export const QUICK_TASKS: QuickTask[] = [
  { id: "qt1", label: "Review Sarah's Lab Results",  time: "10:00 AM", done: false },
  { id: "qt2", label: "Approve Refill for Michael",  time: "11:30 AM", done: false },
  { id: "qt3", label: "Prepare for Emma's Surgery",  time: "01:00 PM", done: false },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const SCHEDULE_META = {
  pageTitle:    "My Schedule",
  pageSubtitle: "Manage your daily appointments and patient visits",
  backHref:     "/dashboard",

  scheduleCardTitle: "Full Schedule - Today",
  viewAllLabel:      "VIEW ALL",
  viewAllHref:       "/appointments",

  searchPlaceholder: "Search patients, doctors, records…",
  userName:          "Dr. Douglas McArthur",
  userInitials:      "DM",
  userRole:          "Senior Cardiologist",
};