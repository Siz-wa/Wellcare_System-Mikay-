// resources/js/pages/doctor/dashboard/patient-records/patient-records-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types only — no hardcoded patient arrays.
// All data comes from the Inertia `patients` prop via PatientRecordController.

export type PatientStatus = "verified" | "pending";

// ── Patient card shape (from PatientRecordController::mapPatient) ─────────────

export interface Patient {
  id:               number;
  patientId:        string;   // "REC-001"
  name:             string;
  initials:         string;
  email:            string;
  lastUpdate:       string;   // last completed visit date
  docCount:         number;
  appointmentCount: number;
  hasAllergy:       boolean;  // shows red allergy flag on card
  activeDiagnoses:  number;   // count of active diagnoses
  status:           PatientStatus;
  allergySummary:   string | null; // "Penicillin, Shellfish"
}

// ── Detail page shapes ────────────────────────────────────────────────────────

export interface PatientProfile {
  firstName:     string;
  lastName:      string;
  birthdate:     string | null;
  gender:        string;
  address:       string | null;
  contactNumber: string | null;
  civilStatus:   string | null;
  clientNumber:  string | null;
}

export interface AllergyRecord {
  id:       number;
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction: string | null;
  notes:    string | null;
}

export interface DiagnosisRecord {
  id:          number;
  icdCode:     string | null;
  diagnosis:   string;
  type:        "primary" | "secondary" | "chronic";
  status:      "active" | "resolved" | "chronic";
  diagnosedAt: string;
  notes:       string | null;
}

export interface DocumentRecord {
  id:          number;
  title:       string;
  type:        "lab" | "imaging" | "referral" | "prescription" | "report" | "other";
  fileName:    string;
  size:        string;
  uploadedAt:  string;
  downloadUrl: string;
}

export interface VisitRecord {
  id:      number;
  date:    string;
  service: string;
  soap:    { assessment: string; plan: string } | null;
  vitals:  {
    bloodPressure:    string;
    heartRate:        string;
    temperature:      string;
    oxygenSaturation: string;
    weight:           string;
    height:           string;
  } | null;
  prescriptions: { name: string; instructions: string }[];
}

export interface LatestVitals {
  bloodPressure:    string;
  heartRate:        string;
  temperature:      string;
  oxygenSaturation: string;
  weight:           string;
  height:           string;
}

// ── Page meta ─────────────────────────────────────────────────────────────────

export const patientRecordsMeta = {
  backLabel:         " ",
  pageTitle:         "Patient Records",
  pageSubtitle:      "Complete medical history and digital health records for all clinic patients",
  searchPlaceholder: "Search by name or email…",
  filtersLabel:      "Filters",
  openArchiveLabel:  "OPEN ARCHIVE",
  viewAllLabel:      "VIEW ALL",
  listCardTitle:     "Medical Records Archive",
  activeNav:         "patient-records",
};

// ── Document type labels ──────────────────────────────────────────────────────

export const DOC_TYPE_LABEL: Record<DocumentRecord["type"], string> = {
  lab:          "Lab Result",
  imaging:      "Imaging",
  referral:     "Referral",
  prescription: "Prescription",
  report:       "Report",
  other:        "Other",
};

// ── Severity colors ───────────────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<AllergyRecord["severity"], { label: string; bg: string; color: string }> = {
  mild:     { label: "Mild",     bg: "#fef9c3", color: "#a16207" },
  moderate: { label: "Moderate", bg: "#ffedd5", color: "#c2410c" },
  severe:   { label: "Severe",   bg: "#fee2e2", color: "#b91c1c" },
};

// ── Diagnosis status colors ───────────────────────────────────────────────────

export const DIAGNOSIS_STATUS_CONFIG: Record<DiagnosisRecord["status"], { label: string; bg: string; color: string }> = {
  active:   { label: "Active",   bg: "#fee2e2", color: "#b91c1c" },
  chronic:  { label: "Chronic",  bg: "#ffedd5", color: "#c2410c" },
  resolved: { label: "Resolved", bg: "#dcfce7", color: "#15803d" },
};