// resources/js/pages/auth/register/registerData.tsx

// ─── Steps ────────────────────────────────────────────────────────────────────
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

export const onboardingSteps: OnboardingStep[] = [
  { id: 1, title: "Account Details",      description: "Set up your login credentials" },
  { id: 2, title: "Personal Information", description: "Tell us about yourself" },
  { id: 3, title: "Medical Profile",      description: "Help us serve you better" },
];

// ─── Select options ───────────────────────────────────────────────────────────
export const genderOptions = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
] as const;

export const civilStatusOptions = [
  { value: "single",  label: "Single" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
] as const;

export const paymentOptions = [
  { value: "cash",   label: "Cash" },
  { value: "pwd",    label: "PWD" },
  { value: "senior", label: "Senior" },
  { value: "mwc",    label: "MWC" },
  { value: "hmo",    label: "HMO" },
] as const;

export const classificationOptions = [
  { value: "new", label: "New Patient" },
  { value: "old", label: "Returning Patient" },
] as const;

// ─── Left panel ───────────────────────────────────────────────────────────────
export const registerBrandData = {
  pill: "New Account",
  heading: { line1: "Your Health,", line2: "Starts Here." },
  desc: "Create your Wellcare patient account to book appointments, track lab results, and manage your health — all in one place.",
  copyright: "© 2026 Wellcare Clinics & Laboratories, Inc.",
  benefits: [
    "Book appointments online, anytime",
    "View lab results instantly",
    "Manage your medical profile",
    "Access your full visit history",
  ],
};