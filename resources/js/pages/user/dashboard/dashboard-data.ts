// resources/js/pages/user/dashboard/dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types, static copy and the small pure helpers the patient dashboard reads.
// Nothing here renders — sections and components import from this file so the
// page itself stays composition-only.

import type { VitalsSource } from '@/lib/vitals';
import type { PageProps } from '@/types';

// ── Payload types ─────────────────────────────────────────────────────────────

export interface AppointmentItem {
    id: number;

    /** Who the visit is for — a booking account can guarantee several people. */
    patientKey: string;
    patientId: number | null;
    patientName: string;
    patientInitials: string;
    patientRelation: string | null;
    isSelf: boolean;
    patientAge: number | null;

    /** When, pre-bucketed server-side so the client never parses "9:00 AM". */
    date: string;
    rawDate: string;
    dayLabel: string;
    bucket: DayBucket;
    weekday: string;
    dayNumber: string;
    monthShort: string;
    time: string;
    sortKey: string;
    isToday: boolean;
    isTomorrow: boolean;
    isPast: boolean;

    /** What. */
    service: string;
    status: string;
    coverage: string;
    hmo: string | null;
    patientStatus: string;
    consultationType: string | null;
    /**
     * Present only while this visit still owes the clinic — so only ever on a
     * self-paid video consultation. Null on everything else, including one
     * already settled: a "paid" badge on a visit that was never billed would
     * be reassuring about nothing.
     */
    payment: {
        reference: string;
        amountDue: number;
        status: string;
        dueAt: string | null;
        isOverdue: boolean;
    } | null;
    branch: string | null;
    additionalInfo: string | null;
    /** Day-of only. Decided server-side; the endpoint enforces the same rule. */
    canCheckIn: boolean;
    /** False once the date has passed — a stale visit is the clinic's to close. */
    canCancel: boolean;
    /** Movable online to another date and time with the same doctor. */
    canReschedule: boolean;
    doctorId: number | null;
    doctor: string | null;
    /**
     * The doctor's public profile, or null when they are not published.
     *
     * Null rather than a built-from-id URL, because an unpublished doctor's
     * page 404s and a dead link is worse than no link. The server decides;
     * see PatientDashboardController.
     */
    doctorProfileUrl: string | null;
}

export interface PastRecord {
    id: number;
    service: string;
    date: string;
    rawDate: string;
    time: string;
    status: string;
    coverage: string;
    patientStatus: string;
    cancellationReason: string | null;
    doctor: string | null;
    doctorProfileUrl: string | null;
    soap: {
        subjective: string | null;
        objective: string | null;
        assessment: string | null;
        plan: string | null;
    } | null;
    vitals: {
        bloodPressure: string | null;
        heartRate: string | null;
        temperature: string | null;
        oxygenSaturation: string | null;
        weight: string | null;
        height: string | null;
        source: VitalsSource | null;
        /** Null only for rows written before provenance was recorded. */
        sourceLabel: string | null;
    } | null;
}

export interface PatientGroup {
    key: string;
    patient: string;
    relation: string | null;
    initials: string;
    records: PastRecord[];
}

/** One person with something booked — drives the board's person filter. */
export interface PatientSummary {
    key: string;
    id: number | null;
    name: string;
    initials: string;
    relation: string | null;
    isSelf: boolean;
    count: number;
    nextDayLabel: string;
}

export interface Stats {
    upcoming: number;
    today: number;
    confirmed: number;
    awaiting: number;
}

export interface DashboardPageProps extends PageProps {
    appointments: AppointmentItem[];
    appointmentPatients: PatientSummary[];
    pastByPatient: PatientGroup[];
    stats: Stats;
    /** The bookable date range, for the reschedule picker. */
    bookingWindow: { min: string; max: string };
}

export type DayBucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later';

export type GroupMode = 'date' | 'person';

/** A day's worth of appointments, in the order the board renders them. */
export interface DaySection {
    rawDate: string;
    dayLabel: string;
    fullDate: string;
    bucket: DayBucket;
    items: AppointmentItem[];
}

/** One person's upcoming appointments, for the person-grouped view. */
export interface PersonSection {
    key: string;
    name: string;
    initials: string;
    relation: string | null;
    isSelf: boolean;
    items: AppointmentItem[];
}

// ── Status vocabulary ─────────────────────────────────────────────────────────

export interface StatusTone {
    label: string;
    bg: string;
    color: string;
    /** The card's left accent bar, so status is readable before reading. */
    accent: string;
    /** Plain-language line telling the patient what happens next. */
    hint: string | null;
    /** Replaces `hint` for a video consultation, where there is no queue. */
    virtualHint?: string;
}

