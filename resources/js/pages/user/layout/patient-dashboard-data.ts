// resources/js/pages/user/dashboard/patient-dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All nav + meta for the patient portal dashboard.
// Mirrors the shape of doctor/dashboard-data.ts so the same AppSidebar
// component works — just import this instead.

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
        | 'settings'
        // Closed union — every key here needs a matching entry in ICON_MAP
        // inside components/PatientAppSidebar.tsx or the sidebar fails to type.
        | 'video';
}

export interface NavGroup {
    groupLabel: string;
    items: NavItem[];
}

export const navGroups: NavGroup[] = [
    {
        groupLabel: 'MY HEALTH',
        items: [
            {
                id: 'dashboard',
                label: 'My Appointments',
                href: '/user/dashboard',
                iconKey: 'dashboard',
            },
            {
                // Not `patients` — the FAQs entry below already claims that id.
                id: 'my-patients',
                label: 'My Patients',
                href: '/user/patients',
                iconKey: 'patients',
            },
            {
                id: 'records',
                label: 'My Records',
                href: '/user/records',
                iconKey: 'records',
            },
            {
                id: 'lab-results',
                label: 'Lab Results',
                href: '/user/lab-results',
                iconKey: 'labreviews',
            },
            {
                id: 'loa-status',
                label: 'LOA Status',
                href: '/user/loa-status',
                iconKey: 'consultations',
            },
            {
                id: 'consultations',
                label: 'Video Consultations',
                href: '/user/consultations',
                iconKey: 'video',
            },
        ],
    },
    {
        groupLabel: 'BOOKING',
        items: [
            {
                id: 'schedule',
                label: 'Book Appointment',
                href: '/book',
                iconKey: 'schedule',
            },
        ],
    },
    {
        groupLabel: 'Generals',
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

export const patientDashboardMeta = {
    searchPlaceholder: 'Search appointments…',
    activeNav: 'dashboard',
};
