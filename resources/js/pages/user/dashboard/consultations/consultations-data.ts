// resources/js/pages/user/consultations/consultations-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static text, labels, and mock data for the Consultations page.
// No hardcoded strings in component files — swap here only.

// ── Consultation status ───────────────────────────────────────────────────────

export type ConsultationStatus = "finalized" | "in-progress" | "draft";

// ── Consultation record ───────────────────────────────────────────────────────

export interface ConsultationRecord {
  id:        string;
  patientId: string;
  patient:   string;
  initials:  string;
  color:     string;
  date:      string;
  time:      string;
  diagnosis: string;
  status:    ConsultationStatus;
}

export const recentConsultations: ConsultationRecord[] = [
  {
    id: "c-001", patientId: "C-001", patient: "Sarah Jenkins",
    initials: "SJ", color: "var(--wc-blue-600)",
    date: "24 Mar 2026", time: "09:00 AM",
    diagnosis: "Acute Pharyngitis", status: "finalized",
  },
  {
    id: "c-002", patientId: "C-002", patient: "Michael Chen",
    initials: "MC", color: "#7c3aed",
    date: "22 Mar 2026", time: "10:30 AM",
    diagnosis: "Hypertension Follow-up", status: "finalized",
  },
  {
    id: "c-003", patientId: "C-003", patient: "Emma Wilson",
    initials: "EW", color: "#16a34a",
    date: "20 Mar 2026", time: "01:15 PM",
    diagnosis: "Dental Abscess", status: "finalized",
  },
  {
    id: "c-004", patientId: "C-004", patient: "Robert Taylor",
    initials: "RT", color: "#ca8a04",
    date: "18 Mar 2026", time: "03:45 PM",
    diagnosis: "Osteoarthritis", status: "finalized",
  },
  {
    id: "c-005", patientId: "C-005", patient: "Lisa Gomez",
    initials: "LG", color: "var(--wc-sky-500)",
    date: "15 Mar 2026", time: "11:00 AM",
    diagnosis: "Type 2 Diabetes Review", status: "finalized",
  },
  {
    id: "c-006", patientId: "C-006", patient: "James Reyes",
    initials: "JR", color: "#dc2626",
    date: "12 Mar 2026", time: "02:00 PM",
    diagnosis: "Chest Pain — Workup", status: "finalized",
  },
];

// ── SOAP notes ────────────────────────────────────────────────────────────────

export interface SoapFields {
  subjective: string;
  objective:  string;
  assessment: string;
  plan:       string;
}

export const emptySoap: SoapFields = {
  subjective: "",
  objective:  "",
  assessment: "",
  plan:       "",
};

export interface SoapField {
  key:         keyof SoapFields;
  label:       string;
  placeholder: string;
  dotColor:    string;
}

export const soapFields: SoapField[] = [
  { key: "subjective", label: "SUBJECTIVE", placeholder: "Patient's reported symptoms and history…", dotColor: "var(--wc-sky-500)"  },
  { key: "objective",  label: "OBJECTIVE",  placeholder: "Physical exam findings and test results…",  dotColor: "#16a34a"            },
  { key: "assessment", label: "ASSESSMENT", placeholder: "Diagnosis and clinical reasoning…",          dotColor: "var(--wc-blue-600)" },
  { key: "plan",       label: "PLAN",       placeholder: "Treatment plan and follow-up steps…",        dotColor: "#ca8a04"            },
];

// ── Vitals ────────────────────────────────────────────────────────────────────

export interface VitalsFields {
  bloodPressure:    string;
  heartRate:        string;
  temperature:      string;
  oxygenSaturation: string;
  weight:           string;
  height:           string;
}

export const defaultVitals: VitalsFields = {
  bloodPressure:    "120/80",
  heartRate:        "72",
  temperature:      "36.5",
  oxygenSaturation: "98",
  weight:           "70",
  height:           "175",
};

export interface VitalField {
  key:         keyof VitalsFields;
  label:       string;
  unit:        string;
  placeholder: string;
}

export const vitalFields: VitalField[] = [
  { key: "bloodPressure",    label: "Blood Pressure",    unit: "MMHG", placeholder: "120/80" },
  { key: "heartRate",        label: "Heart Rate",        unit: "BPM",  placeholder: "72"     },
  { key: "temperature",      label: "Temperature",       unit: "°C",   placeholder: "36.5"   },
  { key: "oxygenSaturation", label: "Oxygen Saturation", unit: "%",    placeholder: "98"     },
  { key: "weight",           label: "Weight",            unit: "KG",   placeholder: "70"     },
  { key: "height",           label: "Height",            unit: "CM",   placeholder: "175"    },
];

// ── Prescription / medications ────────────────────────────────────────────────

export interface Medication {
  id:           string;
  name:         string;
  instructions: string;
}

export const defaultMedications: Medication[] = [
  { id: "med-1", name: "Amoxicillin 500mg", instructions: "Twice daily after meals • 7 Days" },
];

// ── Session editor tabs ───────────────────────────────────────────────────────

export type SessionTab = "soap" | "vitals" | "prescription";

export interface TabItem {
  key:     SessionTab;
  label:   string;
  iconKey: "soap" | "vitals" | "prescription";
}

export const sessionTabs: TabItem[] = [
  { key: "soap",         label: "Soap Notes",     iconKey: "soap"         },
  { key: "vitals",       label: "Patient Vitals", iconKey: "vitals"       },
  { key: "prescription", label: "Prescription",   iconKey: "prescription" },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const consultationsMeta = {
  pageTitle:           "Consultations",
  pageSubtitle:        "Conduct and manage clinical consultation sessions",
  startSessionLabel:   "+ Start New Session",
  searchPlaceholder:   "Search by patient or diagnosis…",
  filtersLabel:        "Filters",
  recentTitle:         "Recent Consultations",
  viewAll:             "VIEW ALL",
  colPatient:          "PATIENT",
  colDateTime:         "DATE / TIME",
  colDiagnosis:        "DIAGNOSIS",
  colStatus:           "STATUS",
  colActions:          "ACTIONS",
  viewSummaryLabel:    "VIEW SUMMARY",
  editorTitle:         "Consultation Session",
  editorPatientLabel:  "PATIENT:",
  editorPatientEmpty:  "SELECT PATIENT",
  pastHistoryLabel:    "PAST HISTORY",
  autoSaveLabel:       "AUTO-SAVING SESSION…",
  discardLabel:        "Discard",
  finalizeLabel:       "Finalize Consultation",
  medicationListTitle: "Medication List",
  addMedicineLabel:    "+ ADD MEDICINE",
  newMedNamePlaceholder:  "Medicine name & dosage",
  newMedInstrPlaceholder: "Instructions (e.g. Twice daily • 7 Days)",
};