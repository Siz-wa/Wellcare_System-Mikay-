// resources/js/pages/dpo/dpo-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Nav, copy and prop shapes for the Data Protection Officer workspace.
// GV-5 and §5.3 of WELLCARE-GOVERNANCE-PLAN.md.
//
// The role the Health Privacy Code (Joint AO 2016-0002) names and RA 10173
// requires a Personal Information Controller to designate. Three read-only
// screens and nothing else — the absence of an account-management link is the
// control, not an omission.

import type { NavGroup } from '@/pages/admin/layout/admin-dashboard-data';

export const dpoNavGroups: NavGroup[] = [
    {
        groupLabel: 'OVERVIEW',
        items: [
            {
                id: 'dashboard',
                label: 'Oversight',
                href: '/dpo/dashboard',
                iconKey: 'oversight',
            },
        ],
    },
    {
        groupLabel: 'AUDIT TRAILS',
        items: [
            {
                // The log nobody could read before this role existed.
                id: 'access-log',
                label: 'Record Access Log',
                href: '/dpo/access-log',
                iconKey: 'records',
            },
            {
                id: 'activity-log',
                label: 'Change Log',
                href: '/dpo/activity-log',
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

export interface AccessLogRow {
    id: number;
    /** "Removed account" when the actor was purged — the row outlives them. */
    actor: string;
    actorRole: string | null;
    patient: string | null;
    patientId: number | null;
    action: 'viewed' | 'downloaded' | 'exported' | 'searched';
    subjectType: string | null;
    /**
     * Tri-state, and the null matters.
     *
     * `null` — the question does not apply (a roster search, an aggregate
     * export, or a guarantor reading their own dependent's chart).
     * `true`  — clinical staff read a chart they hold an appointment with.
     * `false` — BREAK-GLASS. Clinical staff read a chart they have no care
     *           relationship with. PatientPolicy permits it and records it
     *           rather than refusing, because a hard denial would fire on a
     *           doctor covering a colleague's list. Permitting it is only
     *           defensible if somebody reviews it — this row is that review.
     */
    careRelationship: boolean | null;
    route: string | null;
    ip: string | null;
    at: string | null;
    ago: string | null;
}

/**
 * One `activity_log` entry.
 *
 * `at` and `ago` are both optional because the two surfaces that render this
 * shape need different halves of it: the dashboard's recent-changes panel wants
 * a relative time ("3 minutes ago") and the full table wants an absolute one.
 * The controller sends whichever it renders rather than both.
 */
export interface ChangeLogRow {
    id: number;
    description: string;
    logName: string;
    event: string | null;
    causer: string;
    causerRole?: string | null;
    subjectType?: string | null;
    subjectId?: number | null;
    at?: string | null;
    ago?: string | null;
}

export interface DpoStats {
    accessEventsToday: number;
    accessEventsTotal: number;
    breakGlassTotal: number;
    breakGlassToday: number;
    exports: number;
    downloads: number;
    /** Console break-glass recoveries (GV-10). Should normally be zero. */
    emergencyEvents: number;
}

/**
 * One `wellcare:admin:recover` run — GV-10.
 *
 * Somebody with shell access granted an account administrative rights outside
 * the application. The `reason` is what they typed at the console; `osUser` is
 * the operating-system account, captured rather than entered, so the claimed
 * identity has something beside it that was not self-reported.
 */
export interface EmergencyAccessRow {
    id: number;
    description: string;
    operator: string;
    osUser: string | null;
    reason: string | null;
    /** True when an active administrator already existed and was overridden. */
    forced: boolean;
    hostname: string | null;
    at: string | null;
    ago: string | null;
}

export const actionLabels: Record<string, string> = {
    viewed: 'Viewed',
    downloaded: 'Downloaded',
    exported: 'Exported',
    searched: 'Searched',
};

export const dpoCopy = {
    searchPlaceholder: 'Search the audit trail…',

    dashboardTitle: 'Data Protection Oversight',
    dashboardSubtitle:
        'Who looked at what, who changed what, and which access was outside a care relationship.',

    independenceTitle: 'This role cannot manage accounts — that is the point',
    independenceBody:
        'The Data Protection Officer holds no permission to create, edit, promote or suspend any account. That inability is what makes this view of administrator activity independent of the administrators it describes. It is also the only role that can read the record access log, because that log records them.',

    accessLogTitle: 'Record Access Log',
    accessLogSubtitle:
        'Every chart view, document download, roster search and export. Append-only — nothing in this application deletes from it.',
    accessLogEmpty: 'No access has been recorded yet.',

    changeLogTitle: 'Change Log',
    changeLogSubtitle:
        'Who modified a record, and what changed. Read-only from here.',
    changeLogEmpty: 'No changes have been recorded yet.',

    breakGlassTitle: 'Break-glass access',
    breakGlassBody:
        'Clinical staff opened a record they hold no appointment with. This is permitted and recorded rather than refused, so that a doctor covering a colleague’s list is not locked out mid-consultation — which makes reviewing these the whole of the control.',
    breakGlassEmpty: 'No break-glass access recorded. ',

    emergencyTitle: 'Break-glass administrative recovery',
    emergencyBody:
        'Someone with server access granted an account administrative rights from the console, outside the application. This is the documented recovery path for a clinic that is locked out — but every run belongs in front of a human, with its stated reason.',
    emergencyEmpty:
        'No emergency recovery has ever been run. This is the expected state.',

    recentChangesTitle: 'Recent changes',
    filterAll: 'All actions',
    filterBreakGlass: 'Only access without a care relationship (break-glass)',
    filterActorPlaceholder: 'Filter by staff name or email…',
};
