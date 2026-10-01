// resources/js/pages/user/services/servicesData.ts
// All static content for the Services page.
// Swap text here without touching any component files.

import { images } from '@/hooks/images';
import { book as appointmentsCreate } from '@/routes';

export type IconColor =
    | 'primary'
    | 'sky'
    | 'success'
    | 'warning'
    | 'error'
    | 'purple'
    | 'cyan'
    | 'emerald';

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const servicesHeroData = {
    pill: 'What We Offer',
    heading: { plain: 'Complete Care,', gradient: 'One Destination.' },
    body: 'From routine check-ups to complex specialist consultations — every service at Wellcare is backed by ISO-certified standards, experienced clinicians, and genuine compassion.',
    ctas: {
        primary: {
            label: 'Book an Appointment',
            href: appointmentsCreate.url(),
        },
        secondary: { label: 'View Health Packages', href: '#packages' },
    },
    image: {
        src: images.servicesLab,
        alt: 'Wellcare laboratory and clinical services',
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
    /**
     * Where the card's call to action goes.
     *
     * Every `?service=` here must be a slug in SERVICE_CATALOGUE, or the
     * wizard silently ignores it and the patient lands on a blank dropdown.
     * Four of these used to point at services that did not exist —
     * `consultation`, `preventive`, `emergency`, `telemedicine`.
     */
    href: string;
    /** CTA wording. Defaults to "Book this service". */
    cta?: string;
    /**
     * True when the destination is the booking wizard, which is gated to
     * signed-in patients. A card that points somewhere public (the contact
     * page) sets this false so its CTA is shown to everyone.
     */
    requiresBooking?: boolean;
}

export const servicesData: ServiceItem[] = [
    {
        id: 'imaging',
        iconKey: 'activity',
        color: 'primary',
        title: 'Diagnostic Imaging',
        tagline: 'See clearly, act faster.',
        desc: 'Advanced MRI, CT scan, X-ray, and ultrasound services read by board-certified radiologists with same-day or next-day results.',
        features: [
            'MRI & CT Scan',
            'Digital X-Ray',
            'Ultrasound',
            'Bone Densitometry',
        ],
        href: '/book?service=imaging',
    },
    {
        id: 'laboratory',
        iconKey: 'flask',
        color: 'sky',
        title: 'Laboratory Services',
        tagline: 'ISO-certified. Results you trust.',
        desc: 'Comprehensive blood work, urinalysis, microbiology, and specialized panels processed in our fully accredited on-site laboratory.',
        features: [
            'Complete Blood Count',
            'Lipid Panel',
            'Thyroid Function',
            'Culture & Sensitivity',
        ],
        href: '/book?service=laboratory',
    },
    {
        id: 'consultations',
        iconKey: 'users',
        color: 'success',
        title: 'Doctor Consultations',
        tagline: 'Seven specialties, one roof.',
        // Every name below is a specialty the clinic actually rosters doctors
        // under, and every one of them is a service in the booking dropdown.
        // This card used to advertise neurology, oncology and pulmonology --
        // no doctor on staff holds any of the three -- while omitting family
        // medicine, which is the largest clinic the branch runs.
        desc: 'See a family doctor for everyday care, or a board-certified specialist -- in the clinic or by video consultation.',
        features: [
            'Family Medicine',
            'Internal Medicine',
            'Pediatrics',
            'OB-Gyne',
            'Cardiology',
            'Dermatology',
            'Orthopedics',
        ],
        href: '/book',
    },
    {
        id: 'preventive',
        iconKey: 'shield',
        color: 'purple',
        title: 'Preventive Care',
        tagline: 'Catch it before it starts.',
        desc: 'Proactive health screening, vaccination programmes, and lifestyle medicine consultations designed to keep you ahead of illness.',
        features: [
            'Annual Physical Exam',
            'Vaccination',
            'Cancer Screening',
            'Lifestyle Counselling',
        ],
        href: '/book?service=preventive-care',
    },
    {
        id: 'emergency',
        iconKey: 'clock',
        color: 'error',
        title: '24 / 7 Emergency Diagnostics',
        tagline: 'Always ready. Always here.',
        desc: 'Round-the-clock emergency diagnostic support with on-call specialists and rapid result turnaround when it matters most.',
        features: [
            '24-Hour Lab',
            'Emergency Imaging',
            'On-Call Specialists',
            'Rapid Turnaround',
        ],
        href: '/contact',
        cta: 'Call the clinic',
        // Walk-in, not bookable: the wizard needs two hours' notice and a
        // slot on a rostered doctor's day, neither of which an emergency has.
        requiresBooking: false,
    },
    {
        id: 'telemedicine',
        iconKey: 'monitor',
        color: 'cyan',
        title: 'Telemedicine',
        tagline: 'Your doctor, anywhere.',
        desc: 'Secure video consultations with Wellcare specialists from the comfort of home — prescriptions and referrals included.',
        features: [
            'Video Consultations',
            'e-Prescriptions',
            'Lab Order Upload',
            'Follow-Up Scheduling',
        ],
        href: '/book?type=virtual',
    },
];

// ─── Packages ─────────────────────────────────────────────────────────────────
export interface PackageItem {
    id: string;
    badge: string;
    badgeColor: 'primary' | 'success' | 'warning' | 'sky';
    title: string;
    price: string;
    priceNote: string;
    desc: string;
    includes: string[];
    href: string;
    featured?: boolean;
}

export const packagesSectionMeta = {
    pill: 'Health Packages',
    heading: { plain: 'Find the Right ', gradient: 'Package for You' },
    desc: 'Bundled check-ups designed for every life stage and budget — with no hidden fees.',
};

// ─── Process ──────────────────────────────────────────────────────────────────
export const processData = {
    pill: 'How It Works',
    heading: { plain: 'Your Care Journey, ', gradient: 'Simplified' },
    steps: [
        {
            number: '01',
            title: 'Book Online or by Phone',
            desc: 'Schedule your appointment in minutes via our portal or by calling (046) 450-5116. Same-day slots are often available.',
        },
        {
            number: '02',
            title: 'Arrive & Check In',
            desc: 'Our front desk team will welcome you, verify your details, and guide you to the right department — no queuing confusion.',
        },
        {
            number: '03',
            title: 'Receive Your Care',
            desc: 'Your tests, scans, or consultation are carried out by experienced clinicians using the latest equipment.',
        },
        {
            number: '04',
            title: 'Get Your Results',
            desc: 'Most lab results are available within 24 hours — viewable online via your patient portal or collected in-clinic.',
        },
    ],
};
