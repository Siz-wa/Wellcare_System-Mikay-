// resources/js/pages/user/loa-status/loa-status-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and display maps for the patient-facing LOA status page.
// Objective 1.6; Fig. 11's `LOA Status` process returning "LOA Status Result".

export type LoaStatus = 'submitted' | 'approved' | 'rejected' | 'expired';

export interface LoaAppointment {
    date: string | null;
    time: string | null;
    service: string;
    doctor: string | null;
    status: string;
}

export interface LoaRequest {
    id: number;
    loaNumber: string;
    status: LoaStatus;
    patientName: string;
    patientInitials: string;
    hmoProvider: string | null;
    hmoId: string | null;
    requestedAt: string | null;
    requestedAgo: string | null;
    decidedAt: string | null;
    validUntil: string | null;
    isExpired: boolean;
    remarks: string | null;
    appointment: LoaAppointment | null;
}

export interface LoaStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
}

export const loaStatusMeta = {
    title: 'LOA Status',
    subtitle:
        'Track the Letters of Authorization for appointments booked under your HMO coverage.',

    statsLabels: {
        total: 'Total requests',
        pending: 'Awaiting approval',
        approved: 'Approved',
        rejected: 'Rejected',
    },

    empty: {
        title: 'No LOA requests yet',
        // A patient who has only ever paid cash should not think this is broken.
        body: 'A Letter of Authorization is created automatically when you book an appointment under HMO coverage. Requests you make will appear here with their approval status.',
    },

    labels: {
        reference: 'LOA number',
        provider: 'HMO provider',
        memberId: 'Member ID',
        requested: 'Requested',
        decided: 'Decided',
        validUntil: 'Valid until',
        appointment: 'Appointment',
        remarks: 'Notes from the clinic',
        noProvider: 'Not specified',
        noAppointment: 'No appointment is linked to this request.',
    },

    // Written for patients, not staff — "Awaiting approval" over "Submitted".
    statusLabels: {
        submitted: 'Awaiting approval',
        approved: 'Approved',
        rejected: 'Rejected',
        expired: 'Expired',
    },

    // What the patient should do next, per state. The rejection line is the
    // one that matters: without it a rejected LOA reads as a dead end.
    statusHints: {
        submitted:
            'The clinic is verifying your coverage with your HMO. Your appointment is on hold until this is approved.',
        approved:
            'Your coverage is confirmed. Your appointment is now waiting on the doctor to confirm the schedule.',
        rejected:
            'Your appointment was cancelled because coverage could not be confirmed. You may rebook using another coverage option.',
        expired:
            'This authorization has passed its validity date and can no longer be used. Please request a new one.',
    },
} as const;

export const statusStyles: Record<
    LoaStatus,
    { color: string; bg: string; border: string }
> = {
    submitted: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    approved: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    rejected: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    expired: { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};
