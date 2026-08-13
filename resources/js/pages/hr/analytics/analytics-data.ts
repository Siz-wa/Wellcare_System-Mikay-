// resources/js/pages/hr/analytics/analytics-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Static copy, prop shapes and the chart palette for the analytics workspace.
//
// Objective 1.5 names four things to analyse — patient trends, appointment
// data, clinic performance and LOA requests — so there are exactly four
// reports, one per clause, each a tab on this page.
//
// Every shape below mirrors an array shape documented in AnalyticsService.

// ── Shared primitives ────────────────────────────────────────────────────────

/** The shape every distribution chart consumes. */
export interface Slice {
    label: string;
    value: number;
}

export type RangeKey = '30d' | '90d' | '12m';

export type ReportKey =
    | 'patient-trends'
    | 'appointment-volume'
    | 'clinic-performance'
    | 'loa-turnaround'
    | 'diagnostics';

// ── Report payloads ──────────────────────────────────────────────────────────

export interface PatientTrends {
    stats: {
        totalPatients: number;
        newRegistrations: number;
        newBookings: number;
        returningBookings: number;
        newPatientShare: number;
    };
    registrations: Slice[];
    newVsReturning: { label: string; new: number; returning: number }[];
    gender: Slice[];
    ageBands: Slice[];
    coverage: Slice[];
    topServices: Slice[];
}

export interface AppointmentVolume {
    stats: {
        total: number;
        averagePerDay: number;
        busiestDay: number;
        virtualShare: number;
    };
    series: Slice[];
    byStatus: Slice[];
    byWeekday: Slice[];
    byDoctor: Slice[];
    byTimeSlot: Slice[];
    byType: Slice[];
}

export interface DoctorLoadRow {
    doctor: string;
    appointments: number;
    activeDays: number;
    averagePerDay: number;
    cap: number;
    utilisation: number;
}

export interface ClinicPerformance {
    stats: {
        total: number;
        completionRate: number;
        cancellationRate: number;
        noShowRate: number;
        averageLeadTimeDays: number;
        leadTimeSample: number;
    };
    rates: { label: string; value: number; count: number }[];
    doctorLoad: DoctorLoadRow[];
    labTurnaround: {
        requested: number;
        awaitingResults: number;
        awaitingReview: number;
        reviewed: number;
        hoursToRecord: number;
        hoursToReview: number;
        hoursEndToEnd: number;
    };
}

export interface LoaProviderRow {
    provider: string;
    submitted: number;
    approved: number;
    rejected: number;
    averageHours: number;
}

export interface LoaTurnaround {
    stats: {
        submitted: number;
        approved: number;
        rejected: number;
        pending: number;
        approvalRate: number;
        averageDecisionHours: number;
        decisionSample: number;
    };
    byStatus: Slice[];
    series: { label: string; submitted: number; decided: number }[];
    ageing: Slice[];
    byProvider: LoaProviderRow[];
}

// ── Diagnostics & actions ────────────────────────────────────────────────────

export type Severity = 'high' | 'medium' | 'low';

/** One prescriptive recommendation, with the evidence that triggered it. */
export interface AttentionItem {
    id: string;
    severity: Severity;
    magnitude: number;
    title: string;
    evidence: string;
    action: string;
    /** Only set when the admin/HR viewer can actually reach the route. */
    href: string | null;
}

/** One segment associated with a raised failure rate. */
export interface FailureSegment {
    label: string;
    total: number;
    failed: number;
    rate: number;
    /** Percentage points above the clinic-wide baseline. */
    lift: number;
    /** This segment's share of all failures in the period. */
    contribution: number;
}

export interface FailureDimension {
    dimension: string;
    segments: FailureSegment[];
    suppressed: number;
    suppressedAppointments: number;
}

export interface Diagnostics {
    attention: AttentionItem[];
    failureDrivers: {
        baseline: number;
        totalAppointments: number;
        totalFailed: number;
        dimensions: FailureDimension[];
        topDriver: (FailureSegment & { dimension: string }) | null;
    };
    loaDelay: {
        timedDecisions: number;
        totalWaitHours: number;
        byProvider: {
            provider: string;
            decisions: number;
            totalHours: number;
            averageHours: number;
            shareOfWait: number;
        }[];
        byOutcome: {
            outcome: string;
            decisions: number;
            averageHours: number;
        }[];
        pendingTotal: number;
        oldestPending: {
            loaNumber: string;
            provider: string;
            daysWaiting: number;
        }[];
        chaseCount: number;
        watchCount: number;
    };
    labBottleneck: {
        hoursToRecord: number;
        hoursToReview: number;
        dominantStage: string | null;
        dominantShare: number;
        awaitingResults: number;
        awaitingReview: number;
        staleAwaitingResults: number;
        staleAwaitingReview: number;
    };
    capacity: {
        capBreaches: {
            doctor: string;
            date: string;
            booked: number;
            cap: number;
            over: number;
        }[];
        breachCount: number;
        busiestDoctors: { doctor: string; booked: number }[];
        concentration: number;
        unassignedUpcoming: number;
    };
    criteria: {
        minSample: number;
        minFailures: number;
        minLift: number;
        labStaleHours: number;
        loaChaseDays: number;
    };
}

