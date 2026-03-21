// resources/js/pages/user/about/aboutData.ts
// All static content for the About Us page.
// Swap text here without touching any component files.

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const aboutHeroData = {
  pill: "Our Story",
  heading: { plain: "Caring for Communities", gradient: "Since 2009." },
  body: "Wellcare Clinics & Laboratories was founded on a simple belief: every person deserves access to world-class diagnostic care delivered with genuine compassion. For over 15 years we have built that belief into every room, every result, and every relationship.",
  image: {
    src: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=85&auto=format&fit=crop",
    alt: "Wellcare clinic interior",
  },
  stats: [
    { value: "2009", label: "Year Founded" },
    { value: "15+",  label: "Years of Service" },
    { value: "3",    label: "Clinic Locations" },
    { value: "120k+",label: "Patients Served" },
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
    { emoji: "🏘️", title: "Community",   desc: "Deeply rooted in Metro Manila — giving back through free health screenings and outreach." },
  ],
};

// ─── Timeline / History ───────────────────────────────────────────────────────
export const timelineData = {
  pill: "Our Journey",
  heading: { plain: "Milestones That ", gradient: "Shaped Us" },
  items: [
    {
      year: "2009",
      title: "Founded in Quezon City",
      desc: "Wellcare opens its first clinic in Quezon City with a team of 12, offering basic laboratory and imaging services.",
    },
    {
      year: "2012",
      title: "ISO Certification Achieved",
      desc: "Our laboratory earns ISO 15189 accreditation — the gold standard for medical testing quality worldwide.",
    },
    {
      year: "2015",
      title: "Second Branch Opens",
      desc: "Expanded to Makati, bringing specialist consultations and advanced diagnostics to the business district.",
    },
    {
      year: "2018",
      title: "50+ Specialist Network",
      desc: "Reached a milestone of 50 board-certified specialists across 12 disciplines available on-site.",
    },
    {
      year: "2021",
      title: "Digital Health Portal Launched",
      desc: "Patients can now book appointments, view results, and consult virtually through the Wellcare patient portal.",
    },
    {
      year: "2024",
      title: "Third Location & 120k Patients",
      desc: "Opened our third branch in Pasig and surpassed 120,000 total patients served across all locations.",
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
      bio: "Internist and public health advocate with 25 years of experience. Founded Wellcare after recognising the diagnostic gap in Metro Manila.",
    },
    {
      name: "Marco Santos",
      role: "Chief Executive Officer",
      initials: "MS",
      color: "#00a8e8",
      bio: "Healthcare administrator and MBA graduate who scaled Wellcare from one clinic to a three-location network over 10 years.",
    },
    {
      name: "Dr. Patricia Lim",
      role: "Head of Laboratory Services",
      initials: "PL",
      color: "#16a34a",
      bio: "Clinical pathologist and ISO quality lead who built and maintains Wellcare's accredited laboratory programme.",
    },
    {
      name: "Dr. Ramon Cruz",
      role: "Head of Specialist Services",
      initials: "RC",
      color: "#7c3aed",
      bio: "Cardiologist and department head overseeing the recruitment and development of Wellcare's specialist network.",
    },
  ],
};

// ─── Accreditations ───────────────────────────────────────────────────────────
export const accreditationsData = {
  pill: "Trust & Standards",
  heading: { plain: "Recognised by the ", gradient: "Industry's Best" },
  desc: "Our certifications and partnerships reflect our unwavering commitment to safety, quality, and ethical practice.",
  items: [
    { icon: "🏅", title: "ISO 15189",         desc: "International accreditation for medical laboratory quality and competence." },
    { icon: "🇵🇭", title: "PhilHealth Accredited", desc: "Fully accredited for PhilHealth reimbursements across all services." },
    { icon: "🏥", title: "DOH Licensed",       desc: "Licensed by the Department of Health Philippines for clinical operations." },
    { icon: "🔬", title: "PASP Member",        desc: "Active member of the Philippine Association of Specialists in Pathology." },
  ],
};

