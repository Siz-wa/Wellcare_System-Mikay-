// resources/js/pages/user/contact/contactData.ts
// All static content for the Contact page.

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const contactHeroData = {
  pill: "Get in Touch",
  heading: { plain: "We're Here", gradient: "Whenever You Need Us." },
  body: "Whether you have a question about our services, need to book an appointment, or want to reach a specific department — our team is ready to help.",
};

// ─── Location ─────────────────────────────────────────────────────────────────
export const locationData = {
  address: "Gov. D. Mangubat Ave., Burol Main, Dasmariñas City, Cavite",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3868.0!2d120.9369!3d14.3294!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zWellcare+Clinics!5e0!3m2!1sen!2sph!4v1",
};

// ─── Contact channels ─────────────────────────────────────────────────────────
export interface ContactChannel {
  id: string;
  icon: "phone" | "email" | "location" | "chat";
  label: string;
  department: string;
  lines: { text: string; href: string }[];
}

export const contactChannels: ContactChannel[] = [
  {
    id: "admin",
    icon: "phone",
    label: "Customer Service — Admin",
    department: "Administrative Inquiries",
    lines: [
      { text: "(046) 416 7068", href: "tel:+63464167068" },
      { text: "09478920419",    href: "tel:+639478920419" },
    ],
  },
  {
    id: "admin-email",
    icon: "email",
    label: "Email — Admin",
    department: "Administrative Inquiries",
    lines: [
      { text: "csrpat.wellcareclinics@gmail.com", href: "mailto:csrpat.wellcareclinics@gmail.com" },
    ],
  },
  {
    id: "waltermart",
    icon: "chat",
    label: "CSR — WalterMart Dasma",
    department: "Customer Service — Clinics",
    lines: [
      { text: "0920 918 6645", href: "tel:+639209186645" },
    ],
  },
  {
    id: "location",
    icon: "location",
    label: "Clinic Address",
    department: "Visit Us",
    lines: [
      { text: "Gov. D. Mangubat Ave., Burol Main,\nDasmariñas City, Cavite", href: "https://maps.google.com/?q=Wellcare+Clinics+Dasmarinas+Cavite" },
    ],
  },
];

// ─── Hours ────────────────────────────────────────────────────────────────────
export const hoursData = {
  pill: "Clinic Hours",
  heading: { plain: "When You Can ", gradient: "Reach Us" },
  schedule: [
    { day: "Monday",    hours: "8:00 AM – 5:00 PM" },
    { day: "Tuesday",   hours: "8:00 AM – 5:00 PM" },
    { day: "Wednesday", hours: "8:00 AM – 5:00 PM" },
    { day: "Thursday",  hours: "8:00 AM – 5:00 PM" },
    { day: "Friday",    hours: "8:00 AM – 5:00 PM" },
    { day: "Saturday",  hours: "8:00 AM – 5:00 PM" },
    { day: "Sunday",    hours: "10:00 AM – 5:00 PM" },
  ],
  note: "Individual doctor schedules may vary. Please call ahead to confirm specialist availability.",
};

// ─── Contact form ─────────────────────────────────────────────────────────────
export const contactFormData = {
  pill: "Send a Message",
  heading: { plain: "Have a ", gradient: "Question?" },
  desc: "Fill out the form below and our team will get back to you within 24 hours.",
  subjects: [
    "General Inquiry",
    "Book an Appointment",
    "Laboratory Results",
    "Billing & Payments",
    "Corporate / Partnership",
    "Feedback or Complaint",
    "Other",
  ],
  submitLabel: "Send Message",
};
