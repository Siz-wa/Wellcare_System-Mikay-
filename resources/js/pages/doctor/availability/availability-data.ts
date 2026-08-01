// resources/js/pages/doctor/availability/availability-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content and types for the doctor's availability page.
// Every string the page renders lives here — no component holds copy.

// ── Server-provided shapes ────────────────────────────────────────────────────

export interface WeeklyBlock {
    isoDay: number; // 1 = Mon … 7 = Sun
    startTime: string; // "09:00"
    endTime: string; // "17:00"
    slotDuration: number; // minutes
}

export interface TimeOffEntry {
    id: number;
    date: string; // "2026-08-14"
    label: string; // "Fri, 14 Aug 2026"
    isAvailable: boolean;
}

// ── Weekday rows ──────────────────────────────────────────────────────────────

/**
 * ISO-8601 weekdays: 1 = Mon … 7 = Sun. The database column uses the MySQL
 * DAYOFWEEK convention (1 = Sun) instead — the server converts on the way in
 * and out, so nothing on this side should ever do the offset itself.
 */
export const weekdays: { isoDay: number; label: string; short: string }[] = [
    { isoDay: 1, label: 'Monday', short: 'MON' },
    { isoDay: 2, label: 'Tuesday', short: 'TUE' },
    { isoDay: 3, label: 'Wednesday', short: 'WED' },
    { isoDay: 4, label: 'Thursday', short: 'THU' },
    { isoDay: 5, label: 'Friday', short: 'FRI' },
    { isoDay: 6, label: 'Saturday', short: 'SAT' },
    { isoDay: 7, label: 'Sunday', short: 'SUN' },
];

export const defaultStartTime = '09:00';
export const defaultEndTime = '17:00';
export const defaultSlotDuration = 30;

export const slotDurationOptions = [10, 15, 20, 30, 45, 60] as const;

/**
 * The clinic's documented policy is five patients per day. The cap is what
 * actually closes a day to further bookings — the hours below only decide
 * WHICH times are offered, not how many patients get seen.
 */
export const dailyCapOptions = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;

// ── Page meta ─────────────────────────────────────────────────────────────────

export const availabilityMeta = {
    pageTitle: 'My Availability',
    pageSubtitle:
        'Set the hours patients can book you, and block out days you are away',

    weeklyTitle: 'Weekly Hours',
    weeklyHint:
        'Turn on the days you see patients. These hours repeat every week.',
    weeklyEmpty:
        'No days are switched on yet — patients cannot book you until at least one is.',

    capLabel: 'Patients per day',
    capHint:
        'Once this many patients are booked, the day closes automatically — however many hours are still free.',
    capSuffix: 'patients',

    dayOnLabel: 'Open',
    dayOffLabel: 'Closed',
    fromLabel: 'From',
    toLabel: 'To',
    slotLabel: 'Slot length',
    minutesSuffix: 'min',

    saveLabel: 'Save Weekly Hours',
    savingLabel: 'Saving…',

    timeOffTitle: 'Time Off',
    timeOffHint:
        'Blocking a date cancels any pending appointments on it and notifies nobody automatically — tell affected patients yourself.',
    timeOffEmpty: 'No upcoming time off.',
    timeOffDateLabel: 'Date',
    timeOffReasonLabel: 'Reason (optional)',
    timeOffReasonPlaceholder: 'Conference, leave, training…',
    timeOffAddLabel: 'Block This Date',
    timeOffAddingLabel: 'Blocking…',
    timeOffRemoveLabel: 'Remove',
    timeOffBadge: 'CLOSED',

    // Active nav id — must match NavItem.id in dashboard-data.ts
    activeNavId: 'availability',
};
