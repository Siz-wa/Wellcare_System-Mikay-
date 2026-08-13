// resources/js/pages/admin/layout/admin-dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All nav + meta for the System Administrator workspace.
// Same shape as hr-dashboard-data.ts so the sidebar component is a direct
// parallel of HRAppSidebar.
//
// "HMO Approvals" points into the HR route group on purpose: admins stay
// members of `role:hr|admin` (see routes/web.php), so the queue is theirs to
// reach — only their landing page changed.

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
                href: '/admin/dashboard',
                iconKey: 'dashboard',
            },
        ],
    },
    {
        groupLabel: 'ADMINISTRATION',
        items: [
            {
                id: 'users',
                label: 'User Management',
                href: '/admin/users',
                iconKey: 'patients',
            },
            {
                id: 'patients',
                label: 'Manage Patients',
                href: '/admin/patients',
                iconKey: 'records',
            },
            {
                id: 'archive',
                label: 'Archive',
                href: '/admin/archive',
                iconKey: 'labreviews',
            },
            {
                id: 'activity-log',
                label: 'Activity Log',
                href: '/admin/activity-log',
                iconKey: 'consultations',
            },
        ],
    },
    {
        groupLabel: 'CLINIC',
        items: [
            {
                id: 'hr-dashboard',
                label: 'HR Dashboard',
                href: '/hr/dashboard',
                iconKey: 'dashboard',
            },
            {
                id: 'hmo-approvals',
                label: 'HMO Approvals',
                href: '/hr/hmo-approvals',
                iconKey: 'schedule',
            },
            {
                id: 'analytics',
                label: 'Analytics & Reports',
                href: '/hr/analytics',
                iconKey: 'labreviews',
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
        ],
    },
];

export const adminDashboardMeta = {
    searchPlaceholder: 'Search users, patients…',
    activeNav: 'dashboard',
};
