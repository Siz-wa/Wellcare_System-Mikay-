// resources/js/pages/nurse/layout/nurse-dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All nav + meta for the Staff Nurse portal.

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
        groupLabel: 'LABORATORY',
        items: [
            {
                id: 'lab-queue',
                label: 'Lab Queue',
                href: '/nurse/lab-queue',
                iconKey: 'labreviews',
            },
        ],
    },
    {
        groupLabel: 'HMO / LOA',
        items: [
            {
                id: 'loa-monitoring',
                label: 'LOA Monitoring',
                href: '/nurse/loa-monitoring',
                iconKey: 'consultations',
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
            { id: 'faqs', label: 'FAQs', href: '/faqs', iconKey: 'records' },
        ],
    },
];

export const nurseDashboardMeta = {
    searchPlaceholder: 'Search lab requests, patients…',
    activeNav: 'lab-queue',
};
