// resources/js/pages/user/lab-reviews/lab-reviews-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content, types and mock data for the Lab Reviews page.
// Edit values here — no component needs to change.

import type { LabResultDetail } from "./components/type";

// ── Lab submission ────────────────────────────────────────────────────────────

export type LabResultStatus = "pending" | "reviewed" | "critical" | "normal";

export interface LabSubmission {
  id:        string;
  name:      string;
  test:      string;
  timeAgo:   string;
  status:    LabResultStatus;
  initials:  string;
  iconColor: string;   // background for the lab-flask avatar
}

export const labSubmissions: LabSubmission[] = [
  { id: "ls1", name: "Sarah Jenkins",  test: "Blood Panel",     timeAgo: "1h ago",  status: "pending",  initials: "SJ", iconColor: "var(--wc-blue-600)"  },
  { id: "ls2", name: "Michael Chen",   test: "ECG Report",      timeAgo: "3h ago",  status: "critical", initials: "MC", iconColor: "#7c3aed"              },
  { id: "ls3", name: "Emma Wilson",    test: "X-Ray Scan",      timeAgo: "5h ago",  status: "pending",  initials: "EW", iconColor: "#16a34a"              },
  { id: "ls4", name: "Robert Taylor",  test: "Urine Analysis",  timeAgo: "8h ago",  status: "reviewed", initials: "RT", iconColor: "#ca8a04"              },
  { id: "ls5", name: "Alice Cooper",   test: "MRI Brain",       timeAgo: "1d ago",  status: "normal",   initials: "AC", iconColor: "#0891b2"              },
  { id: "ls6", name: "James Miller",   test: "Lipid Profile",   timeAgo: "1d ago",  status: "pending",  initials: "JM", iconColor: "#be185d"              },
  { id: "ls7", name: "Maria Santos",   test: "Thyroid Panel",   timeAgo: "2d ago",  status: "reviewed", initials: "MS", iconColor: "#0056b3"              },
  { id: "ls8", name: "Carlos Reyes",   test: "HbA1c Test",      timeAgo: "2d ago",  status: "critical", initials: "CR", iconColor: "#dc2626"              },
];

// ── Full lab result details (used by LaboratoryResultModal) ──────────────────

