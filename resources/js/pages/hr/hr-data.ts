// resources/js/pages/hr/hr-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all HR dashboard data.
// HR role: review and approve/reject HMO LOA (Letter of Authorization)
// applications from patients before their consultation proceeds.

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoaStatus = "pending" | "approved" | "rejected";

export interface HmoApplication {
  id:            string;
  patientName:   string;
  patientNumber: string;
  initials:      string;
  color:         string;
  hmoProvider:   string;
  hmoCardNumber: string;
  doctor:        string;
  specialty:     string;
  appointmentDate: string;
  appointmentTime: string;
  submittedDate: string;
  status:        LoaStatus;
  diagnosis?:    string;
  notes?:        string;
  // LOA document details
  loaNumber?:    string;
  coverageLimit: string;
  approvedBy?:   string;
  rejectedReason?: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const mockHmoApplications: HmoApplication[] = [
  {
    id:              "loa-001",
    patientName:     "Maria Santos",
    patientNumber:   "WC-2026-00142",
    initials:        "MS",
    color:           "#0056b3",
    hmoProvider:     "PhilHealth",
    hmoCardNumber:   "PH-4821-0023-1199",
    doctor:          "Dr. Douglas McArthur",
    specialty:       "Cardiology",
    appointmentDate: "Apr 28, 2026",
    appointmentTime: "9:00 AM",
    submittedDate:   "Apr 20, 2026",
    status:          "pending",
    diagnosis:       "Hypertensive cardiovascular disease",
    notes:           "Patient requests 2D Echo and ECG under HMO coverage.",
    coverageLimit:   "₱15,000.00",
  },
  {
    id:              "loa-002",
    patientName:     "Juan dela Cruz",
    patientNumber:   "WC-2026-00138",
    initials:        "JC",
    color:           "#7c3aed",
    hmoProvider:     "Maxicare",
    hmoCardNumber:   "MX-7741-5512-0044",
    doctor:          "Dr. Ana Reyes",
    specialty:       "General Medicine",
    appointmentDate: "Apr 25, 2026",
    appointmentTime: "2:00 PM",
    submittedDate:   "Apr 19, 2026",
    status:          "pending",
    diagnosis:       "Acute upper respiratory infection",
    notes:           "Requesting LOA for consult and CBC lab test.",
    coverageLimit:   "₱8,000.00",
  },
  {
    id:              "loa-003",
    patientName:     "Elena Ramos",
    patientNumber:   "WC-2026-00127",
    initials:        "ER",
    color:           "#16a34a",
    hmoProvider:     "MediCard",
    hmoCardNumber:   "MC-3300-8821-5566",
    doctor:          "Dr. Joel Cruz",
    specialty:       "Pulmonology",
    appointmentDate: "Apr 24, 2026",
    appointmentTime: "10:30 AM",
    submittedDate:   "Apr 18, 2026",
    status:          "approved",
    diagnosis:       "Bronchial asthma, moderate persistent",
    notes:           "LOA approved for Spirometry test and consult.",
    loaNumber:       "LOA-2026-0441",
    coverageLimit:   "₱12,000.00",
    approvedBy:      "Sarah Mendoza, HR",
  },
  {
    id:              "loa-004",
    patientName:     "Roberto Tan",
    patientNumber:   "WC-2026-00115",
    initials:        "RT",
    color:           "#ca8a04",
    hmoProvider:     "Intellicare",
    hmoCardNumber:   "IC-9901-2244-7788",
    doctor:          "Dr. Douglas McArthur",
    specialty:       "Cardiology",
    appointmentDate: "Apr 22, 2026",
    appointmentTime: "11:00 AM",
    submittedDate:   "Apr 15, 2026",
    status:          "rejected",
    diagnosis:       "Chest pain, unspecified",
    notes:           "Policy limit reached for the current benefit year.",
    coverageLimit:   "₱0.00",
    rejectedReason:  "Annual HMO benefit limit already exhausted.",
  },
  {
    id:              "loa-005",
    patientName:     "Lourdes Aquino",
    patientNumber:   "WC-2026-00109",
    initials:        "LA",
    color:           "#0284c7",
    hmoProvider:     "PhilHealth",
    hmoCardNumber:   "PH-1102-9944-3377",
    doctor:          "Dr. Ana Reyes",
    specialty:       "General Medicine",
    appointmentDate: "Apr 29, 2026",
    appointmentTime: "1:00 PM",
    submittedDate:   "Apr 21, 2026",
    status:          "pending",
    diagnosis:       "Type 2 diabetes mellitus, monitoring",
    notes:           "Patient requests HbA1c and FBS under PhilHealth coverage.",
    coverageLimit:   "₱10,000.00",
  },
  {
    id:              "loa-006",
    patientName:     "Felix Reyes",
    patientNumber:   "WC-2026-00098",
    initials:        "FR",
    color:           "#c2410c",
    hmoProvider:     "Maxicare",
    hmoCardNumber:   "MX-5500-1122-9988",
    doctor:          "Dr. Joel Cruz",
    specialty:       "Pulmonology",
    appointmentDate: "Apr 30, 2026",
    appointmentTime: "3:30 PM",
    submittedDate:   "Apr 22, 2026",
    status:          "pending",
    diagnosis:       "Chronic obstructive pulmonary disease",
    notes:           "Requesting PFT and chest X-ray under Maxicare.",
    coverageLimit:   "₱18,000.00",
  },
];

// ── Derived stats ─────────────────────────────────────────────────────────────

export function getLoaStats(apps: HmoApplication[]) {
  return {
    total:    apps.length,
    pending:  apps.filter(a => a.status === "pending").length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length,
  };
}

// ── Page meta ─────────────────────────────────────────────────────────────────

export const hrMeta = {
  // Topbar
  searchPlaceholder: "Search patient or HMO provider…",
  userName:          "Sarah Mendoza",
  userRole:          "HR Staff",
  userInitials:      "SM",

  // Dashboard
  dashboardTitle:    "HR Dashboard",
  dashboardSubtitle: "Review and process pending HMO LOA applications",

  // Stat cards
  statCards: [
    { id: "pending",  label: "Pending Review", colorAccent: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
    { id: "approved", label: "Approved Today",  colorAccent: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { id: "rejected", label: "Rejected",        colorAccent: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    { id: "total",    label: "Total This Month", colorAccent: "#0056b3", bg: "#eff6ff", border: "#bfdbfe" },
  ],

  // HMO Applications page
  hmoPageTitle:    "HMO Applications",
  hmoPageSubtitle: "LOA requests pending HR review and approval",
  searchPlaceholder2: "Search by patient name or HMO provider…",

  // Action labels
  approveLabel:  "Approve LOA",
  rejectLabel:   "Reject",
  reviewLabel:   "Review",
  viewLabel:     "View Details",
  cancelLabel:   "Cancel",
  confirmLabel:  "Confirm",

  // Status labels
  statusLabels: {
    pending:  "Pending",
    approved: "Approved",
    rejected: "Rejected",
  } as Record<LoaStatus, string>,

  // Modal labels
  modalTitle:           "LOA Application Review",
  patientInfoLabel:     "Patient Information",
  appointmentLabel:     "Appointment Details",
  hmoDetailsLabel:      "HMO / Coverage Details",
  clinicalNotesLabel:   "Clinical Notes",
  rejectReasonLabel:    "Reason for Rejection",
  rejectReasonHint:     "Provide a brief reason — this will be recorded and visible to the patient.",
  rejectReasonPlaceholder: "e.g. Annual HMO limit exhausted, invalid card number…",

  // Empty state
  emptyPending:  "No pending applications",
  emptyAll:      "No applications found",
};

// ── Nav data ──────────────────────────────────────────────────────────────────

export interface HrNavItem  { id: string; label: string; href: string; }
export interface HrNavGroup { groupLabel: string; items: HrNavItem[]; }

export const hrNavGroups: HrNavGroup[] = [
  {
    groupLabel: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/hr/dashboard" },
    ],
  },
  {
    groupLabel: "HMO",
    items: [
      { id: "hmo-applications", label: "HMO Applications", href: "/hr/hmo-applications" },
    ],
  },
];