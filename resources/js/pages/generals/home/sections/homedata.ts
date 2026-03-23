// resources/js/pages/generals/home/sections/homedata.ts
// All static content for the Wellcare homepage.

import { images } from "@/hooks/images";

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const heroData = {
  label: "Trusted Healthcare Partner",
  heading: {
    line1: "Your Health,",
    line2: "Our Priority.",
  },
  body: "Wellcare Clinics & Laboratories provides world-class diagnostic services and specialist consultations with a human touch. Experience healthcare that truly cares.",
  ctas: {
    primary:   { label: "Find a Doctor", href: "/doctors" },
    secondary: { label: "Our Services",  href: "/services" },
  },
  socialProof: {
    count: "50+ Specialists",
    sub:   "Available for consultation",
  },
  floats: {
    topLeft: {
      label:     "ACCREDITED",
      title:     "ISO Certified Lab",
      iconBg:    "#dcfce7",
      iconColor: "#16a34a",
    },
    bottomRight: {
      title:     "Quick Results",
      sub:       "Laboratory results delivered within 24 hours.",
      iconBg:    "var(--wc-blue-50)",
      iconColor: "var(--wc-blue-600)",
    },
  },
  image: {
    src: images.heroClinic,   // ← correct: images.<key>
    alt: "Wellcare Clinic facility",
  },
};

// ─── Stats ────────────────────────────────────────────────────────────────────
export const statsData = [
  { value: "15+",   label: "Years of Service"  },
  { value: "50+",   label: "Specialists"        },
  { value: "120k+", label: "Patients Served"    },
  { value: "98%",   label: "Satisfaction Rate"  },
];

// ─── Services ─────────────────────────────────────────────────────────────────
export type IconColor =
  | "primary" | "sky" | "success" | "warning" | "error"
  | "purple"  | "cyan" | "emerald";

export interface ServiceItem {
  iconKey: string;
  color:   IconColor;
  title:   string;
  desc:    string;
}

export const servicesData: ServiceItem[] = [
  { iconKey: "activity", color: "primary", title: "Diagnostic Imaging",      desc: "Advanced MRI, CT, and X-ray services with rapid turnaround and expert radiologist review." },
  { iconKey: "flask",    color: "sky",     title: "Laboratory Services",     desc: "ISO-certified lab offering comprehensive blood work, urinalysis, and specialized panels." },
  { iconKey: "users",    color: "success", title: "Specialist Consultations", desc: "Access 50+ board-certified specialists across cardiology, neurology, oncology, and more." },
  { iconKey: "package",  color: "warning", title: "Health Packages",         desc: "Curated wellness and executive check-up packages tailored for individuals and corporates." },
  { iconKey: "shield",   color: "purple",  title: "Preventive Care",         desc: "Proactive health monitoring, vaccination programs, and lifestyle medicine consultations." },
  { iconKey: "clock",    color: "cyan",    title: "24/7 Emergency",          desc: "Round-the-clock emergency diagnostic support with on-call specialist access." },
];

export const servicesSectionMeta = {
  pill:    "What We Offer",
  heading: { plain: "Comprehensive ", gradient: "Healthcare Services" },
  desc:    "From routine diagnostics to complex specialist consultations — all under one roof, backed by cutting-edge technology and compassionate care.",
};

// ─── Why Us ───────────────────────────────────────────────────────────────────
export const whyUsData = {
  pill:    "Why Choose Us",
  heading: { plain: "Healthcare You Can ", gradient: "Trust" },
  desc:    "We combine clinical excellence with genuine human care. Our team doesn't just treat conditions — we build relationships with every patient.",
  badge:   { number: "98%", label: "Patient satisfaction" },
  images: {
    main: {
      src: images.whyUsDoctor,   // ← correct
      alt: "Doctor consulting patient",
    },
    secondary: {
      src: images.whyUsLab,      // ← correct
      alt: "Laboratory equipment",
    },
  },
  items: [
    { emoji: "🏅", title: "ISO-Certified Labs",       desc: "Rigorous quality standards ensuring accurate, reliable diagnostic results every time." },
    { emoji: "⚡", title: "24-Hour Turnaround",        desc: "Most lab results ready within 24 hours so your care team can act fast." },
    { emoji: "🩺", title: "50+ Board-Certified Docs",  desc: "Access to specialists across every major medical discipline." },
    { emoji: "💙", title: "Patient-First Philosophy",  desc: "Every touchpoint is designed around your comfort, clarity, and confidence." },
  ],
};

// ─── Doctors ──────────────────────────────────────────────────────────────────
export const doctorsData = {
  pill:        "Our Team",
  heading:     { plain: "Meet Our ", gradient: "Specialists" },
  desc:        "Board-certified physicians dedicated to your health outcomes.",
  viewAllHref: "/doctors",
  bookHref:    "/appointments/create",
  doctors: [
    { name: "Dr. Maria Santos", specialty: "Cardiologist",  initials: "MS", color: "#0056b3" },
    { name: "Dr. Jose Reyes",   specialty: "Neurologist",   initials: "JR", color: "#00a8e8" },
    { name: "Dr. Ana Cruz",     specialty: "Oncologist",    initials: "AC", color: "#16a34a" },
    { name: "Dr. Carlos Lim",   specialty: "Pulmonologist", initials: "CL", color: "#7c3aed" },
  ],
};

// ─── Testimonials ─────────────────────────────────────────────────────────────
export const testimonialsData = {
  pill:    "Patient Stories",
  heading: { plain: "What Our ", gradient: "Patients Say" },
  items: [
    {
      quote:    "Wellcare's diagnostic team caught something my previous clinic missed for two years. Their thoroughness genuinely changed my life.",
      name:     "Patricia M.",
      role:     "Patient since 2019",
      initials: "PM",
    },
    {
      quote:    "The lab results were ready within hours and their specialist walked me through every number. I've never felt more informed about my own health.",
      name:     "Ramon T.",
      role:     "Executive Check-up",
      initials: "RT",
    },
    {
      quote:    "From booking to consultation, every step was seamless. The team genuinely cares — you feel it the moment you walk in.",
      name:     "Sophia L.",
      role:     "Annual Wellness Plan",
      initials: "SL",
    },
  ],
};