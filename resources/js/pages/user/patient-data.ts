// resources/js/pages/patient/patient-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared types + mock data — used by ALL patient pages.
// In production: replace mocks with Inertia page props.

// ── Primitive types ───────────────────────────────────────────────────────────

export type Gender            = "M" | "F";
export type CivilStatus       = "single" | "married" | "widowed";
export type Classification    = "new" | "old";
export type PaymentMethod     = "cash" | "pwd" | "senior" | "mwc" | "hmo";
export type AppointmentStatus = "upcoming" | "completed" | "cancelled";
export type RecordType        = "lab" | "xray" | "prescription" | "consult" | "imaging";
export type RecordStatus      = "normal" | "reviewed" | "critical" | "pending";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PatientProfile {
  id: number; userId: number; firstName: string; lastName: string;
  address: string; company: string; contactNumber: string;
  gender: Gender; birthdate: string; civilStatus: CivilStatus;
  clientNumber: string; classification: Classification;
}

export interface PatientMedical {
  height: number; weight: number; bloodPressure: string;
  hmo: string; paymentMethod: PaymentMethod; preferredDoctor: string;
}

export interface DoctorProfile {
  id: number; displayName: string; specialty: string;
  specialization: string; initials: string; color: string; isActive: boolean;
}

export interface Appointment {
  id: string; date: string; time: string;
  doctor: string; specialty: string;
  status: AppointmentStatus; location: string;
}

export interface VitalCard {
  id: string; label: string; value: string; unit: string; icon: string;
  trend?: "up" | "down" | "stable"; trendLabel?: string; colorAccent: string;
}

// ── NEW: Medical Record ───────────────────────────────────────────────────────

export interface MedicalRecord {
  id:        string;
  title:     string;
  type:      RecordType;
  date:      string;
  doctor:    string;
  specialty: string;
  status:    RecordStatus;
  notes:     string;
  fileSize?: string;
}

// ── NEW: Care Team Doctor ─────────────────────────────────────────────────────

