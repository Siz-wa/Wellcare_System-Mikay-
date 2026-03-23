// resources/js/pages/user/about/aboutData.ts
// All static content for the About Us page.
// Updated with verified Wellcare Clinics & Lab. Inc. history.

import { images } from "@/hooks/images";

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const aboutHeroData = {
  pill: "Our Story",
  heading: { plain: "Caring for Your Health and Wellness", gradient: "Since 1996." },
  body: "Wellcare Clinics & Lab. Inc. was pioneered by a group of De La Salle Medical School alumni with a vision to bring quality healthcare closer to the community. As a pioneer of mall-based clinics in Calabarzon, we have spent over 30 years delivering expert diagnostic care with a heart.",
  image: {
    src: images.aboutClinic,
    alt: "Wellcare clinic interior",
  },
  stats: [
    { value: "1996", label: "Year Founded" },
    { value: "30",   label: "Years of Service" },
    { value: "7",    label: "Clinic Branches" },
    { value: "250k+",label: "Patients Served" },
  ],
};

// ─── Mission & Vision ─────────────────────────────────────────────────────────
export const missionData = {
  pill: "Purpose & Direction",
  mission: {
    icon: "🎯",
    label: "Our Mission",
    heading: "Accessible Care for Every Filipino",
    body: "To deliver accurate, timely, and affordable diagnostic and clinical services that empower patients and physicians to make confident health decisions — regardless of background or circumstance.",
  },
  vision: {
    icon: "🔭",
    label: "Our Vision",
    heading: "The Most Trusted Health Partner in the Philippines",
    body: "A future where no Filipino is left without the information they need to protect their health. We aspire to be the institution families turn to first, and trust completely.",
  },
  values: [
    { emoji: "💙", title: "Compassion",   desc: "We treat every patient as family — with patience, empathy, and respect." },
    { emoji: "🔬", title: "Precision",    desc: "Rigorous quality control so every result you receive is one you can rely on." },
    { emoji: "🤝", title: "Integrity",    desc: "Transparent pricing, honest communication, and no unnecessary procedures." },
    { emoji: "⚡", title: "Timeliness",   desc: "We respect your time. Most results are available within 24 hours." },
    { emoji: "🌱", title: "Innovation",   desc: "Continuously investing in the latest diagnostic technology and clinical training." },
    { emoji: "🏘️", title: "Community",   desc: "Deeply rooted in Cavite and Laguna — giving back through outreach and the PhilHealth YAKAP program." },
  ],
};

// ─── Timeline / History ───────────────────────────────────────────────────────
export const timelineData = {
  pill: "Our Journey",
  heading: { plain: "Milestones That ", gradient: "Shaped Us" },
  items: [
    {
      year: "1996",
      title: "Founding & Mall-Based Pioneer",
      desc: "Founded by DLSMSI alumni, Wellcare opens the first mall-based clinic in Calabarzon, revolutionizing healthcare accessibility.",
    },
    {
      year: "2022",
      title: "Branch Modernization",
      desc: "Major renovations and service upgrades completed for our Burol Main and Unitop branches in Dasmariñas.",
    },
    {
      year: "2023",
      title: "Expanding Footprint",
      desc: "Successfully launched operations in General Trias (Manggahan) to serve the growing residential and industrial sectors.",
    },
    {
      year: "2025",
      title: "PhilHealth YAKAP Accreditation",
      desc: "Officially accredited as a PhilHealth YAKAP provider, allowing us to offer comprehensive outpatient benefits to the public.",
    },
    {
      year: "2025",
      title: "The 7th Branch",
      desc: "Expanded to our 7th location at Verdant Square, Carmona, Cavite, furthering our reach in the South.",
    },
    {
      year: "2026",
      title: "Heart Health Advocacy",
      desc: "Launched region-wide cardiovascular screening initiatives, reaching a new milestone in community preventive care.",
    },
  ],
};

// ─── Team ─────────────────────────────────────────────────────────────────────
export const teamData = {
  pill: "Leadership",
  heading: { plain: "The People Behind ", gradient: "Wellcare" },
  desc: "Our leadership team brings together decades of clinical, operational, and community experience.",
  members: [
    {
      name: "Dr. Elena Reyes",
      role: "Founder & Chief Medical Officer",
      initials: "ER",
      color: "#0056b3",
      bio: "Internist and public health advocate with 25 years of experience. Part of the original DLSMSI alumni group that founded Wellcare.",
    },
    {
      name: "Marco Santos",
      role: "Chief Executive Officer",
      initials: "MS",
      color: "#00a8e8",
      bio: "Healthcare administrator who led the transition of Wellcare from a single mall-based clinic to a 7-branch regional network.",
    },
    {
      name: "Dr. Patricia Lim",
      role: "Head of Laboratory Services",
      initials: "PL",
      color: "#16a34a",
      bio: "Clinical pathologist overseeing quality control and DOH compliance across all laboratory and diagnostic units.",
    },
    {
      name: "Dr. Ramon Cruz",
      role: "Head of Specialist Services",
      initials: "RC",
      color: "#7c3aed",
      bio: "Cardiologist managing our network of board-certified specialists to ensure top-tier consultation standards.",
    },
  ],
};

// ─── Accreditations ───────────────────────────────────────────────────────────
export const accreditationsData = {
  pill: "Trust & Standards",
  heading: { plain: "Recognised by the ", gradient: "Industry's Best" },
  desc: "Our certifications and partnerships reflect our unwavering commitment to safety, quality, and ethical practice.",
  items: [
    { icon: "🇵🇭", title: "PhilHealth Accredited", desc: "Accredited provider for PhilHealth YAKAP and standard reimbursement programs." },
    { icon: "🏥", title: "DOH Licensed",       desc: "Fully licensed by the Department of Health for clinical and laboratory operations." },
    { icon: "🧪", title: "Drug Test Accredited", desc: "DOH-accredited facility for mandatory and voluntary drug testing services." },
    { icon: "⚕️", title: "PMA Member",          desc: "Affiliated with the Philippine Medical Association and local medical societies." },
  ],
};