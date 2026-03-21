// resources/js/pages/user/services/servicesData.ts
// All static content for the Services page.
// Swap text here without touching any component files.

import type { ReactElement } from "react";

export type IconColor =
  | "primary" | "sky" | "success" | "warning"
  | "error"   | "purple" | "cyan"  | "emerald";

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const servicesHeroData = {
  pill: "What We Offer",
  heading: { plain: "Complete Care,", gradient: "One Destination." },
  body: "From routine check-ups to complex specialist consultations — every service at Wellcare is backed by ISO-certified standards, experienced clinicians, and genuine compassion.",
  ctas: {
    primary:   { label: "Book an Appointment", href: "/book" },
    secondary: { label: "View Health Packages", href: "#packages" },
  },
  image: {
    src: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=900&q=85&auto=format&fit=crop",
    alt: "Wellcare laboratory and clinical services",
  },
};

// ─── Service categories ───────────────────────────────────────────────────────
export interface ServiceItem {
  id: string;
  iconKey: string;
  color: IconColor;
  title: string;
  tagline: string;
  desc: string;
  features: string[];
  href: string;
}

export const servicesData: ServiceItem[] = [
  {
    id: "imaging",
    iconKey: "activity",
    color: "primary",
    title: "Diagnostic Imaging",
    tagline: "See clearly, act faster.",
    desc: "Advanced MRI, CT scan, X-ray, and ultrasound services read by board-certified radiologists with same-day or next-day results.",
    features: ["MRI & CT Scan", "Digital X-Ray", "Ultrasound", "Bone Densitometry"],
    href: "/book?service=imaging",
  },
  {
    id: "laboratory",
    iconKey: "flask",
    color: "sky",
    title: "Laboratory Services",
    tagline: "ISO-certified. Results you trust.",
    desc: "Comprehensive blood work, urinalysis, microbiology, and specialized panels processed in our fully accredited on-site laboratory.",
    features: ["Complete Blood Count", "Lipid Panel", "Thyroid Function", "Culture & Sensitivity"],
    href: "/book?service=laboratory",
  },
  {
    id: "consultations",
    iconKey: "users",
    color: "success",
    title: "Specialist Consultations",
    tagline: "50+ specialists, one roof.",
    desc: "Access board-certified specialists across cardiology, neurology, oncology, pulmonology, and more — all in-clinic or via telemedicine.",
    features: ["Cardiology", "Neurology", "Oncology", "Pulmonology"],
    href: "/book?service=consultation",
  },
  {
    id: "preventive",
    iconKey: "shield",
    color: "purple",
    title: "Preventive Care",
    tagline: "Catch it before it starts.",
    desc: "Proactive health screening, vaccination programmes, and lifestyle medicine consultations designed to keep you ahead of illness.",
    features: ["Annual Physical Exam", "Vaccination", "Cancer Screening", "Lifestyle Counselling"],
    href: "/book?service=preventive",
  },
  {
    id: "emergency",
    iconKey: "clock",
    color: "error",
    title: "24 / 7 Emergency Diagnostics",
    tagline: "Always ready. Always here.",
    desc: "Round-the-clock emergency diagnostic support with on-call specialists and rapid result turnaround when it matters most.",
    features: ["24-Hour Lab", "Emergency Imaging", "On-Call Specialists", "Rapid Turnaround"],
    href: "/book?service=emergency",
  },
  {
    id: "telemedicine",
    iconKey: "monitor",
    color: "cyan",
    title: "Telemedicine",
    tagline: "Your doctor, anywhere.",
    desc: "Secure video consultations with Wellcare specialists from the comfort of home — prescriptions and referrals included.",
    features: ["Video Consultations", "e-Prescriptions", "Lab Order Upload", "Follow-Up Scheduling"],
    href: "/book?service=telemedicine",
  },
];

// ─── Packages ─────────────────────────────────────────────────────────────────
export interface PackageItem {
  id: string;
  badge: string;
  badgeColor: "primary" | "success" | "warning" | "sky";
  title: string;
  price: string;
  priceNote: string;
  desc: string;
  includes: string[];
  href: string;
  featured?: boolean;
}

export const packagesSectionMeta = {
  pill: "Health Packages",
  heading: { plain: "Find the Right ", gradient: "Package for You" },
  desc: "Bundled check-ups designed for every life stage and budget — with no hidden fees.",
};

// ─── Process ──────────────────────────────────────────────────────────────────
export const processData = {
  pill: "How It Works",
  heading: { plain: "Your Care Journey, ", gradient: "Simplified" },
  steps: [
    {
      number: "01",
      title: "Book Online or by Phone",
      desc: "Schedule your appointment in minutes via our portal or by calling +63 (2) 8888-9355. Same-day slots are often available.",
    },
    {
      number: "02",
      title: "Arrive & Check In",
      desc: "Our front desk team will welcome you, verify your details, and guide you to the right department — no queuing confusion.",
    },
    {
      number: "03",
      title: "Receive Your Care",
      desc: "Your tests, scans, or consultation are carried out by experienced clinicians using the latest equipment.",
    },
    {
      number: "04",
      title: "Get Your Results",
      desc: "Most lab results are available within 24 hours — viewable online via your patient portal or collected in-clinic.",
    },
  ],
};