export const STATUS_CONFIG: Record<string, StatusTone> = {
    pending_hmo_approval: {
        label: 'HMO Verification',
        bg: '#f5f3ff',
        color: '#6d28d9',
        accent: '#7c3aed',
        hint: 'HR is verifying your HMO coverage.',
    },
    requested: {
        label: 'Pending Review',
        bg: '#fef9c3',
        color: '#a16207',
        accent: '#eab308',
        hint: 'Waiting for the doctor to confirm.',
    },
    confirmed: {
        label: 'Confirmed',
        bg: '#dcfce7',
        color: '#15803d',
        accent: '#16a34a',
        hint: 'Your slot is locked in.',
    },
    checked_in: {
        label: 'Checked In',
        bg: '#dbeafe',
        color: '#1d4ed8',
        accent: '#2563eb',
        hint: 'You are in the queue — please wait to be called.',
        virtualHint:
            'You are checked in. Your doctor will open the video room; you will get a notification and a Join button here.',
    },
    in_progress: {
        label: 'With Doctor',
        bg: '#ede9fe',
        color: '#6d28d9',
        accent: '#8b5cf6',
        hint: 'Your consultation is underway.',
    },
    completed: {
        label: 'Completed',
        bg: '#f0fdf4',
        color: '#15803d',
        accent: '#22c55e',
        hint: null,
    },
    cancelled: {
        label: 'Cancelled',
        bg: '#fee2e2',
        color: '#b91c1c',
        accent: '#ef4444',
        hint: null,
    },
    no_show: {
        label: 'No Show',
        bg: '#f1f5f9',
        color: '#64748b',
        accent: '#94a3b8',
        hint: null,
    },
};

export const FALLBACK_STATUS: StatusTone = {
    label: 'Unknown',
    bg: 'var(--wc-gray-100)',
    color: 'var(--wc-gray-500)',
    accent: 'var(--wc-gray-300)',
    hint: null,
};

export function statusTone(status: string): StatusTone {
    return STATUS_CONFIG[status] ?? { ...FALLBACK_STATUS, label: status };
}

/**
 * The rail of states an appointment walks through. HMO bookings take a longer
 * path because HR has to clear coverage before the doctor ever sees the
 * request, and hiding that step makes the wait look like nothing is happening.
 */
export function stepsFor(status: string): { key: string; label: string }[] {
    if (status === 'pending_hmo_approval') {
        return [
            { key: 'pending_hmo_approval', label: 'HMO review' },
            { key: 'requested', label: 'Doctor review' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'checked_in', label: 'Checked in' },
            { key: 'completed', label: 'Seen' },
        ];
    }

    return [
        { key: 'requested', label: 'Requested' },
        { key: 'confirmed', label: 'Confirmed' },
        { key: 'checked_in', label: 'Checked in' },
        { key: 'in_progress', label: 'With doctor' },
        { key: 'completed', label: 'Seen' },
    ];
}

// ── Day-bucket presentation ───────────────────────────────────────────────────

export interface BucketTone {
    /** Tints the day separator so "today" reads differently from "later". */
    color: string;
    background: string;
    border: string;
    note: string | null;
}

export const BUCKET_TONE: Record<DayBucket, BucketTone> = {
    overdue: {
        color: '#b91c1c',
        background: '#fef2f2',
        border: '#fecaca',
        note: 'This date has passed and the visit is still open.',
    },
    today: {
        color: 'var(--wc-blue-700)',
        background: 'var(--wc-blue-50)',
        border: 'var(--wc-blue-200)',
        note: null,
    },
    tomorrow: {
        color: 'var(--wc-gray-700)',
        background: 'var(--wc-gray-50)',
        border: 'var(--wc-gray-200)',
        note: null,
    },
    week: {
        color: 'var(--wc-gray-600)',
        background: 'var(--wc-gray-50)',
        border: 'var(--wc-gray-200)',
        note: null,
    },
    later: {
        color: 'var(--wc-gray-500)',
        background: 'var(--wc-gray-50)',
        border: 'var(--wc-gray-200)',
        note: null,
    },
};

// ── Person colours ────────────────────────────────────────────────────────────

/**
 * A person keeps the same colour everywhere they appear — board, filter chip,
 * history panel — so the family can be told apart at a glance. Derived from the
 * stable `patientKey` rather than list position, which reshuffles on filter.
 */
export const AVATAR_PALETTE = [
    { bg: '#dbeafe', fg: '#1d4ed8', solid: '#2563eb' },
    { bg: '#dcfce7', fg: '#15803d', solid: '#16a34a' },
    { bg: '#fae8ff', fg: '#a21caf', solid: '#c026d3' },
    { bg: '#ffedd5', fg: '#c2410c', solid: '#ea580c' },
    { bg: '#e0e7ff', fg: '#4338ca', solid: '#4f46e5' },
    { bg: '#ccfbf1', fg: '#0f766e', solid: '#0d9488' },
    { bg: '#fce7f3', fg: '#be185d', solid: '#db2777' },
    { bg: '#fef3c7', fg: '#a16207', solid: '#d97706' },
] as const;