// ── Chart palette ────────────────────────────────────────────────────────────

/**
 * Literal hex, mirroring the token named beside each entry in
 * `resources/css/tokens.css`.
 *
 * `var(--wc-blue-600)` would be the obvious choice and is wrong here. Recharts
 * emits colours as SVG *presentation attributes* (`fill="…"`, `stroke="…"`),
 * and custom-property resolution inside presentation attributes is not
 * reliable across browsers — where it fails the mark renders black or not at
 * all, with no error. That is the silent-failure shape this project has been
 * bitten by before, and it would only show up on someone else's machine.
 *
 * The existing hand-rolled SVG chart in `doctor/components/patient-activity`
 * uses hex literals for the same reason. Keep these in step with tokens.css by
 * hand; the token name is recorded next to every value so the pairing is
 * greppable.
 */
export const chartPalette = {
    primary: '#0056b3', // --wc-blue-600, brand primary
    secondary: '#00a8e8', // --wc-sky-500, brand secondary
    tertiary: '#60a5fa', // --wc-blue-400
    success: '#16a34a', // --wc-success
    warning: '#ca8a04', // --wc-warning
    error: '#dc2626', // --wc-error
    grid: '#e2e8f0', // --wc-gray-200
    axis: '#64748b', // --wc-gray-500
    cursor: '#f1f5f9', // --wc-gray-100
} as const;

/** Categorical sequence for pie/segment charts, ordered for contrast. */
export const categoricalPalette: string[] = [
    '#0056b3', // --wc-blue-600
    '#00a8e8', // --wc-sky-500
    '#60a5fa', // --wc-blue-400
    '#16a34a', // --wc-success
    '#ca8a04', // --wc-warning
    '#003370', // --wc-blue-800
    '#94a3b8', // --wc-gray-400
    '#dc2626', // --wc-error
];

// ── Copy ─────────────────────────────────────────────────────────────────────

export const analyticsCopy = {
    activeNavId: 'analytics',
    pageTitle: 'Analytics & Reports',
    pageSubtitle:
        'Patient trends, appointment volume, clinic performance and LOA turnaround. Every report can be downloaded as CSV.',
    emptyChart: 'No data in this range.',
    exportLabel: 'Download CSV',
    rangeLegend: 'Reporting period',
};

export const rangeOptions: { key: RangeKey; label: string }[] = [
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
    { key: '12m', label: '12 months' },
];

export const reportTabs: { key: ReportKey; label: string }[] = [
    { key: 'patient-trends', label: 'Patient trends' },
    { key: 'appointment-volume', label: 'Appointment volume' },
    { key: 'clinic-performance', label: 'Clinic performance' },
    { key: 'loa-turnaround', label: 'LOA turnaround' },
    // Last on purpose: the four descriptive reports say what happened, and this
    // one reads them for why and what to do. It only makes sense after them.
    { key: 'diagnostics', label: 'Diagnostics & actions' },
];

/**
 * Headline figures per report. `format` decides the suffix so the section
 * components stay free of number formatting.
 */
export type StatFormat = 'number' | 'percent' | 'days' | 'hours';

export interface StatDef {
    key: string;
    label: string;
    hint: string;
    format: StatFormat;
}

export const patientTrendStats: StatDef[] = [
    {
        key: 'totalPatients',
        label: 'Patient records',
        hint: 'All time, excluding archived',
        format: 'number',
    },
    {
        key: 'newRegistrations',
        label: 'New registrations',
        hint: 'Created in this period',
        format: 'number',
    },
    {
        key: 'newBookings',
        label: 'First-time bookings',
        hint: 'Marked new at booking',
        format: 'number',
    },
    {
        key: 'returningBookings',
        label: 'Returning bookings',
        hint: 'Marked returning at booking',
        format: 'number',
    },
    {
        key: 'newPatientShare',
        label: 'New-patient share',
        hint: 'Of all bookings in period',
        format: 'percent',
    },
];

export const appointmentVolumeStats: StatDef[] = [
    {
        key: 'total',
        label: 'Appointments',
        hint: 'By date of care',
        format: 'number',
    },
    {
        key: 'averagePerDay',
        label: 'Average per day',
        hint: 'Across the whole period',
        format: 'number',
    },
    {
        key: 'busiestDay',
        label: 'Busiest single day',
        hint: 'Peak daily count',
        format: 'number',
    },
    {
        key: 'virtualShare',
        label: 'Virtual consultations',
        hint: 'Share booked as video',
        format: 'percent',
    },
];