export const labResultDetails: LabResultDetail[] = [
  {
    id: "ls1",
    name: "Sarah Jenkins",
    test: "Blood Panel",
    timeAgo: "1h ago",
    status: "pending",
    patientId: "P-10021",
    testParameters: [
      { name: "Hemoglobin",   result: "13.2", unit: "g/dL",   refRange: "12.0–16.0", status: "normal"   },
      { name: "WBC Count",    result: "11.8", unit: "×10³/µL",refRange: "4.5–11.0",  status: "abnormal" },
      { name: "Platelets",    result: "215",  unit: "×10³/µL",refRange: "150–400",   status: "normal"   },
      { name: "Hematocrit",   result: "39.5", unit: "%",       refRange: "36–46",     status: "normal"   },
    ],
    interpretation: "WBC count slightly elevated. Possible mild infection or inflammation. Recommend follow-up CBC in 1 week.",
  },
  {
    id: "ls2",
    name: "Michael Chen",
    test: "ECG Report",
    timeAgo: "3h ago",
    status: "critical",
    patientId: "P-10034",
    testParameters: [
      { name: "Heart Rate",   result: "112",  unit: "bpm",     refRange: "60–100",    status: "abnormal" },
      { name: "PR Interval",  result: "0.24", unit: "s",       refRange: "0.12–0.20", status: "abnormal" },
      { name: "QRS Duration", result: "0.10", unit: "s",       refRange: "0.06–0.10", status: "normal"   },
      { name: "QT Interval",  result: "0.46", unit: "s",       refRange: "0.35–0.44", status: "abnormal" },
    ],
    interpretation: "Tachycardia with prolonged PR and QT intervals detected. First-degree AV block suspected. Urgent cardiology consult required.",
  },
  {
    id: "ls3",
    name: "Emma Wilson",
    test: "X-Ray Scan",
    timeAgo: "5h ago",
    status: "pending",
    patientId: "P-10047",
    testParameters: [
      { name: "Lung Fields",    result: "Clear",  unit: "",   refRange: "Clear",    status: "normal"   },
      { name: "Cardiac Shadow", result: "Normal", unit: "",   refRange: "Normal",   status: "normal"   },
      { name: "Costophrenic",   result: "Blunt",  unit: "",   refRange: "Sharp",    status: "abnormal" },
      { name: "Mediastinum",    result: "Normal", unit: "",   refRange: "Normal",   status: "normal"   },
    ],
    interpretation: "Blunting of the costophrenic angles bilaterally suggesting possible pleural effusion. CT scan recommended for confirmation.",
  },
  {
    id: "ls4",
    name: "Robert Taylor",
    test: "Urine Analysis",
    timeAgo: "8h ago",
    status: "reviewed",
    patientId: "P-10058",
    testParameters: [
      { name: "Protein",    result: "Trace",    unit: "",      refRange: "Negative", status: "abnormal" },
      { name: "Glucose",    result: "Negative", unit: "",      refRange: "Negative", status: "normal"   },
      { name: "WBC",        result: "2–4",      unit: "/HPF",  refRange: "0–5",      status: "normal"   },
      { name: "pH",         result: "6.0",      unit: "",      refRange: "4.5–8.0",  status: "normal"   },
    ],
    interpretation: "Trace proteinuria noted. No signs of active infection. Monitor blood pressure and repeat UA in 4 weeks.",
  },
  {
    id: "ls5",
    name: "Alice Cooper",
    test: "MRI Brain",
    timeAgo: "1d ago",
    status: "normal",
    patientId: "P-10062",
    testParameters: [
      { name: "White Matter",    result: "Normal", unit: "", refRange: "Normal", status: "normal" },
      { name: "Grey Matter",     result: "Normal", unit: "", refRange: "Normal", status: "normal" },
      { name: "Ventricles",      result: "Normal", unit: "", refRange: "Normal", status: "normal" },
      { name: "Cerebellum",      result: "Normal", unit: "", refRange: "Normal", status: "normal" },
    ],
    interpretation: "No acute intracranial abnormality. Normal MRI of the brain. No further imaging required at this time.",
  },
  {
    id: "ls6",
    name: "James Miller",
    test: "Lipid Profile",
    timeAgo: "1d ago",
    status: "pending",
    patientId: "P-10075",
    testParameters: [
      { name: "Total Cholesterol", result: "228", unit: "mg/dL", refRange: "<200",  status: "abnormal" },
      { name: "LDL",               result: "148", unit: "mg/dL", refRange: "<130",  status: "abnormal" },
      { name: "HDL",               result: "42",  unit: "mg/dL", refRange: ">40",   status: "normal"   },
      { name: "Triglycerides",     result: "190", unit: "mg/dL", refRange: "<150",  status: "abnormal" },
    ],
    interpretation: "Borderline high cholesterol with elevated LDL and triglycerides. Recommend dietary modification and re-evaluation in 3 months.",
  },
  {
    id: "ls7",
    name: "Maria Santos",
    test: "Thyroid Panel",
    timeAgo: "2d ago",
    status: "reviewed",
    patientId: "P-10089",
    testParameters: [
      { name: "TSH",  result: "2.1",  unit: "mIU/L", refRange: "0.4–4.0",  status: "normal" },
      { name: "Free T4", result: "1.2", unit: "ng/dL", refRange: "0.8–1.8", status: "normal" },
      { name: "Free T3", result: "3.0", unit: "pg/mL", refRange: "2.3–4.2", status: "normal" },
      { name: "Anti-TPO", result: "12", unit: "IU/mL", refRange: "<35",     status: "normal" },
    ],
    interpretation: "All thyroid parameters within normal limits. No evidence of thyroid dysfunction. Continue current management.",
  },
  {
    id: "ls8",
    name: "Carlos Reyes",
    test: "HbA1c Test",
    timeAgo: "2d ago",
    status: "critical",
    patientId: "P-10091",
    testParameters: [
      { name: "HbA1c",         result: "9.2",  unit: "%",      refRange: "<5.7",     status: "abnormal" },
      { name: "Fasting Glucose",result: "218", unit: "mg/dL",  refRange: "70–99",    status: "abnormal" },
      { name: "eAG",           result: "215",  unit: "mg/dL",  refRange: "70–154",   status: "abnormal" },
      { name: "Insulin",       result: "28",   unit: "µIU/mL", refRange: "2.6–24.9", status: "abnormal" },
    ],
    interpretation: "Severely uncontrolled diabetes. HbA1c of 9.2% indicates poor long-term glycemic control. Immediate medication adjustment and endocrinology referral required.",
  },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const labReviewsMeta = {
  // Page header
  pageTitle:        "Lab Reviews",
  pageSubtitle:     "Review and validate patient laboratory test results",
  backHref:         "/dashboard",

  // Search & filter bar
  searchPlaceholder: "Search by patient or test type…",
  filterLabel:       "Filters",

  // Card
  cardTitle:    "Recent Lab Submissions",
  viewAllLabel: "VIEW ALL",
  viewAllHref:  "/lab-reviews/all",
  reviewLabel:  "Review",

  // Active nav id — must match NavItem.id in dashboard-data.ts
  activeNavId: "labreviews",
};