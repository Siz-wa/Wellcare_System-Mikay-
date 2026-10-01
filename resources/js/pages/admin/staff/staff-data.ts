// resources/js/pages/admin/staff/staff-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy, column definitions and prop shapes for Staff & Credentials.
//
// Phase 9 — the administrator acting as the clinic's medical director. The
// vocabulary here is deliberately the real Philippine one (PRC, PTR, PhilHealth,
// Diplomate/Fellow) rather than invented labels, because that is what the people
// using this screen will have in their hands.

export interface StaffRow {
    id: number;
    name: string;
    email: string;
    role: string;
    displayName: string | null;
    specialty: string | null;
    specialtyLabel: string | null;
    /** Whether patients can currently book this person. Derived from credentials. */
    isPublished: boolean;
    isAccountActive: boolean;
    credentialStatus: string;
    credentialLabel: string;
    /** A design-system Badge variant, chosen server-side by CredentialStatus::tone(). */
    credentialTone: string;
    prcLicenseNo: string | null;
    prcExpiresOn: string | null;
    /** Negative once a licence has lapsed; null when no expiry is on file. */
    daysUntilExpiry: number | null;
    hasLapsed: boolean;
    verifiedBy: string | null;
    verifiedAt: string | null;
    pendingScheduleDays: number;
}

export interface CredentialFile {
    prcLicenseNo: string | null;
    prcExpiresOn: string | null;
    ptrNo: string | null;
    ptrIssuedAtLgu: string | null;
    ptrExpiresOn: string | null;
    philhealthAccreditationNo: string | null;
    s2LicenseNo: string | null;
    specialtyBoard: string | null;
    boardStatus: string;
    medicalCertificateOn: string | null;
    remarks: string | null;
}

export interface ScheduleDay {
    id: number;
    label: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
}

export interface PendingRoster {
    doctorId: number;
    name: string;
    specialty: string | null;
    submittedAt: string | null;
    days: ScheduleDay[];
}

export interface StaffStats {
    clinicalStaff: number;
    awaitingVerification: number;
    expiringSoon: number;
    lapsed: number;
    rosterQueue: number;
}

export interface StaffFilters {
    search: string;
    status: string;
}

export interface SpecialtyOption {
    value: string;
    label: string;
    board: string | null;
}

export interface SelectOption {
    value: string;
    label: string;
}

export const staffCopy = {
    activeNavId: 'staff',
    rosterNavId: 'roster',

    outOfOffice: {
        title: 'Out of office',
        intro: 'Close a day this doctor cannot attend. It applies at once: every open appointment that day is cancelled and each patient is notified. Paid video fees go to HR for a refund decision.',
        dateLabel: 'Date',
        reasonLabel: 'Reason shown to patients',
        reasonHint:
            'Optional. Defaults to "Doctor unavailable — Out of Office".',
        submit: 'Close this day',
        confirmTitle: 'Close this day for the doctor?',
        confirmBody:
            'Open appointments on this date are cancelled and the patients are told. This cannot be undone from here.',
        confirmLabel: 'Close the day',
    },

    pageTitle: 'Staff & Credentials',
    pageSubtitle:
        'Verify licences, confer specialties, and decide who is cleared to see patients.',
    searchPlaceholder: 'Search by name, email or PRC number…',
    allStatuses: 'All credential statuses',
    tableEmpty: 'No clinical staff match these filters.',

    rosterTitle: 'Schedule Approvals',
    rosterSubtitle:
        'Doctors propose the hours they can attend. Nothing becomes bookable until you publish it.',
    rosterEmpty: 'No schedules are waiting for a decision.',

    detailTitle: 'Credentialing file',
    detailSubtitle:
        'What the clinic holds on record for this professional. Verification clears them to practise.',

    // ── Actions ──────────────────────────────────────────────────────────────
    verify: 'Verify & publish',
    reject: 'Reject',
    suspend: 'Suspend',
    saveFile: 'Save credentialing file',
    confer: 'Confer specialty',
    publishSchedule: 'Publish schedule',
    rejectSchedule: 'Send back',
    viewFile: 'Open file',
    cancel: 'Cancel',

    // ── Confirmations and prompts ────────────────────────────────────────────
    verifyConfirm:
        'Verify this licence and publish them to patients? They become bookable immediately.',
    suspendTitle: 'Suspend clearance',
    suspendHelp:
        'They stay able to sign in, but are withdrawn from booking at once. Give a reason — it is kept on the record.',
    rejectTitle: 'Reject credentials',
    rejectHelp:
        'The account stays usable and unpublished. Say what was wrong so the file shows why.',
    rejectScheduleTitle: 'Send the schedule back',
    rejectScheduleHelp:
        'The proposed hours are kept as a draft for the doctor to edit. Tell them what needs to change.',
    remarksLabel: 'Reason',
    remarksPlaceholder:
        'e.g. PRC ID could not be verified against the registry.',

    // ── Explanations shown in the UI ─────────────────────────────────────────
    gateNote:
        'A doctor is bookable only while they hold a verified, unlapsed credential. Creating the account does not clear them to practise.',
    boardNote:
        'A specialty is not self-declared. Every specialty except General / Family Medicine needs a Diplomate or Fellow certificate from its Philippine specialty board on file before it can be conferred.',
    prcNote:
        'A PRC registration is valid for three years and expires on the holder’s birthday. Practising on a lapsed licence is unlawful, so the nightly sweep withdraws clearance automatically.',
    ptrNote:
        'A Professional Tax Receipt is paid annually to the LGU where the professional practises.',
    medCertNote:
        'DOH AO 2021-0037 requires an annual medical certificate, with Hepatitis B and influenza immunisation, for clinical laboratory personnel.',

    notPublished: 'Not bookable',
    published: 'Bookable',
    noFile: 'No credentialing file on record',
    lapsedWarning: 'Licence has lapsed',
} as const;

export const tableColumns = [
    'Staff',
    'Role',
    'Specialty',
    'Credential',
    'PRC expiry',
    'Booking',
    'Actions',
];

export const rosterColumns = [
    'Doctor',
    'Proposed hours',
    'Submitted',
    'Decision',
];

export const staffStatCards: { key: keyof StaffStats; label: string }[] = [
    { key: 'clinicalStaff', label: 'Clinical staff' },
    { key: 'awaitingVerification', label: 'Awaiting verification' },
    { key: 'expiringSoon', label: 'Lapsing within 60 days' },
    { key: 'lapsed', label: 'Lapsed' },
    { key: 'rosterQueue', label: 'Schedules to approve' },
];

export const roleLabels: Record<string, string> = {
    doctor: 'Doctor',
    nurse: 'Staff Nurse',
    none: 'No role',
};

/**
 * How the PRC/PTR countdown reads in the table.
 *
 * Kept here rather than in the row component so the wording is in one place,
 * per the project's *-data.ts convention.
 */
export function expiryLabel(days: number | null, hasLapsed: boolean): string {
    if (days === null) {
        return 'No expiry on file';
    }

    if (hasLapsed) {
        return `Lapsed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
    }

    if (days === 0) {
        return 'Lapses today';
    }

    return `${days} day${days === 1 ? '' : 's'} remaining`;
}

/** Badge variant for the expiry countdown — mirrors the server-side tones. */
export function expiryTone(
    days: number | null,
    hasLapsed: boolean,
): 'success' | 'warning' | 'error' | 'neutral' {
    if (days === null) {
        return 'neutral';
    }

    if (hasLapsed) {
        return 'error';
    }

    if (days <= 60) {
        return 'warning';
    }

    return 'success';
}
