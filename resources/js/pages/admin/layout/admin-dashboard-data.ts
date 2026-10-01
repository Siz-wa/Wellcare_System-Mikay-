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
    /**
     * Spatie permission this link's route is gated on, from
     * RoleAndPermissionSeeder::MATRIX. Omit for a link every account reaching
     * this sidebar can open.
     *
     * The admin sidebar is shared with the System Owner, who is inside
     * `role:admin|owner` for reachability but holds none of the patient,
     * archive or credentialing permissions — so seven of these links used to
     * 403 for that account while sitting in its navigation. OB-02 of the
     * 2026-09-11 governance walkthrough.
     */
    permission?: string;
    /**
     * Roles whose route group admits this link, for the handful gated on
     * `role:` rather than `permission:` — the HR module, which an
     * administrator reaches and an owner does not.
     */
    roles?: string[];
    iconKey:
        | 'dashboard'
        | 'schedule'
        | 'patients'
        | 'consultations'
        | 'labreviews'
        | 'records'
        | 'settings'
        // Governance roles — GV-5 / GV-6. Kept in this union rather than in a
        // separate one because AdminAppSidebar's ICON_MAP is keyed on it, and
        // two unions would let a nav item name an icon the map has no entry for.
        | 'governance'
        | 'oversight';
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
                permission: 'users.view',
                iconKey: 'patients',
            },
            {
                id: 'patients',
                label: 'Manage Patients',
                href: '/admin/patients',
                permission: 'patients.demographics.view',
                iconKey: 'records',
            },
            {
                id: 'archive',
                label: 'Archive',
                href: '/admin/archive',
                permission: 'archive.view',
                iconKey: 'labreviews',
            },
            {
                id: 'messages',
                label: 'Messages',
                href: '/admin/messages',
                roles: ['admin'],
                iconKey: 'records',
            },
            {
                id: 'activity-log',
                label: 'Activity Log',
                href: '/admin/activity-log',
                permission: 'audit.read',
                iconKey: 'consultations',
            },
        ],
    },
    {
        // Phase 9 — the administrator acting as the clinic's medical director.
        // Its own group rather than an entry under ADMINISTRATION: deciding who
        // may see patients is a different kind of authority from managing a
        // login, and the sidebar should not imply otherwise.
        groupLabel: 'CLINIC GOVERNANCE',
        items: [
            {
                id: 'staff',
                label: 'Staff & Credentials',
                href: '/admin/staff',
                permission: 'staff.credential',
                iconKey: 'patients',
            },
            {
                id: 'roster',
                label: 'Schedule Approvals',
                href: '/admin/staff/roster',
                permission: 'staff.credential',
                iconKey: 'schedule',
            },
            {
                // What the clinic offers. In this group rather than under
                // ADMINISTRATION for the same reason credentialing is: deciding
                // which services the clinic delivers is a clinical decision,
                // not an account-management one.
                id: 'services',
                label: 'Manage Services',
                href: '/admin/services',
                permission: 'services.manage',
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
                roles: ['hr', 'admin'],
                iconKey: 'dashboard',
            },
            {
                // GV-3: the label says "queue", not "approvals", because an
                // administrator reaching this page can see the backlog and
                // cannot clear it — the approve and reject routes are
                // `role:hr`. Naming it after the decision would promise
                // authority the account does not have.
                id: 'hmo-approvals',
                label: 'LOA Queue (view only)',
                href: '/hr/hmo-approvals',
                roles: ['hr', 'admin'],
                iconKey: 'schedule',
            },
            {
                id: 'analytics',
                label: 'Analytics & Reports',
                href: '/hr/analytics',
                roles: ['hr', 'admin'],
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
        ],
    },
];

export const adminDashboardMeta = {
    searchPlaceholder: 'Search users, patients…',
    activeNav: 'dashboard',
};
