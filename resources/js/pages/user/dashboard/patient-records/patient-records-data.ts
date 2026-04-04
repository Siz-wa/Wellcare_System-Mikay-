// resources/js/pages/user/patient-records/patient-records-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static and mock data for the Patient Records page.
// Swap values here without touching any component files.

// ── Re-export PatientStatus so PatientListCard can stay type-compatible ───────
// PatientListCard imports Patient + PatientStatus from its data file.
// We keep the same shape here so the card works with this data too.

export type PatientStatus = "stable" | "recovering" | "critical" | "observation";

export interface Patient {
  id:          string;
  patientId:   string;   // shown as "ID: REC-001" in this page
  name:        string;
  age:         number;
  gender:      "Male" | "Female";
  lastVisit:   string;
  status:      PatientStatus;
  initials:    string;
  avatarColor: string;
}

export const patients: Patient[] = [
  {
    id:          "rec1",
    patientId:   "REC-001",
    name:        "Sarah Jenkins",
    age:         28,
    gender:      "Female",
    lastVisit:   "24 Mar 2026",
    status:      "stable",
    initials:    "SJ",
    avatarColor: "var(--wc-blue-600)",
  },
  {
    id:          "rec2",
    patientId:   "REC-002",
    name:        "Michael Chen",
    age:         45,
    gender:      "Male",
    lastVisit:   "22 Mar 2026",
    status:      "recovering",
    initials:    "MC",
    avatarColor: "#7c3aed",
  },
  {
    id:          "rec3",
    patientId:   "REC-003",
    name:        "Emma Wilson",
    age:         32,
    gender:      "Female",
    lastVisit:   "20 Mar 2026",
    status:      "stable",
    initials:    "EW",
    avatarColor: "#16a34a",
  },
  {
    id:          "rec4",
    patientId:   "REC-004",
    name:        "Robert Taylor",
    age:         58,
    gender:      "Male",
    lastVisit:   "18 Mar 2026",
    status:      "critical",
    initials:    "RT",
    avatarColor: "#dc2626",
  },
  {
    id:          "rec5",
    patientId:   "REC-005",
    name:        "Alice Cooper",
    age:         24,
    gender:      "Female",
    lastVisit:   "15 Mar 2026",
    status:      "stable",
    initials:    "AC",
    avatarColor: "#ca8a04",
  },
  {
    id:          "rec6",
    patientId:   "REC-006",
    name:        "James Rivera",
    age:         61,
    gender:      "Male",
    lastVisit:   "12 Mar 2026",
    status:      "observation",
    initials:    "JR",
    avatarColor: "var(--wc-sky-500)",
  },
  {
    id:          "rec7",
    patientId:   "REC-007",
    name:        "Linda Park",
    age:         37,
    gender:      "Female",
    lastVisit:   "10 Mar 2026",
    status:      "recovering",
    initials:    "LP",
    avatarColor: "#7c3aed",
  },
  {
    id:          "rec8",
    patientId:   "REC-008",
    name:        "David Nguyen",
    age:         50,
    gender:      "Male",
    lastVisit:   "08 Mar 2026",
    status:      "stable",
    initials:    "DN",
    avatarColor: "var(--wc-blue-600)",
  },
];

// ── Page meta ─────────────────────────────────────────────────────────────────
// All labels consumed by PatientListCard + the page composer.
// Follows the exact same shape as myPatientsMeta so PatientListCard
// works without any changes to that component.

export const myPatientsMeta = {
  // Page header
  backLabel:         "Back",
  pageTitle:         "Patient Records",
  pageSubtitle:      "Access comprehensive medical history and digital health records.",

  // Search / filter bar
  searchPlaceholder: "Search records by ID or name…",
  filtersLabel:      "Filters",

  // Table column headings (same keys PatientListCard expects)
  colPatient:        "PATIENT",
  colAgeGender:      "AGE / GENDER",
  colLastVisit:      "LAST VISIT",
  colStatus:         "STATUS",
  colActions:        "ACTIONS",

  // Action buttons
  viewLabel:         "View",
  editLabel:         "Edit",

  // Card header
  listCardTitle:     "Medical Records Archive",
  viewAllLabel:      "VIEW ALL",

  // Active nav item for AppSidebar
  activeNav:         "records",
};