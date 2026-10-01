// resources/js/pages/hr/dashboard/hr-dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All nav + meta for the HR / HMO Officer dashboard.

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
        // Every key here needs a matching entry in ICON_MAP inside
        // components/HRAppSidebar.tsx or the sidebar fails to type.
        | 'payments';
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
                href: '/hr/dashboard',
                iconKey: 'dashboard',
            },
        ],
    },
    {
        // Renamed from 'HMO MANAGEMENT'. Both entries below are the same job —
        // deciding whether a booking is paid for — and the group had to stop
        // naming only one of the two ways that happens.
        groupLabel: 'COVERAGE & PAYMENTS',
        items: [
            {
                id: 'hmo-approvals',
                label: 'HMO Approvals',
                href: '/hr/hmo-approvals',
                iconKey: 'consultations',
            },
            {
                id: 'payment-verifications',
                label: 'Payment Verification',
                href: '/hr/payment-verifications',
                iconKey: 'payments',
            },
            // { id: "appointments",  label: "All Appointments",href: "/hr/appointments",   iconKey: "schedule"      },
        ],
    },
    {
        groupLabel: 'REPORTING',
        items: [
            {
                id: 'analytics',
                label: 'Analytics & Reports',
                href: '/hr/analytics',
                iconKey: 'labreviews',
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

export const hrDashboardMeta = {
    searchPlaceholder: 'Search appointments, patients…',
    activeNav: 'dashboard',
};
