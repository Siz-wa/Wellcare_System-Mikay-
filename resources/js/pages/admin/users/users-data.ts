// resources/js/pages/admin/users/users-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy, column definitions and prop shapes for User Management.
// Fig. 3 "User Management"; Fig. 4 "Add New User" / "Manage User Acc" /
// "Manage User/Roles" / "Deactivate/Reactivate Acc"; Objectives 1.1 and 1.3.

export interface AdminUserRow {
    id: number;
    name: string;
    initials: string;
    email: string;
    role: string;
    isActive: boolean;
    contactNumber: string | null;
    address: string | null;
    company: string | null;
    gender: string | null;
    birthdate: string | null;
    civilStatus: string | null;
    clientNumber: string | null;
    verified: boolean;
    createdAt: string | null;
    /** True for the signed-in admin's own row — their deactivate button is disabled. */
    isSelf: boolean;
}

export interface UserStats {
    total: number;
    active: number;
    inactive: number;
    admins: number;
}

export interface UserFilters {
    search: string;
    role: string;
    status: string;
}

export const usersCopy = {
    activeNavId: 'users',
    pageTitle: 'User Management',
    pageSubtitle:
        'Create accounts, assign roles, and deactivate access without deleting records.',
    addButton: 'Add new user',
    searchPlaceholder: 'Search by name or email…',
    tableEmpty: 'No accounts match these filters.',
    allRoles: 'All roles',
    allStatuses: 'All statuses',

    createTitle: 'Add new user',
    createSubmit: 'Create account',
    editTitle: 'Edit account',
    editSubmit: 'Save changes',
    cancel: 'Cancel',

    passwordHelpCreate: 'At least 8 characters.',
    passwordHelpEdit: 'Leave blank to keep the current password.',

    roleChangeTitle: 'Change role',
    roleChangeHelp:
        'Roles are exclusive — assigning a new one replaces the current role and changes where this account lands after signing in.',

    deactivateConfirm:
        'Deactivate this account? They will be signed out immediately and cannot sign back in until reactivated. No records are deleted.',
    activateConfirm: 'Reactivate this account and restore their access?',
    selfDeactivateHint: 'You cannot deactivate your own account.',
};

export const tableColumns = [
    'User',
    'Role',
    'Status',
    'Contact',
    'Created',
    'Actions',
];

export const statusFilterOptions = [
    { value: '', label: usersCopy.allStatuses },
    { value: 'active', label: 'Active only' },
    { value: 'inactive', label: 'Deactivated only' },
];

export const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    hr: 'HR / HMO Officer',
    doctor: 'Doctor',
    nurse: 'Staff Nurse',
    user: 'Patient',
    none: 'No role',
};

export const genderOptions = [
    { value: '', label: 'Not specified' },
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
];

export const civilStatusOptions = [
    { value: '', label: 'Not specified' },
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'widowed', label: 'Widowed' },
];

export const userStatCards: {
    key: keyof UserStats;
    label: string;
}[] = [
    { key: 'total', label: 'Total accounts' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Deactivated' },
    { key: 'admins', label: 'Active administrators' },
];