export const clinicPerformanceStats: StatDef[] = [
    {
        key: 'completionRate',
        label: 'Completion rate',
        hint: 'Reached completed',
        format: 'percent',
    },
    {
        key: 'cancellationRate',
        label: 'Cancellation rate',
        hint: 'Cancelled before care',
        format: 'percent',
    },
    {
        key: 'noShowRate',
        label: 'No-show rate',
        hint: 'Booked but never arrived',
        format: 'percent',
    },
    {
        key: 'averageLeadTimeDays',
        label: 'Booking lead time',
        hint: 'Forward-booked only',
        format: 'days',
    },
];

export const loaStats: StatDef[] = [
    {
        key: 'submitted',
        label: 'Requests submitted',
        hint: 'In this period',
        format: 'number',
    },
    {
        key: 'approved',
        label: 'Approved',
        hint: 'Coverage granted',
        format: 'number',
    },
    {
        key: 'rejected',
        label: 'Rejected',
        hint: 'Coverage refused',
        format: 'number',
    },
    {
        key: 'approvalRate',
        label: 'Approval rate',
        hint: 'Of decided requests',
        format: 'percent',
    },
    {
        key: 'averageDecisionHours',
        label: 'Average decision time',
        hint: 'Submission to decision',
        format: 'hours',
    },
];

/** Card titles, kept here so the sections carry no copy of their own. */
export const chartTitles = {
    registrations: 'Patient registrations',
    newVsReturning: 'New vs. returning bookings',
    gender: 'Bookings by gender',
    ageBands: 'Bookings by age band',
    coverage: 'Bookings by coverage',
    topServices: 'Most requested services',
    volume: 'Appointment volume',
    byStatus: 'Appointments by status',
    byWeekday: 'Busiest days of the week',
    byDoctor: 'Appointments by doctor',
    byTimeSlot: 'Most requested time slots',
    byType: 'In-person vs. virtual',
    outcomes: 'Appointment outcomes',
    doctorLoad: 'Doctor load against daily cap',
    labTurnaround: 'Laboratory turnaround',
    loaFlow: 'LOA submissions vs. decisions',
    loaStatus: 'LOA requests by status',
    loaAgeing: 'Pending queue age (current)',
    loaProviders: 'Turnaround by HMO provider',
};

/**
 * Diagnostics copy.
 *
 * The wording here is deliberate and should not be "tightened" into something
 * punchier. Everything on this tab is an *association* between a segment and an
 * outcome — nothing establishes cause. "Concentrated in" and "accounts for" are
 * accurate; "caused by" and "because of" are not, and would be the first thing
 * a panel challenges. Keeping the phrasing in one file is what stops it
 * drifting back into causal language a component at a time.
 */
export const diagnosticsCopy = {
    attentionTitle: 'Needs attention',
    attentionEmpty:
        'Nothing needs attention in this period — no ageing LOA requests, no stalled lab work, and no doctor over their daily cap.',
    attentionIntro:
        'Rule-based checks against the thresholds shown with each item. Ordered by severity.',

    driversTitle: 'Where cancellations concentrate',
    driversIntro:
        'Segments whose cancellation rate sits above the clinic-wide baseline. These are associations, not causes — a segment can be raised for reasons this data does not contain.',
    driversEmpty:
        'No segment is meaningfully above the baseline in this period.',
    baselineLabel: 'Clinic baseline',

    loaTitle: 'Where LOA time goes',
    loaIntro:
        'Share of total accumulated waiting time per provider, and the requests still undecided.',
    loaWaitEmpty:
        'No measurable waiting time in this period — decisions were recorded in the same moment as their request.',
    pendingTitle: 'Longest-waiting requests',
    pendingEmpty: 'No LOA request is awaiting a decision.',

    labTitle: 'Where laboratory work backs up',
    labIntro:
        'Which half of the doctor → nurse → doctor chain holds a result up, and what is currently stalled.',
    labUndetermined:
        'Not determinable — no test has completed both stages in this period.',

    capacityTitle: 'Where capacity strains',
    capacityIntro:
        'Days a doctor was booked past their daily cap, and how evenly the roster carries the load.',
    capacityHealthy:
        'No doctor exceeded their daily patient cap in this period.',

    predictiveNote:
        'This module covers descriptive and diagnostic analytics. Forecasting is deliberately not offered: the current record holds too few distinct appointment dates, and no recorded no-shows, to support one honestly.',
};

/** Badge class per severity, matching the design system's badge variants. */
export const severityBadge: Record<Severity, string> = {
    high: 'wc-badge-error',
    medium: 'wc-badge-warning',
    low: 'wc-badge-sky',
};

export const severityLabel: Record<Severity, string> = {
    high: 'Act now',
    medium: 'Watch',
    low: 'Note',
};

export function formatStat(value: number, format: StatFormat): string {
    switch (format) {
        case 'percent':
            return `${value}%`;
        case 'days':
            return `${value}d`;
        case 'hours':
            return `${value}h`;
        default:
            return `${value}`;
    }
}
