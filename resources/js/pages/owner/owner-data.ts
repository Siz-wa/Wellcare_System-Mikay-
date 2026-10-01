// resources/js/pages/owner/owner-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Nav, copy and prop shapes for the System Owner (Tier 0) workspace.
// GV-6 and §5.1 of WELLCARE-GOVERNANCE-PLAN.md.
//
// The nav is deliberately four links long. The owner appoints administrators,
// recovers the system and configures it; a longer sidebar would be re-creating
// the "one role that does everything" this tier exists to break up.

import type { NavGroup } from '@/pages/admin/layout/admin-dashboard-data';

export const ownerNavGroups: NavGroup[] = [
    {
        groupLabel: 'OVERVIEW',
        items: [
            {
                id: 'dashboard',
                label: 'Governance',
                href: '/owner/dashboard',
                iconKey: 'governance',
            },
        ],
    },
    {
        groupLabel: 'CONTROL PLANE',
        items: [
            {
                // Points into the admin module on purpose: the owner holds
                // `users.view`, and it is the only account whose tier lets
                // User::mayGrantRole('admin') return true. Building a second
                // account screen for one extra capability would mean two places
                // to get account creation wrong.
                id: 'users',
                label: 'Appoint Administrators',
                href: '/admin/users',
                iconKey: 'patients',
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
];

export interface PrivilegedAccount {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    /** Whether 2FA enrolment is actually complete, not merely started. */
    twoFactor: boolean;
    lastSeen: string | null;
}

export interface OwnerStats {
    admins: number;
    activeAdmins: number;
    dpos: number;
    /** Should be zero. See the dashboard's alert banner. */
    withoutTwoFactor: number;
}

export interface GovernanceActivity {
    id: number;
    description: string;
    event: string | null;
    causer: string;
    ago: string | null;
}

export const ownerCopy = {
    searchPlaceholder: 'Search privileged accounts…',
    pageTitle: 'System Governance',
    pageSubtitle:
        'Appoint administrators, and see who currently holds authority over this system.',

    scopeNoticeTitle: 'This account holds no patient access',
    scopeNoticeBody:
        'The System Owner appoints administrators and configures the system. It cannot open a patient record, a chart, an archive or a lab result — by design, so that a compromise of this account costs control of the system and not the clinic’s records.',

    rosterTitle: 'Privileged accounts',
    rosterEmpty: 'No privileged accounts yet.',
    activityTitle: 'Recent control-plane activity',
    activityEmpty: 'Nothing recorded yet.',

    twoFactorWarning:
        'privileged account(s) have not completed two-factor enrolment. Until they do, a password is the only thing protecting them.',

    roleLabels: {
        owner: 'System Owner',
        admin: 'Administrator',
        dpo: 'Data Protection Officer',
    } as Record<string, string>,
};
