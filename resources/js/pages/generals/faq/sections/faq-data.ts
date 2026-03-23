// resources/js/pages/generals/faqs/faqsData.ts
// All static content for the FAQs page.

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const faqsHeroData = {
  pill: "Help Center",
  heading: { plain: "Frequently Asked", gradient: "Questions." },
  body: "Find quick answers to the most common questions about our services, appointments, laboratory results, and more.",
};

// ─── FAQ category type ────────────────────────────────────────────────────────
export interface FaqItem {
  q: string;
  a: string;
}

export type FaqIconKey =
  | "calendar"
  | "flask"
  | "package"
  | "creditCard"
  | "stethoscope"
  | "info";

export interface FaqCategory {
  id: string;
  label: string;
  iconKey: FaqIconKey;
  items: FaqItem[];
}

// ─── Categories & questions ───────────────────────────────────────────────────
export const faqCategories: FaqCategory[] = [
  {
    id: "appointments",
    label: "Appointments",
    iconKey: "calendar",
    items: [
      {
        q: "How do I book an appointment?",
        a: "You can book online through our website, call our admin line at Tel# (046) 450-5116/424-9312, 0917-185-6604/0998-982-2384, or visit us directly at our clinic in 2nd floor, Waltermart Aguinaldo Highway, Dasmariñas City, Cavite. Same-day slots are often available for laboratory services.",
      },
      {
        q: "Can I walk in without an appointment?",
        a: "Walk-ins are welcome for laboratory services and most basic diagnostic tests. Specialist consultations are by appointment only to minimise waiting time and ensure your doctor is prepared for your visit.",
      },
      {
        q: "How do I reschedule or cancel an appointment?",
        a: "Call our admin line at (046) 450-5116/424-9312 or 0917-185-6604/0998-982-2384 at least 24 hours before your scheduled appointment. Cancellations made within 24 hours may forfeit any pre-paid booking fees.",
      },
      {
        q: "Are same-day appointments available?",
        a: "Yes — same-day slots are frequently available for laboratory services and some specialist consultations depending on doctor availability. Call us early in the day for the best chance of a same-day slot.",
      },
      {
        q: "Can I book a telemedicine consultation?",
        a: "Yes. Telemedicine consultations are available for most specialties. Book online or call us, and we will send you a secure video link before your scheduled time.",
      },
    ],
  },
  {
    id: "laboratory",
    label: "Laboratory & Results",
    iconKey: "flask",
    items: [
      {
        q: "How long does it take to get my laboratory results?",
        a: "Most routine results — complete blood count, urinalysis, lipid panel — are available within 24 hours. Specialised tests such as cultures or histopathology may take 3–7 days. You will receive an SMS notification when your results are ready.",
      },
      {
        q: "How do I get my lab results?",
        a: "Results can be collected in-clinic at the release window or viewed through our patient portal online. We also offer courier delivery for an additional fee. Results are only released to the patient or an authorised representative.",
      },
      {
        q: "Do I need to fast before a blood test?",
        a: "Some tests require fasting — most commonly fasting blood sugar, lipid panels, and certain liver function tests. Please fast for 8–12 hours before these tests. Your doctor's request form will indicate if fasting is required.",
      },
      {
        q: "Can my doctor request my results directly?",
        a: "Yes. With your written consent, we can send results directly to your referring physician. Please provide your doctor's name and contact details when submitting your request form.",
      },
      {
        q: "Is your laboratory ISO certified?",
        a: "Yes. Our laboratory holds ISO 15189 accreditation — the international standard for medical laboratory quality and competence. This ensures every result meets the highest accuracy and reliability standards.",
      },
    ],
  },
  {
    id: "services",
    label: "Services & Packages",
    iconKey: "package",
    items: [
      {
        q: "What services does Wellcare Clinics offer?",
        a: "We offer diagnostic imaging (MRI, CT, X-ray, ultrasound), comprehensive laboratory services, specialist consultations across 15+ disciplines, health packages, preventive care programmes, telemedicine, and 24/7 emergency diagnostics.",
      },
      {
        q: "What is included in the Executive Check-Up package?",
        a: "The Executive Check-Up includes a complete blood count, lipid panel, thyroid function, ECG, echocardiogram, abdominal ultrasound, chest X-ray, urinalysis, a specialist consultation, and dietary counselling — all for ₱4,999 per person.",
      },
      {
        q: "Do you offer corporate health programmes?",
        a: "Yes. We offer customisable corporate wellness packages for teams of 10 to 10,000 employees. These include annual physical exams, drug testing, vaccination programmes, and health risk assessments. Contact us at csrpat.wellcareclinics@gmail.com for a quote.",
      },
      {
        q: "Do you provide home service for laboratory tests?",
        a: "Home service collection is available for select laboratory tests in Dasmariñas City and nearby areas. Call our admin line to check availability and book a home collection schedule.",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing & Insurance",
    iconKey: "creditCard",
    items: [
      {
        q: "Is Wellcare PhilHealth accredited?",
        a: "Yes. Wellcare Clinics is fully PhilHealth-accredited. Please bring your PhilHealth ID and your Member Data Record (MDR) to avail of your PhilHealth benefits for eligible services.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We prioritize Cash and Self-Pay transactions. Even if you view your bill online, please be advised that we do not have an automated click-to-pay system. Payment must be settled manually via GCash, Maya, Bank Transfer, or Cards, just as you would at our physical counter.",
      },
      {
        q: "Can I use my HMO at Wellcare?",
        a: "We are accredited with several HMO providers. Please present your HMO card and a letter of authorisation (LOA) upon arrival. Contact your HMO in advance to confirm coverage for your specific procedure.",
      },
      {
        q: "Are there senior citizen or PWD discounts?",
        a: "Yes. Senior citizens and persons with disabilities are entitled to the mandatory 20% discount and VAT exemption on applicable services in accordance with Philippine law. Please present a valid Senior Citizen or PWD ID.",
      },
    ],
  },
  {
    id: "doctors",
    label: "Doctors & Specialists",
    iconKey: "stethoscope",
    items: [
      {
        q: "Do I need a referral to see a specialist?",
        a: "No referral is required. You can book directly with any of our specialists through the website or by calling us. However, some HMO providers may require a referral — check with your insurer first.",
      },
      {
        q: "How do I know which specialist to see?",
        a: "If you are unsure, our in-house general practitioners can assess your condition and refer you to the appropriate specialist. You may also call our admin team for guidance.",
      },
      {
        q: "Can I request a specific doctor?",
        a: "Yes. You can request a specific doctor when booking. Availability depends on their schedule. Check our Doctors page for each specialist's clinic days and hours.",
      },
      {
        q: "What if my doctor is not available on my preferred date?",
        a: "We will offer you the next available slot with your preferred doctor, or suggest an equally qualified alternative. You can also join a waitlist for cancellations.",
      },
    ],
  },
  {
    id: "general",
    label: "General",
    iconKey: "info",
    items: [
      {
        q: "Where is Wellcare Clinics located?",
        a: "Our main clinic is located at the 2nd Floor, WalterMart Aguinaldo Highway, Dasmariñas City, Cavite. you may reach us at (046) 450-5116 / 424-9312 or via mobile at 0917-185-6604 / 0998-982-2384.",
      },
      {
        q: "What are your clinic hours?",
        a: "Our clinic is open daily from Monday to Sunday, 7:00 AM to 6:00 PM. Individual doctor schedules vary — check the Doctors page for specific availability.",
      },
      {
        q: "Is there parking available?",
        a: "Yes, parking is available at our main clinic. The WalterMart Dasma branch also has ample parking within the mall premises.",
      },
      {
        q: "How do I file a complaint or give feedback?",
        a: "We take all feedback seriously. You can email us at csrpat.wellcareclinics@gmail.com or speak to our customer service team at the front desk. We aim to respond to all written feedback within 2 business days.",
      },
    ],
  },
];

// ─── Still have questions CTA ─────────────────────────────────────────────────
export const faqsCtaData = {
  pill: "Still Have Questions?",
  heading: { line1: "We're Happy to Help", line2: "Anytime." },
  desc: "Can't find the answer you're looking for? Reach out to our team directly.",
  ctas: {
    primary:   { label: "Contact Us",         href: "/contact" },
    secondary: { label: "Call (046) 416 7068", href: "tel:+63464167068" },
  },
};