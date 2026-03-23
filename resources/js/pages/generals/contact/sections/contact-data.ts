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
  address: "2nd floor, Waltermart Aguinaldo Highway, Dasmariñas City, Cavite",
  mapEmbedUrl:
    "https://www.google.com/maps/place/Wellcare+Clinics+%26+Lab.,+Inc+-+Waltermart+Dasmari%C3%B1as/data=!4m7!3m6!1s0x3397d50074a5781b:0x79b0315628df33eb!8m2!3d14.32551!4d120.9415407!16s%2Fg%2F11bx2l0_8s!19sChIJG3ildADVlzMR6zPfKFYxsHk?authuser=0&hl=en&rclk=1",
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
      { text: "(046) 450-5116 / 424-9312", href: "tel:+63464505116" },
      { text: " 0917-185-6604 / 0998-982-2384",    href: "tel:+639478920419" },
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
    id: "location",
    icon: "location",
    label: "Clinic Address",
    department: "Visit Us",
    lines: [
      { text: "Waltermart Aguinaldo Highway, Dasmariñas City, Cavite", href: "https://www.google.com/maps/place/Wellcare+Clinics+%26+Lab.,+Inc+-+Waltermart+Dasmari%C3%B1as/data=!4m7!3m6!1s0x3397d50074a5781b:0x79b0315628df33eb!8m2!3d14.32551!4d120.9415407!16s%2Fg%2F11bx2l0_8s!19sChIJG3ildADVlzMR6zPfKFYxsHk?authuser=0&hl=en&rclk=1" },
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
