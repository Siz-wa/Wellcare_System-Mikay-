// resources/js/pages/user/patient-records/patient-records-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static and mock data for the Patient Records page.
// Updated to match the Card Archive UI layout.

export type PatientStatus = "verified" | "pending";

export interface Patient {
  id:          string;
  patientId:   string;   // "REC-001"
  name:        string;
  lastUpdate:  string;   // Replacing age/gender with date from image
  docCount:    number;   // "24 DOCS"
  status:      PatientStatus;
  avatarColor: string;   // Used to determine if folder is filled blue or outline
}

export const patients: Patient[] = [
  {
    id:          "rec1",
    patientId:   "REC-001",
    name:        "Sarah Jenkins",
    lastUpdate:  "24 MAR 2026",
    docCount:    24,
    status:      "verified",
    avatarColor: "var(--wc-blue-600)", // Blue folder (Selected/Active)
  },
  {
    id:          "rec2",
    patientId:   "REC-002",
    name:        "Michael Chen",
    lastUpdate:  "22 MAR 2026",
    docCount:    24,
    status:      "verified",
    avatarColor: "transparent", // Outline folder
  },
  {
    id:          "rec3",
    patientId:   "REC-003",
    name:        "Emma Wilson",
    lastUpdate:  "20 MAR 2026",
    docCount:    24,
    status:      "verified",
    avatarColor: "var(--wc-blue-600)", // Blue folder (Selected/Active)
  },
  {
    id:          "rec4",
    patientId:   "REC-004",
    name:        "Robert Taylor",
    lastUpdate:  "18 MAR 2026",
    docCount:    24,
    status:      "verified",
    avatarColor: "transparent",
  },
  {
    id:          "rec5",
    patientId:   "REC-005",
    name:        "Alice Cooper",
    lastUpdate:  "15 MAR 2026",
    docCount:    24,
    status:      "verified",
    avatarColor: "transparent",
  }
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const myPatientsMeta = {
  // Page header
  backLabel:         " ",
  pageTitle:         "Patient Records",
  pageSubtitle:      "Access comprehensive medical history and digital health records",

  // Search / filter bar
  searchPlaceholder: "Search records by ID or name...",
  filtersLabel:      "Filters",

  // Action labels
  openArchiveLabel:  "OPEN ARCHIVE",
  viewAllLabel:      "VIEW ALL",

  // Card header
  listCardTitle:     "Medical Records Archive",

  // Active nav item for AppSidebar
  activeNav:         "records",
};