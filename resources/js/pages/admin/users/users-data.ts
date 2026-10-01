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
    /**
     * May the signed-in administrator edit this account or start a password
     * reset on it? False for their own row and for any account at the same
     * level of access or higher — see GV-1 in WELLCARE-GOVERNANCE-PLAN.md and
     * User::mayAdminister(). The server enforces it either way; this only lets
     * the UI say so before the click.
     */
    canAdminister: boolean;
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
    sendInviteLabel: 'Email them an invitation to set their own password',
    sendInviteHint:
        'Recommended. You never see or handle their password. Untick to set a temporary one yourself; they must change it at first sign-in.',

    // GV-1: an administrator never sets somebody else's password. The edit form
    // has no password field at all; this is the only way to restore access to
    // an account that is not your own.
    resetPasswordButton: 'Send reset link',
    resetPasswordConfirm:
        'Email a password reset link to this account holder? The link goes to their own address and expires — you will not see or set their password.',
    resetPasswordHint:
        'Password resets are sent to the account holder. Administrators cannot set another person’s password.',
    // Scoped to what is actually refused. It used to read "Only the system
    // owner can manage it", which the same row contradicts: Role and
    // Deactivate stay enabled on a peer administrator, because taking
    // authority away is the safe direction (StaffAccountService::changeRole).
    // Naming the two blocked actions is both true and more useful than naming
    // a restriction the buttons beside it visibly do not honour.
    peerAccountHint:
        'This account has the same level of access as yours or higher, so only the system owner can edit its details or send it a reset link. You can still change its role or deactivate it.',
    roleGrantHint:
        'Administrators and Data Protection Officers can only be appointed by the system owner.',

    roleChangeTitle: 'Change role',
    roleChangeHelp:
        'Roles are exclusive — assigning a new one replaces the current role and changes where this account lands after signing in.',

    deactivateConfirm:
        'Deactivate this account? They will be signed out immediately and cannot sign back in until reactivated. No records are deleted.',
    activateConfirm: 'Reactivate this account and restore their access?',
    selfDeactivateHint: 'You cannot deactivate your own account.',
    // The Role button is disabled on your own row too, and said nothing about
    // why. Mirrors StaffAccountService::changeRole()'s refusal.
    selfRoleHint:
        'You cannot change your own role. Ask another administrator to do it.',
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
    // `owner` is here for display only — it is never an option in the role
    // select, because StoreUserRequest::ROLES omits it. A Tier 0 account is
    // created by `php artisan wellcare:owner:create` and shows up in this table
    // like any other row, so it still needs a label.
    owner: 'System Owner',
    admin: 'Administrator',
    dpo: 'Data Protection Officer',
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
    { value: 'separated', label: 'Separated' },
    { value: 'annulled', label: 'Annulled' },
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
