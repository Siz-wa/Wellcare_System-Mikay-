// resources/js/pages/user/my-schedule/my-schedule-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content, types and mock data for the My Schedule page.
// Extracted from the old schedule-data.ts — edit values here only.

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
  { id: "s1", name: "Sarah Jenkins", service: "General Checkup", time: "09:00 AM", status: "confirmed", avatarBg: "#94a3b8" },
  { id: "s2", name: "Michael Chen",  service: "Cardiology",      time: "10:30 AM", status: "pending",   avatarBg: "#64748b" },
  { id: "s3", name: "Emma Wilson",   service: "Dental",          time: "01:15 PM", status: "confirmed", avatarBg: "#94a3b8" },
  { id: "s4", name: "Robert Taylor", service: "Orthopedic",      time: "03:45 PM", status: "confirmed", avatarBg: "#78716c" },
  { id: "s5", name: "Alice Cooper",  service: "Follow-up",       time: "04:30 PM", status: "confirmed", avatarBg: "#b45309" },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const SCHEDULE_META = {
  // Page header
  pageTitle:    "My Schedule",
  pageSubtitle: "Manage your daily appointments and patient visits",
  backHref:     "/dashboard",

  // Schedule card
  scheduleCardTitle: "Full Schedule - Today",
  viewAllLabel:      "VIEW ALL",
  viewAllHref:       "/appointments",

  // Topbar / user (shared via dashboardMeta in AppTopbar — kept here for reference)
  searchPlaceholder: "Search patients, doctors, records…",
  userName:          "Dr. Douglas McArthur",
  userInitials:      "DM",
  userRole:          "Senior Cardiologist",
};