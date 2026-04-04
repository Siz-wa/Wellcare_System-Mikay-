// resources/js/pages/user/my-patients/my-patients-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static and mock data for the My Patients page.
// Swap values here without touching any component files.

// ── Patient status ─────────────────────────────────────────────────────────────

export type PatientStatus = "stable" | "recovering" | "critical" | "observation";

// ── Patient record ─────────────────────────────────────────────────────────────

export interface Patient {
  id:         string;
  patientId:  string;
  name:       string;
  age:        number;
  gender:     "Male" | "Female";
  lastVisit:  string;
  status:     PatientStatus;
  initials:   string;
  avatarColor: string;
}

export const patients: Patient[] = [
  {
    id:          "p1",
    patientId:   "P-1001",
    name:        "Sarah Jenkins",
    age:         28,
    gender:      "Female",
    lastVisit:   "24 Mar 2026",
    status:      "stable",
    initials:    "SJ",
    avatarColor: "var(--wc-blue-600)",
  },
  {
    id:          "p2",
    patientId:   "P-1002",
    name:        "Michael Chen",
    age:         45,
    gender:      "Male",
    lastVisit:   "22 Mar 2026",
    status:      "recovering",
    initials:    "MC",
    avatarColor: "#7c3aed",
  },
  {
    id:          "p3",
    patientId:   "P-1003",
    name:        "Emma Wilson",
    age:         32,
    gender:      "Female",
    lastVisit:   "20 Mar 2026",
    status:      "stable",
    initials:    "EW",
    avatarColor: "#16a34a",
  },
  {
    id:          "p4",
    patientId:   "P-1004",
    name:        "Robert Taylor",
    age:         58,
    gender:      "Male",
    lastVisit:   "18 Mar 2026",
    status:      "critical",
    initials:    "RT",
    avatarColor: "#dc2626",
  },
  {
    id:          "p5",
    patientId:   "P-1005",
    name:        "Alice Cooper",
    age:         24,
    gender:      "Female",
    lastVisit:   "15 Mar 2026",
    status:      "stable",
    initials:    "AC",
    avatarColor: "#ca8a04",
  },
  {
    id:          "p6",
    patientId:   "P-1006",
    name:        "James Rivera",
    age:         61,
    gender:      "Male",
    lastVisit:   "12 Mar 2026",
    status:      "observation",
    initials:    "JR",
    avatarColor: "var(--wc-sky-500)",
  },
  {
    id:          "p7",
    patientId:   "P-1007",
    name:        "Linda Park",
    age:         37,
    gender:      "Female",
    lastVisit:   "10 Mar 2026",
    status:      "recovering",
    initials:    "LP",
    avatarColor: "#7c3aed",
  },
  {
    id:          "p8",
    patientId:   "P-1008",
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

export const myPatientsMeta = {
  // Page header
  backLabel:        "Back",
  pageTitle:        "My Patients",
  pageSubtitle:     "Manage and view your patient records and medical history.",

  // Search / filters
  searchPlaceholder: "Search by name or patient ID…",
  filtersLabel:      "Filters",

  // Table headings
  colPatient:     "PATIENT",
  colAgeGender:   "AGE / GENDER",
  colLastVisit:   "LAST VISIT",
  colStatus:      "STATUS",
  colActions:     "ACTIONS",

  // Actions
  viewLabel:      "View",
  editLabel:      "Edit",
  viewAllLabel:   "VIEW ALL",

  // Patient list card title
  listCardTitle:  "Patient List",

  // Active nav for sidebar
  activeNav:      "patients",
};