export interface CareDoctor {
  id:             number;
  displayName:    string;
  specialty:      string;
  specialization: string;
  initials:       string;
  color:          string;
  isActive:       boolean;
  nextAvailable:  string;
  totalVisits:    number;
  lastVisit:      string;
  contact:        string;
  schedule:       string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const mockPatientProfile: PatientProfile = {
  id: 1, userId: 4,
  firstName: "Maria", lastName: "Santos",
  address: "123 Rizal St., Bacoor, Cavite",
  company: "Wellcare Clinics",
  contactNumber: "+63 917 123 4567",
  gender: "F", birthdate: "1992-06-15",
  civilStatus: "married", clientNumber: "WC-2026-00142",
  classification: "old",
};

export const mockPatientMedical: PatientMedical = {
  height: 162, weight: 58.5, bloodPressure: "118/76",
  hmo: "PhilHealth", paymentMethod: "hmo",
  preferredDoctor: "Dr. Douglas McArthur",
};

export const mockPreferredDoctor: DoctorProfile = {
  id: 1, displayName: "Dr. Douglas McArthur",
  specialty: "Cardiology", specialization: "Interventional Cardiology",
  initials: "DM", color: "#0056b3", isActive: true,
};

export const mockAppointments: Appointment[] = [
  { id: "appt-001", date: "28 APR 2026", time: "9:00 AM",  doctor: "Dr. Douglas McArthur", specialty: "Cardiology",       status: "upcoming",  location: "Room 204, Wellcare Clinics" },
  { id: "appt-002", date: "15 APR 2026", time: "2:30 PM",  doctor: "Dr. Ana Reyes",         specialty: "General Medicine", status: "completed", location: "Room 101, Wellcare Clinics" },
  { id: "appt-003", date: "02 MAR 2026", time: "10:00 AM", doctor: "Dr. Joel Cruz",          specialty: "Pulmonology",     status: "completed", location: "Room 308, Wellcare Clinics" },
];

export const mockVitals: VitalCard[] = [
  { id: "bp",     label: "Blood Pressure", value: "118/76", unit: "mmHg",  icon: "heart",    trend: "stable", trendLabel: "Normal",  colorAccent: "#2B59C3" },
  { id: "weight", label: "Weight",         value: "58.5",   unit: "kg",    icon: "scale",    trend: "down",   trendLabel: "–0.5 kg", colorAccent: "#8B5CF6" },
  { id: "height", label: "Height",         value: "162",    unit: "cm",    icon: "ruler",    trend: "stable", trendLabel: "Stable",  colorAccent: "#F97316" },
  { id: "bmi",    label: "BMI",            value: "22.3",   unit: "kg/m²", icon: "activity", trend: "stable", trendLabel: "Healthy", colorAccent: "#10B981" },
];

// ── NEW: Mock medical records ─────────────────────────────────────────────────

export const mockMedicalRecords: MedicalRecord[] = [
  { id: "rec-001", title: "Complete Blood Count",        type: "lab",          date: "15 Apr 2026", doctor: "Dr. Ana Reyes",         specialty: "General Medicine", status: "normal",   notes: "All values within normal range.",           fileSize: "245 KB" },
  { id: "rec-002", title: "Chest X-Ray",                 type: "xray",         date: "15 Apr 2026", doctor: "Dr. Ana Reyes",         specialty: "General Medicine", status: "normal",   notes: "No abnormalities detected.",                fileSize: "1.2 MB" },
  { id: "rec-003", title: "Cardiology Consultation",     type: "consult",      date: "28 Mar 2026", doctor: "Dr. Douglas McArthur",  specialty: "Cardiology",       status: "reviewed", notes: "Follow-up in 3 months recommended.",        fileSize: "88 KB"  },
  { id: "rec-004", title: "Amoxicillin Prescription",    type: "prescription", date: "02 Mar 2026", doctor: "Dr. Joel Cruz",          specialty: "Pulmonology",      status: "reviewed", notes: "500mg twice daily for 7 days.",             fileSize: "34 KB"  },
  { id: "rec-005", title: "2D Echocardiogram",           type: "imaging",      date: "10 Feb 2026", doctor: "Dr. Douglas McArthur",  specialty: "Cardiology",       status: "reviewed", notes: "Normal cardiac function. EF 65%.",          fileSize: "3.4 MB" },
  { id: "rec-006", title: "Urinalysis",                  type: "lab",          date: "10 Feb 2026", doctor: "Dr. Ana Reyes",         specialty: "General Medicine", status: "normal",   notes: "No significant findings.",                  fileSize: "112 KB" },
];

// ── NEW: Mock care team doctors ───────────────────────────────────────────────

export const mockCareDoctors: CareDoctor[] = [
  {
    id: 1, displayName: "Dr. Douglas McArthur", specialty: "Cardiology",
    specialization: "Interventional Cardiology",
    initials: "DM", color: "#0056b3", isActive: true,
    nextAvailable: "Apr 28, 2026", totalVisits: 8,
    lastVisit: "Mar 28, 2026", contact: "+63 2 8888 1001",
    schedule: "Mon, Wed, Fri · 9:00 AM – 5:00 PM",
  },
  {
    id: 2, displayName: "Dr. Ana Reyes", specialty: "General Medicine",
    specialization: "Internal Medicine",
    initials: "AR", color: "#7c3aed", isActive: true,
    nextAvailable: "Apr 22, 2026", totalVisits: 14,
    lastVisit: "Apr 15, 2026", contact: "+63 2 8888 1002",
    schedule: "Mon – Fri · 8:00 AM – 4:00 PM",
  },
  {
    id: 3, displayName: "Dr. Joel Cruz", specialty: "Pulmonology",
    specialization: "Respiratory Medicine",
    initials: "JC", color: "#16a34a", isActive: false,
    nextAvailable: "May 5, 2026", totalVisits: 3,
    lastVisit: "Mar 02, 2026", contact: "+63 2 8888 1003",
    schedule: "Tue, Thu · 10:00 AM – 3:00 PM",
  },
];

// ── Shared labels / meta ──────────────────────────────────────────────────────

export const patientMeta = {
  greetingName:            "Maria",
  pageSubtitle:            "Here's what's happening with your health today.",
  bookAppointmentLabel:    "Book Appointment",
  viewAllLabel:            "VIEW ALL",
  viewRecordsLabel:        "View Records",
  editProfileLabel:        "Edit Profile",
  vitalsTitle:             "My Vitals",
  vitalsSubtitle:          "Latest measurements from your medical records",
  appointmentHistoryTitle: "Appointment History",
  profileCardTitle:        "My Profile",
  medicalCardTitle:        "Medical Information",
  doctorCardTitle:         "My Doctor",
  clientNoLabel:           "Client No.",
  contactLabel:            "Contact",
  birthdateLabel:          "Birthdate",
  addressLabel:            "Address",
  companyLabel:            "Company",
  hmoLabel:                "HMO / Insurance",
  paymentLabel:            "Payment Method",
  bloodPressureLabel:      "Blood Pressure",
  heightLabel:             "Height",
  weightLabel:             "Weight",

  // Medical Records page
  recordsPageTitle:        "Medical Records",
  recordsPageSubtitle:     "Your complete digital health history",
  downloadAllLabel:        "Download All",
  searchRecordsPlaceholder:"Search records by type or doctor…",

  // My Doctors page
  doctorsPageTitle:        "My Doctors",
  doctorsPageSubtitle:     "Your assigned care team",
  bookWithDoctorLabel:     "Book Appointment",
  viewProfileLabel:        "View Profile",
  scheduleLabel:           "Schedule",
  lastVisitLabel:          "Last Visit",
  totalVisitsLabel:        "Total Visits",
  nextAvailableLabel:      "Next Available",
  contactLabel2:           "Contact",

  // Record type labels
  recordTypeLabels: {
    lab:          "Lab Result",
    xray:         "X-Ray",
    prescription: "Prescription",
    consult:      "Consultation",
    imaging:      "Imaging",
  } as Record<RecordType, string>,

  // Record status labels
  recordStatusLabels: {
    normal:   "Normal",
    reviewed: "Reviewed",
    critical: "Critical",
    pending:  "Pending",
  } as Record<RecordStatus, string>,

  statusLabels: { upcoming: "Upcoming", completed: "Completed", cancelled: "Cancelled" } as Record<AppointmentStatus, string>,
  genderLabels:         { M: "Male", F: "Female" } as Record<Gender, string>,
  civilStatusLabels:    { single: "Single", married: "Married", widowed: "Widowed" } as Record<CivilStatus, string>,
  classificationLabels: { new: "New Patient", old: "Returning Patient" } as Record<Classification, string>,
  paymentLabels:        { cash: "Cash", pwd: "PWD Discount", senior: "Senior Citizen", mwc: "MWC", hmo: "HMO" } as Record<PaymentMethod, string>,

  quickActions: [
    { id: "book",    label: "Book Appointment", icon: "calendar-plus" },
    { id: "records", label: "View Records",      icon: "folder"        },
    { id: "results", label: "Lab Results",       icon: "flask"         },
    { id: "support", label: "Contact Support",   icon: "headset"       },
  ],
};