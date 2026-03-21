// resources/js/pages/user/doctors/doctorsData.ts

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const doctorsHeroData = {
  pill: "Our Specialists",
  heading: { plain: "World-Class Doctors,", gradient: "Human Touch." },
  body: "Meet the board-certified specialists behind Wellcare's reputation for excellence. Every doctor on our team was chosen not just for their credentials — but for their commitment to treating every patient as a person.",
  stats: [
    { value: "50+",  label: "Specialists" },
    { value: "15+",  label: "Disciplines" },
    { value: "98%",  label: "Patient Satisfaction" },
    { value: "24hr", label: "Avg. Result Turnaround" },
  ],
};

// ─── Specialties filter ───────────────────────────────────────────────────────
export const specialties = [
  "All",
  "Dermatology",
  "Psychiatry",
  "Pediatrics",
  "Internal Medicine",
  "ENT",
  "Surgery",
  "Dental",
  "Ophthalmology",
  "OB-GYN",
  "In-House",
] as const;

export type Specialty = typeof specialties[number];

// ─── Doctor interface ─────────────────────────────────────────────────────────
export interface DoctorItem {
  id: string;
  name: string;
  specialty: Specialty;
  specialization: string;   // full label shown on card e.g. "IM-Cardiology"
  initials: string;
  color: string;
  schedules: { days: string; hours: string }[];
  
}

// ─── Color map per specialty group ────────────────────────────────────────────
const COLORS: Record<string, string> = {
  Dermatology:      "#0056b3",
  Psychiatry:       "#7c3aed",
  Pediatrics:       "#0891b2",
  "Internal Medicine": "#16a34a",
  ENT:              "#ca8a04",
  Surgery:          "#dc2626",
  Dental:           "#059669",
  Ophthalmology:    "#00a8e8",
  "OB-GYN":         "#db2777",
  "In-House":       "#475569",
};

function color(spec: string): string {
  return COLORS[spec] ?? "#0056b3";
}

