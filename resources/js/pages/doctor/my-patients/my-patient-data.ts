// resources/js/pages/user/my-patients/my-patients-data.ts

export type PatientStatus = "stable" | "recovering" | "critical" | "observation";

export interface Patient {
  id:          string;
  patientId:   string;
  name:        string;
  age:         number;
  gender:      "Male" | "Female";
  lastVisit:   string;
  status:      PatientStatus;
  initials:    string;
  avatarColor: string;
  avatarSrc?:  string;
  phone:       string;
  email:       string;
  address:     string;
  bloodType:   string;
  weight:      string;
  height:      string;
  birthDate:   string;
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
    avatarColor: "#94a3b8",
    avatarSrc:   "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 917 123 4567",
    email:       "sarah.j@wellcare.com",
    address:     "Brgy. 143, Pasay City, Metro Manila",
    bloodType:   "O+",
    weight:      "58 kg",
    height:      "165 cm",
    birthDate:   "12 Feb 1998",
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
    avatarColor: "#64748b",
    avatarSrc:   "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 918 987 6543",
    email:       "m.chen@wellcare.com",
    address:     "Subdivision A, Tanza, Cavite",
    bloodType:   "A+",
    weight:      "78 kg",
    height:      "174 cm",
    birthDate:   "05 Mar 1981",
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
    avatarColor: "#94a3b8",
    avatarSrc:   "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 908 555 1234",
    email:       "emma.w@wellcare.com",
    address:     "General Luna St., Vigan, Ilocos Sur",
    bloodType:   "B+",
    weight:      "60 kg",
    height:      "163 cm",
    birthDate:   "18 Jul 1994",
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
    avatarColor: "#78716c",
    avatarSrc:   "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 915 222 3333",
    email:       "r.taylor@wellcare.com",
    address:     "Hacienda Estate, Tarlac City",
    bloodType:   "AB+",
    weight:      "85 kg",
    height:      "178 cm",
    birthDate:   "03 Nov 1967",
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
    avatarColor: "#b45309",
    avatarSrc:   "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 922 444 8888",
    email:       "alice.c@wellcare.com",
    address:     "Calamba, Laguna",
    bloodType:   "O-",
    weight:      "52 kg",
    height:      "160 cm",
    birthDate:   "14 Sep 2002",
  },
  {
    id:          "p6",
    patientId:   "P-1006",
    name:        "James Miller",
    age:         50,
    gender:      "Male",
    lastVisit:   "12 Mar 2026",
    status:      "recovering",
    initials:    "JM",
    avatarColor: "#059669",
    avatarSrc:   "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 919 777 0000",
    email:       "james.m@wellcare.com",
    address:     "Quezon City, Metro Manila",
    bloodType:   "A-",
    weight:      "82 kg",
    height:      "176 cm",
    birthDate:   "22 Apr 1976",
  },
  {
    id:          "p7",
    patientId:   "P-1007",
    name:        "Manny Pacquiao",
    age:         47,
    gender:      "Male",
    lastVisit:   "10 Mar 2026",
    status:      "recovering",
    initials:    "MP",
    avatarColor: "#059669",
    avatarSrc:   "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 920 111 2222",
    email:       "manny.p@wellcare.com",
    address:     "General Santos City, South Cotabato",
    bloodType:   "B-",
    weight:      "66 kg",
    height:      "166 cm",
    birthDate:   "17 Dec 1978",
  },
  {
    id:          "p8",
    patientId:   "P-1008",
    name:        "Catriona Gray",
    age:         30,
    gender:      "Female",
    lastVisit:   "08 Mar 2026",
    status:      "stable",
    initials:    "CG",
    avatarColor: "#3b82f6",
    avatarSrc:   "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face",
    phone:       "+63 927 333 4444",
    email:       "cat.gray@wellcare.com",
    address:     "Albay, Bicol Region",
    bloodType:   "O+",
    weight:      "55 kg",
    height:      "178 cm",
    birthDate:   "06 Jan 1994",
  },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const myPatientsMeta = {
  backHref:          "/dashboard",
  pageTitle:         "My Patients",
  pageSubtitle:      "Manage and view your patient records and medical history.",

  searchPlaceholder: "Search by name or patient ID…",
  filtersLabel:      "Filters",

  colPatient:    "PATIENT",
  colAgeGender:  "AGE / GENDER",
  colLastVisit:  "LAST VISIT",
  colStatus:     "STATUS",
  colActions:    "ACTIONS",

  viewLabel:     "View",
  editLabel:     "Edit",
  viewAllLabel:  "VIEW ALL",
  listCardTitle: "Patient List",

  activeNav:     "patients",
};