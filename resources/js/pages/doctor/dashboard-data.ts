// resources/js/pages/user/dashboard/dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static and mock data for the dashboard page.
// Swap values here without touching any component files.

// ── Nav groups & links ────────────────────────────────────────────────────────

export interface NavItem {
    id: string;
    label: string;
    href: string;
    iconKey:
        | 'dashboard'
        | 'schedule'
        | 'patients'
        | 'consultations'
        | 'labreviews'
        | 'records'
        | 'settings';
}

export interface NavGroup {
    groupLabel: string;
    items: NavItem[];
}

export const navGroups: NavGroup[] = [
    {
        groupLabel: 'OVERVIEW',
        items: [
            {
                id: 'dashboard',
                label: 'Dashboard',
                href: '/doctor/appointments',
                iconKey: 'dashboard',
            },
            // { id: "schedule", label: "Pending Appointments", href: "doctor/appointments", iconKey: "schedule" },
        ],
    },
    {
        groupLabel: 'MEDICAL MANAGEMENT',
        items: [
            // { id: "patients", label: "My Patients", href: "/doctor/my-patients", iconKey: "patients" },
            {
                id: 'consultations',
                label: 'Consultations',
                href: '/doctor/consultations',
                iconKey: 'consultations',
            },
            {
                id: 'labreviews',
                label: 'Lab Reviews',
                href: '/doctor/lab-reviews',
                iconKey: 'labreviews',
            },
            {
                id: 'records',
                label: 'Patient Records',
                href: '/doctor/patient-records',
                iconKey: 'records',
            },
            {
                id: 'availability',
                label: 'My Availability',
                href: '/doctor/availability',
                iconKey: 'schedule',
            },
        ],
    },
    {
        // Settings is reachable from the account menu in the topbar too, but a
        // sidebar entry is what people actually look for — and until this
        // existed, no role's sidebar linked to it at all.
        groupLabel: 'ACCOUNT',
        items: [
            {
                id: 'settings',
                label: 'Settings',
                href: '/settings/profile',
                iconKey: 'settings',
            },
        ],
    },
    {
        // The public marketing pages, kept last and under their own
        // heading so they do not compete with the role's actual tasks.
        groupLabel: 'WELLCARE SITE',
        items: [
            { id: 'home', label: 'Home Page', href: '/', iconKey: 'records' },
            {
                id: 'doctors',
                label: 'Doctors List',
                href: '/doctors',
                iconKey: 'records',
            },
            {
                id: 'contact',
                label: 'Contact Us',
                href: '/contact',
                iconKey: 'records',
            },
            {
                id: 'patients',
                label: 'FAQs',
                href: '/faqs',
                iconKey: 'records',
            },
        ],
    },
];

// ── Stat cards ────────────────────────────────────────────────────────────────

// resources/js/pages/user/dashboard/dashboard-data.ts

export interface StatCard {
    id: string;
    label: string;
    target: number; // already correct
    delta: string;
    positive: boolean;
    iconKey: 'users' | 'calendar' | 'consultation' | 'lab';
    iconBg: string; // ← now vibrant solid colors
    iconColor: string; // ← will be ignored (we force white)
}

// ── Recent Activity ───────────────────────────────────────────────────────────

export interface ActivityItem {
    id: string;
    label: string; // Added: e.g., "Consultation"
    user: string;
    action: string;
    target: string;
    time: string;
    type: 'appointment' | 'lab' | 'record' | 'system';
    dotColor: string; // Added: e.g., "var(--wc-blue-500)"
}

// ── Patient activity chart (weekly) ───────────────────────────────────────────

export interface ChartPoint {
    day: string;
    value: number;
}

// ── Clinic workflow steps ─────────────────────────────────────────────────────

export interface WorkflowStep {
    id: string;
    step: number;
    title: string;
    description: string;
    iconKey:
        | 'labstep'
        | 'nurse'
        | 'notification'
        | 'review'
        | 'record'
        | 'release';
}

// ── Today's appointments ──────────────────────────────────────────────────────

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';

export interface TodayAppointment {
    id: string;
    name: string;
    service: string;
    time: string;
    status: AppointmentStatus;
    initials: string;
    color: string;
}

// ── Pending lab reviews ───────────────────────────────────────────────────────

export interface LabReview {
    id: string;
    name: string;
    test: string;
    timeAgo: string;
    initials: string;
    color: string;
}

// ── Page meta ─────────────────────────────────────────────────────────────────

// The hardcoded statCards / activityItems / patientActivityData / workflowSteps
// / todayAppointments / pendingLabReviews arrays and dashboardMeta used to sit
// here. They fed `/doctor/dashboard`, a route with no controller, so the page
// greeted every doctor as "Dr. Douglas" above figures that were typed in by
// hand — "TOTAL PATIENTS 70" against a real roster of 13. The route redirects to
// /doctor/appointments now and the data is gone with it. The interfaces above
// are kept: icons/index.tsx resolves icons off StatCard, WorkflowStep and
// AppointmentStatus, and AppSidebar reads navGroups.