function initials(name: string): string {
  const parts = name.replace("Dr. ", "").split(" ");
  return (parts[0][0] + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

// ─── Doctor roster ────────────────────────────────────────────────────────────
export const doctorsData: DoctorItem[] = [
  // Dermatology
  {
    id: "flerida-ambat",
    name: "Dr. Flerida Ambat",
    specialty: "Dermatology",
    specialization: "Dermatologist",
    initials: initials("Dr. Flerida Ambat"),
    color: color("Dermatology"),
    schedules: [{ days: "Mon / Tue / Wed / Fri / Sat", hours: "10AM – 1PM" }],
  },

  // Psychiatry
  {
    id: "kristine-brania",
    name: "Dr. Kristine Rose Brania-Alcantara",
    specialty: "Psychiatry",
    specialization: "Psychiatry",
    initials: "KB",
    color: color("Psychiatry"),
    schedules: [{ days: "Saturday", hours: "1PM – 5PM" }],

  },

  // Pediatrics
  {
    id: "estephany-guerra",
    name: "Dr. Estephany Marie Guerra",
    specialty: "Pediatrics",
    specialization: "Pediatrics",
    initials: initials("Dr. Estephany Guerra"),
    color: color("Pediatrics"),
    schedules: [{ days: "Mon / Wed / Fri", hours: "11AM – 1PM" }],
   
  },
  {
    id: "milagros-capacio",
    name: "Dr. Milagros Rafol Capacio",
    specialty: "Pediatrics",
    specialization: "Pediatrics",
    initials: "MC",
    color: color("Pediatrics"),
    schedules: [{ days: "Tue / Sat", hours: "10AM – 12NN" }],
    
  },
  {
    id: "aileen-ledesma",
    name: "Dr. Aileen Anies-Ledesma",
    specialty: "Pediatrics",
    specialization: "Pediatrics",
    initials: "AL",
    color: color("Pediatrics"),
    schedules: [{ days: "Fri / Sat", hours: "3PM – 5PM" }],

  },
  {
    id: "ronnelaine-arpilleda",
    name: "Dr. Ronnelaine Cortez-Arpilleda",
    specialty: "Pediatrics",
    specialization: "Pediatrics",
    initials: "RA",
    color: color("Pediatrics"),
    schedules: [
      { days: "Sunday", hours: "3PM – 5PM" },
      { days: "Tuesday", hours: "2PM – 5PM" },
    ],
    
  },
  {
    id: "joanna-legaspi",
    name: "Dr. Joanna Kristine Rue-Legaspi",
    specialty: "Pediatrics",
    specialization: "Pediatrics",
    initials: "JL",
    color: color("Pediatrics"),
    schedules: [{ days: "Thursday", hours: "2PM – 5PM" }],
   
  },
  {
    id: "michelle-martinez",
    name: "Dr. Michelle Angela Martinez",
    specialty: "Pediatrics",
    specialization: "Pediatrics",
    initials: "MM",
    color: color("Pediatrics"),
    schedules: [{ days: "Mon / Wed", hours: "3PM – 5PM" }],
  },
  {
    id: "vellanie-sandoval",
    name: "Dr. Vellanie Sandoval",
    specialty: "Pediatrics",
    specialization: "Pediatrics",
    initials: initials("Dr. Vellanie Sandoval"),
    color: color("Pediatrics"),
    schedules: [
      { days: "Sunday", hours: "10AM – 1PM" },
      { days: "Thursday", hours: "10AM – 12NN" },
    ],
  },

  // Internal Medicine — Infectious Disease
  {
    id: "danice-alombro",
    name: "Dr. Danice Faith Alombro",
    specialty: "Internal Medicine",
    specialization: "IM – Infectious Disease",
    initials: initials("Dr. Danice Alombro"),
    color: color("Internal Medicine"),
    schedules: [{ days: "Saturday", hours: "2PM – 4PM" }],
  },

  // Internal Medicine — Geriatrics
  {
    id: "charles-onda",
    name: "Dr. Charles Onda",
    specialty: "Internal Medicine",
    specialization: "IM – Geriatrics",
    initials: initials("Dr. Charles Onda"),
    color: color("Internal Medicine"),
    schedules: [
      { days: "Monday", hours: "8AM – 10AM" },
      { days: "Thursday", hours: "2PM – 4PM" },
      { days: "Saturday", hours: "10AM – 12NN" },
    ],
  },

  // Internal Medicine — Pulmonology
  {
    id: "cristan-alto",
    name: "Dr. Cristan Barrera Alto",
    specialty: "Internal Medicine",
    specialization: "IM – Pulmonology",
    initials: "CA",
    color: color("Internal Medicine"),
    schedules: [{ days: "Mon / Wed / Fri", hours: "10AM – 12NN" }],
  },
  {
    id: "jesus-ambat",
    name: "Dr. Jesus Ambat",
    specialty: "Internal Medicine",
    specialization: "IM – Pulmonology",
    initials: initials("Dr. Jesus Ambat"),
    color: color("Internal Medicine"),
    schedules: [{ days: "Tue / Thu / Sat", hours: "10AM – 1PM" }],
  },

  // Internal Medicine — Cardiology
  {
    id: "mon-aguilar",
    name: "Dr. Mon Kenneth Aguilar",
    specialty: "Internal Medicine",
    specialization: "IM – Cardiology",
    initials: "MA",
    color: color("Internal Medicine"),
    schedules: [{ days: "Mon / Tue", hours: "3PM – 5PM" }],
  },
  {
    id: "kevin-esguerra",
    name: "Dr. Kevin Esguerra",
    specialty: "Internal Medicine",
    specialization: "IM – Cardiology",
    initials: initials("Dr. Kevin Esguerra"),
    color: color("Internal Medicine"),
    schedules: [{ days: "Mon / Sat", hours: "2PM – 4PM" }],
  },

  // OM / IM — Diabetology
  {
    id: "leah-legaspi",
    name: "Dr. Leah Anne Legaspi",
    specialty: "Internal Medicine",
    specialization: "OM – Diabetology / IM – Gastroenterology",
    initials: "LL",
    color: color("Internal Medicine"),
    schedules: [
      { days: "Friday", hours: "1PM – 3PM" },
      { days: "Wed / Fri", hours: "1PM – 3PM (Gastro)" },
    ],
  },
  {
    id: "maryjane-leones",
    name: "Dr. Mary Jane Balidio-Leones",
    specialty: "Internal Medicine",
    specialization: "OM – Diabetology",
    initials: "ML",
    color: color("Internal Medicine"),
    schedules: [
      { days: "Monday", hours: "2PM – 4PM" },
      { days: "Wednesday", hours: "9AM – 11AM" },
      { days: "Friday", hours: "9AM – 12NN" },
    ],
  },
  {
    id: "carl-amante",
    name: "Dr. Carl Angelo Amante",
    specialty: "Internal Medicine",
    specialization: "IM – Diabetology",
    initials: "CA",
    color: color("Internal Medicine"),
    schedules: [
      { days: "Monday", hours: "10AM – 12NN" },
      { days: "Tuesday", hours: "1PM – 3PM" },
    ],
  },

  // Internal Medicine — General
  {
    id: "sheila-quinto",
    name: "Dr. Sheila Quinto",
    specialty: "Internal Medicine",
    specialization: "Internal Medicine",
    initials: initials("Dr. Sheila Quinto"),
    color: color("Internal Medicine"),
    schedules: [{ days: "Sunday", hours: "1PM – 3PM" }],
  },
  {
    id: "vasha-gutierrez",
    name: "Dr. Vasha Gianina Delica-Gutierrez",
    specialty: "Internal Medicine",
    specialization: "Internal Medicine",
    initials: "VG",
    color: color("Internal Medicine"),
    schedules: [{ days: "Tuesday", hours: "9AM – 12NN" }],
  },

  // ENT
  {
    id: "rhett-crisostomo",
    name: "Dr. Rhett Crisostomo",
    specialty: "ENT",
    specialization: "ENT",
    initials: initials("Dr. Rhett Crisostomo"),
    color: color("ENT"),
    schedules: [{ days: "Tuesday", hours: "3PM – 5PM" }],
  },
  {
    id: "carolynne-unay",
    name: "Dr. Carolynne Unay",
    specialty: "ENT",
    specialization: "ENT",
    initials: initials("Dr. Carolynne Unay"),
    color: color("ENT"),
    schedules: [{ days: "Mon / Wed", hours: "12NN – 2PM" }],
  },
  {
    id: "karen-bathan",
    name: "Dr. Karen Del Rosario Bathan",
    specialty: "ENT",
    specialization: "ENT",
    initials: "KB",
    color: color("ENT"),
    schedules: [
      { days: "Wed / Fri", hours: "3PM – 5PM" },
      { days: "Thursday", hours: "10AM – 12NN" },
    ],
  },
  {
    id: "wendell-lim",
    name: "Dr. Wendell Lim",
    specialty: "ENT",
    specialization: "ENT",
    initials: initials("Dr. Wendell Lim"),
    color: color("ENT"),
    schedules: [
      { days: "Tuesday", hours: "10AM – 12NN" },
      { days: "Thursday", hours: "2PM – 4PM" },
    ],
  },
  {
    id: "michiko-hosojima",
    name: "Dr. Michiko Sucaldito Hosojima",
    specialty: "ENT",
    specialization: "ENT",
    initials: "MH",
    color: color("ENT"),
    schedules: [{ days: "Saturday", hours: "10AM – 12NN" }],
  },

  // Surgery — Orthopedic
  {
    id: "francis-dichoso",
    name: "Dr. Francis Warren Dichoso",
    specialty: "Surgery",
    specialization: "Orthopedic Surgeon",
    initials: "FD",
    color: color("Surgery"),
    schedules: [{ days: "Monday", hours: "2PM – 4PM" }],
  },

  // Surgery — General
  {
    id: "ray-umali",
    name: "Dr. Ray Joselito Umali",
    specialty: "Surgery",
    specialization: "Surgeon",
    initials: "RU",
    color: color("Surgery"),
    schedules: [{ days: "Mon / Thu", hours: "2PM – 4PM" }],
  },
  {
    id: "aylmer-espano",
    name: "Dr. Aylmer Españo",
    specialty: "Surgery",
    specialization: "Surgeon",
    initials: initials("Dr. Aylmer Espano"),
    color: color("Surgery"),
    schedules: [{ days: "Saturday", hours: "10AM – 12NN" }],
  },
  {
    id: "julie-calusim",
    name: "Dr. Julie Anne Calusim",
    specialty: "Surgery",
    specialization: "Surgeon",
    initials: "JC",
    color: color("Surgery"),
    schedules: [{ days: "Friday", hours: "10AM – 12NN" }],
  },

  // Dental
  {
    id: "rodelio-aldueza",
    name: "Dr. Rodelio Aldueza",
    specialty: "Dental",
    specialization: "Dental",
    initials: initials("Dr. Rodelio Aldueza"),
    color: color("Dental"),
    schedules: [{ days: "Mon / Wed / Sat", hours: "1PM – 4PM (By Appointment)" }],
  },
  {
    id: "bettina-limson",
    name: "Dr. Bettina Limson",
    specialty: "Dental",
    specialization: "Dental",
    initials: initials("Dr. Bettina Limson"),
    color: color("Dental"),
    schedules: [{ days: "Mon / Wed / Sat", hours: "1PM – 4PM (By Appointment)" }],
  },

  // Ophthalmology
  {
    id: "perfecto-cagampang",
    name: "Dr. Perfecto Roy Cagampang III",
    specialty: "Ophthalmology",
    specialization: "Ophthalmology",
    initials: "PC",
    color: color("Ophthalmology"),
    schedules: [
      { days: "Friday", hours: "3PM – 5PM" },
      { days: "Monday", hours: "10AM – 12NN" },
    ],
  },

  // OB-GYN
  {
    id: "jean-bonto",
    name: "Dr. Jean Bonto",
    specialty: "OB-GYN",
    specialization: "OB-GYN",
    initials: initials("Dr. Jean Bonto"),
    color: color("OB-GYN"),
    schedules: [{ days: "Sunday", hours: "1PM – 3PM" }],
  },
  {
    id: "genevieve-villela",
    name: "Dr. Genevieve Rillorta-Villela",
    specialty: "OB-GYN",
    specialization: "OB-GYN",
    initials: "GV",
    color: color("OB-GYN"),
    schedules: [
      { days: "Monday", hours: "2PM – 5PM" },
      { days: "Friday", hours: "3PM – 5PM" },
    ],
  },
  {
    id: "grace-palasi",
    name: "Dr. Grace Palasi",
    specialty: "OB-GYN",
    specialization: "OB-GYN",
    initials: initials("Dr. Grace Palasi"),
    color: color("OB-GYN"),
    schedules: [
      { days: "Monday", hours: "10AM – 1PM" },
      { days: "Tue / Wed", hours: "10AM – 1:30PM" },
      { days: "Thursday", hours: "3PM – 5:30PM" },
      { days: "Saturday", hours: "2PM – 5:30PM" },
    ],
  },
  {
    id: "mitzi-delapaz",
    name: "Dr. Mitzi Rose Ramirez-Delapaz",
    specialty: "OB-GYN",
    specialization: "OB-GYN",
    initials: "MD",
    color: color("OB-GYN"),
    schedules: [{ days: "Sunday", hours: "10AM – 12NN" }],
  },
  {
    id: "nazarena-mata",
    name: "Dr. Nazarena Mata",
    specialty: "OB-GYN",
    specialization: "OB-GYN",
    initials: initials("Dr. Nazarena Mata"),
    color: color("OB-GYN"),
    schedules: [{ days: "Thu / Sat", hours: "9AM – 12NN" }],
  },
  {
    id: "annie-cortez",
    name: "Dr. Annie Grace Baldove-Cortez",
    specialty: "OB-GYN",
    specialization: "OB-GYN",
    initials: "AC",
    color: color("OB-GYN"),
    schedules: [{ days: "Wednesday", hours: "2PM – 5PM" }],
   
  },
  {
    id: "trinidad-purugganan",
    name: "Dr. Trinidad Geraldine Purugganan",
    specialty: "OB-GYN",
    specialization: "OB-GYN & Addiction Medicine",
    initials: "TP",
    color: color("OB-GYN"),
    schedules: [{ days: "Tuesday", hours: "2PM – 4PM" }],
  },

  // In-House
  {
    id: "hansel-ybanez",
    name: "Dr. Hansel John Ybañez",
    specialty: "In-House",
    specialization: "In-House Doctor",
    initials: "HY",
    color: color("In-House"),
    schedules: [{ days: "Mon / Tue / Thu", hours: "9AM – 12NN" }],
  },
  {
    id: "junimyn-miralles",
    name: "Dr. Junimyn Grace Miralles",
    specialty: "In-House",
    specialization: "In-House Doctor",
    initials: "JM",
    color: color("In-House"),
    schedules: [{ days: "Wed / Sat", hours: "10AM – 5PM" }],
  },
  {
    id: "reliever-inhouse",
    name: "Reliever In-House Physician",
    specialty: "In-House",
    specialization: "In-House Doctor",
    initials: "RX",
    color: color("In-House"),
    schedules: [{ days: "Fri / Sun", hours: "10AM – 5PM" }],
  },
];

// ─── Why Our Doctors ──────────────────────────────────────────────────────────
export const whyDoctorsData = {
  pill: "Our Standards",
  heading: { plain: "How We Select ", gradient: "Our Team" },
  desc: "Every Wellcare physician goes through a rigorous credentialing process before seeing their first patient.",
  steps: [
    {
      title: "Board Certification",
      desc: "All doctors hold active board certification from the Philippine Medical Association or an equivalent international body.",
    },
    {

      title: "Background Verified",
      desc: "We verify credentials, training history, and professional standing before extending an invitation to join.",
    },
    {
      title: "Patient-Centred Interview",
      desc: "Candidates are assessed for communication skills and empathy — not just clinical excellence.",
    },
    {
      title: "Continuous Development",
      desc: "All Wellcare doctors complete annual CPD requirements and participate in our in-house quality programme.",
    },
  ],
};

// ─── CTA ──────────────────────────────────────────────────────────────────────
export const doctorsCtaData = {
  pill: "Book Today",
  heading: { line1: "Find Your Doctor,", line2: "Book in Minutes." },
  desc: "Same-day and next-day appointments available. In-clinic or via telemedicine — your choice.",
  ctas: {
    primary:   { label: "Book an Appointment", href: "/book" },
    secondary: { label: "Try Telemedicine",     href: "/book?service=telemedicine" },
  },
};