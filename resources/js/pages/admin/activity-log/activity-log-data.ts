// resources/js/pages/admin/activity-log/activity-log-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and prop shapes for the Activity Log — Fig. 3's "Activity Log" oval and
// Fig. 4's "Monitor System" flow.

export interface ActivityChange {
    field: string;
    from: string;
    to: string;
}

export interface ActivityEntry {
    id: number;
    description: string;
    logName: string | null;
    event: string | null;
    causer: string;
    causerRole: string | null;
    subjectType: string | null;
    subjectId: number | null;
    changes: ActivityChange[];
    at: string | null;
    ago: string | null;
}

/** Laravel's length-aware paginator, as Inertia serialises it. */
export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface ActivityFilters {
    log: string;
    event: string;
    search: string;
}

export interface ActivityStats {
    total: number;
    today: number;
}

export const activityLogCopy = {
    activeNavId: 'activity-log',
    pageTitle: 'Activity Log',
    pageSubtitle:
        'Every recorded change to accounts, appointments, patients, LOAs and lab results.',
    searchPlaceholder: 'Search descriptions…',
    tableEmpty: 'No activity matches these filters.',
    allLogs: 'All record types',
    allEvents: 'All events',

    readOnlyNote:
        'This log is read-only. Entries cannot be edited or deleted from the interface — an audit trail an administrator can rewrite is not an audit trail.',

    noChanges: 'No field-level detail recorded.',
};

export const activityColumns = [
    'What changed',
    'Who',
    'Record',
    'Event',
    'Details',
    'When',
];

export const activityStatCards: {
    key: keyof ActivityStats;
    label: string;
}[] = [
    { key: 'total', label: 'Recorded entries' },
    { key: 'today', label: 'Today' },
];
