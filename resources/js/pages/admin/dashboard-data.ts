// resources/js/pages/admin/dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Static copy and shared prop shapes for the System Administrator dashboard.

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    patients: number;
    archivedAppointments: number;
    archivedPatients: number;
    appointmentsToday: number;
    pendingLoa: number;
}

export interface RoleBreakdownRow {
    role: string;
    total: number;
    active: number;
}

export interface ActivityRow {
    id: number;
    description: string;
    event: string | null;
    logName: string | null;
    causer: string;
    ago: string | null;
}

export const adminDashboardCopy = {
    activeNavId: 'dashboard',
    pageTitle: 'System Administration',
    pageSubtitle:
        'Accounts, roles, archived records and the system activity trail.',
    roleCardTitle: 'Accounts by role',
    roleCardEmpty: 'No accounts have been created yet.',
    activityCardTitle: 'Recent activity',
    activityCardEmpty:
        'Nothing has been recorded yet. Entries appear here as accounts and records change.',
    activityCardLink: 'View the full log',
};

/** Human labels for the Spatie role slugs. */
export const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    hr: 'HR / HMO Officer',
    doctor: 'Doctor',
    nurse: 'Staff Nurse',
    user: 'Patient',
};

export const statCards: {
    key: keyof AdminStats;
    label: string;
    hint: string;
}[] = [
    { key: 'totalUsers', label: 'Total accounts', hint: 'All roles' },
    { key: 'activeUsers', label: 'Active', hint: 'Can sign in' },
    { key: 'inactiveUsers', label: 'Deactivated', hint: 'Locked out' },
    {
        key: 'patients',
        label: 'Patient records',
        hint: 'People receiving care',
    },
];

export const secondaryStatCards: {
    key: keyof AdminStats;
    label: string;
    hint: string;
}[] = [
    {
        key: 'appointmentsToday',
        label: "Today's appointments",
        hint: 'Excluding cancelled',
    },
    { key: 'pendingLoa', label: 'LOAs awaiting HR', hint: 'Objective 1.6' },
    {
        key: 'archivedAppointments',
        label: 'Archived appointments',
        hint: 'Restorable',
    },
    { key: 'archivedPatients', label: 'Archived patients', hint: 'Restorable' },
];