export function avatarColor(key: string): (typeof AVATAR_PALETTE)[number] {
    let hash = 0;

    for (let i = 0; i < key.length; i += 1) {
        hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }

    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// ── Copy ──────────────────────────────────────────────────────────────────────

export const dashboardCopy = {
    greetings: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
    },
    subtitleOne: 'Here is what is coming up for you.',
    subtitleMany: (n: number) =>
        `Here is what is coming up for the ${n} people on your account.`,
    board: {
        title: 'Appointment board',
        searchPlaceholder: 'Search person, service, doctor or date…',
        groupByDate: 'By date',
        groupByPerson: 'By person',
        allPeople: 'Everyone',
        bookCta: '+ Book new',
        historyCta: 'History',
    },
    nextUp: {
        eyebrow: 'Up next',
        noneTitle: 'Nothing booked yet',
        noneBody:
            'Book a visit and it will show up here with its full timeline.',
    },
    empty: {
        title: 'No upcoming appointments',
        body: 'Book your first appointment and everyone on your account will be tracked here.',
        cta: 'Book an appointment',
    },
    emptyFiltered: {
        title: 'Nothing matches those filters',
        body: 'Try a different person, or clear the search.',
        cta: 'Clear filters',
    },
    history: {
        title: 'Past appointments',
        emptyBody: 'No past appointments yet.',
    },
    // Copy for the cancel confirmation. The title asks the question, the body
    // says what the consequence is, and the action button names the action
    // rather than saying "OK" — so it cannot be misread next to "Keep it".
    cancelConfirmTitle: 'Cancel this appointment?',
    cancelConfirm:
        'The slot is released straight away and your doctor is notified. You can book again, but this time may be taken by then.',
    cancelConfirmAction: 'Cancel appointment',
    cancelConfirmDismiss: 'Keep it',
    rescheduleAction: 'Reschedule',
    reschedule: {
        title: 'Move this appointment',
        description: (
            service: string,
            doctor: string | null,
            date: string,
            time: string,
        ) =>
            `${service}${doctor ? ` with ${doctor}` : ''}, currently ${date} at ${time}. Pick a new date and time. Your current slot is kept until the new one is secured.`,
        dateLabel: 'New date',
        timeLabel: 'Available times',
        loading: 'Checking this doctor’s free times…',
        loadFailed: 'Could not load times. Try another date.',
        noSlots: 'No free times on this date. Try another day.',
        keep: 'Keep current time',
        confirm: 'Move appointment',
        saving: 'Moving…',
        failed: 'That time could not be booked. Please pick another.',
    },
    cancelLateNote:
        'Cancelling within 24 hours of a paid video consultation may forfeit the fee. The clinic will contact you about any refund.',
    cancelReasonLabel: 'Reason (optional)',
    cancelReasonPlaceholder: 'Tell your doctor why, if you like',
} as const;

export const statTiles = [
    { key: 'upcoming' as const, label: 'Upcoming', color: '#2B59C3' },
    { key: 'today' as const, label: 'Today', color: '#0EA5E9' },
    { key: 'confirmed' as const, label: 'Confirmed', color: '#10B981' },
    { key: 'awaiting' as const, label: 'Awaiting approval', color: '#F97316' },
];

// ── Grouping ──────────────────────────────────────────────────────────────────

/**
 * The separator the patient was missing: one section per calendar day, in
 * chronological order, each labelled in the words they would use ("Today",
 * "Friday") rather than a bare date string.
 */
export function groupByDay(items: AppointmentItem[]): DaySection[] {
    const sections = new Map<string, DaySection>();

    for (const item of items) {
        const existing = sections.get(item.rawDate);

        if (existing) {
            existing.items.push(item);
            continue;
        }

        sections.set(item.rawDate, {
            rawDate: item.rawDate,
            dayLabel: item.dayLabel,
            fullDate: item.date,
            bucket: item.bucket,
            items: [item],
        });
    }

    return [...sections.values()].sort((a, b) =>
        a.rawDate.localeCompare(b.rawDate),
    );
}

/** The same appointments, cut the other way: one section per person. */
export function groupByPerson(items: AppointmentItem[]): PersonSection[] {
    const sections = new Map<string, PersonSection>();

    for (const item of items) {
        const existing = sections.get(item.patientKey);

        if (existing) {
            existing.items.push(item);
            continue;
        }

        sections.set(item.patientKey, {
            key: item.patientKey,
            name: item.patientName,
            initials: item.patientInitials,
            relation: item.patientRelation,
            isSelf: item.isSelf,
            items: [item],
        });
    }

    return [...sections.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Free-text match across every field a patient would plausibly type. */
export function matchesSearch(item: AppointmentItem, term: string): boolean {
    const needle = term.trim().toLowerCase();

    if (needle === '') {
        return true;
    }

    return [
        item.patientName,
        item.patientRelation,
        item.service,
        item.doctor,
        item.date,
        item.dayLabel,
        item.time,
        item.coverage,
        item.hmo,
        statusTone(item.status).label,
    ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
}

export function greetingFor(hour: number): string {
    if (hour < 12) {
        return dashboardCopy.greetings.morning;
    }

    return hour < 18
        ? dashboardCopy.greetings.afternoon
        : dashboardCopy.greetings.evening;
}

/** "9:00 AM" → { clock: "9:00", meridiem: "AM" } for the card's time rail. */
export function splitTime(time: string): { clock: string; meridiem: string } {
    const [clock, meridiem = ''] = time.trim().split(/\s+/);

    return { clock: clock ?? time, meridiem };
}
