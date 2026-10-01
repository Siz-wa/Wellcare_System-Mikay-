// resources/js/pages/hr/payment-verifications/payment-verifications-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and display maps for the settlement queue.
//
// The officer's actual job is not on this screen: it is in the clinic's own
// GCash Business app, its bank statement, or the cashier's OR book. This page
// hands them the reference to search for and records what they found. Every
// string is written on that assumption.

export type PaymentStatus =
    | 'pending'
    | 'submitted'
    | 'verified'
    | 'rejected'
    | 'waived';

export interface QueueAppointment {
    id: number;
    date: string | null;
    time: string | null;
    service: string;
    doctor: string | null;
    status: string;
    isToday: boolean;
}

export interface QueuePayment {
    id: number;
    reference: string;
    status: PaymentStatus;
    patient: string;
    initials: string;
    contactNumber: string | null;
    email: string | null;
    amountDue: number;
    amountPaid: number | null;
    /** Positive when the patient underpaid, negative when they overpaid. */
    shortfall: number | null;
    method: string | null;
    methodLabel: string | null;
    remittanceReference: string | null;
    submittedAt: string | null;
    submittedAgo: string | null;
    dueAt: string | null;
    dueIn: string | null;
    isOverdue: boolean;
    remarks: string | null;
    hasProof: boolean;
    proofName: string | null;
    appointment: QueueAppointment | null;
}

export interface QueueStats {
    pending: number;
    outstanding: number;
    overdue: number;
    verifiedToday: number;
    collectedToday: number;
}

/** A payment someone has already decided — the audit trail HR can look back on. */
export interface DecidedPayment {
    id: number;
    reference: string;
    patient: string;
    status: 'verified' | 'waived' | 'rejected';
    amountPaid: number | null;
    amountDue: number;
    methodLabel: string | null;
    decidedAt: string | null;
    decidedBy: string | null;
    remarks: string | null;
}

export const historyMeta = {
    title: 'Recent decisions',
    subtitle:
        'The last 50 payments confirmed, waived or sent back, newest first.',
    empty: 'No decisions yet.',
    statusLabels: {
        verified: 'Confirmed',
        waived: 'Waived',
        rejected: 'Could not match',
    } as Record<DecidedPayment['status'], string>,
    columns: [
        'Reference',
        'Patient',
        'Outcome',
        'Amount',
        'Channel',
        'Decided',
        'By',
        'Note',
    ],
};

export const queueMeta = {
    title: 'Payment Verification',
    subtitle:
        'Video consultations a patient has paid for themselves. Match each reference against the clinic’s own GCash, Maya, bank or cashier records before confirming it.',

    statsLabels: {
        pending: 'Awaiting check',
        outstanding: 'Unpaid bookings',
        overdue: 'Past deadline',
        verifiedToday: 'Confirmed today',
        collectedToday: 'Collected today',
    },

    tabs: {
        queue: 'To verify',
        outstanding: 'Unpaid',
    },

    empty: {
        queue: 'Nothing to verify. Payments a patient has declared appear here for checking.',
        outstanding:
            'No unpaid video consultations. A fee appears here as soon as a self-payer books one.',
    },

    labels: {
        reference: 'Our reference',
        remittance: 'Their reference',
        amountDue: 'Due',
        amountPaid: 'Declared',
        method: 'Channel',
        submitted: 'Submitted',
        dueBy: 'Deadline',
        consultation: 'Consultation',
        contact: 'Contact',
        proof: 'Receipt',
        remarks: 'Note',
        shortfallShort: 'Short by',
        overpaidBy: 'Over by',
        noRemittance: 'Nothing declared yet',
    },

    statusLabels: {
        pending: 'Unpaid',
        submitted: 'To verify',
        verified: 'Confirmed',
        rejected: 'Not matched',
        waived: 'Waived',
    },

    actions: {
        verify: 'Confirm payment',
        reject: 'Cannot match',
        waive: 'Waive fee',
        counter: 'Record cash at counter',
        cancel: 'Cancel',
        // The prompts. Each one names what the officer is asserting, because
        // all three write an auditable decision against a named patient.
        verifyPrompt:
            'Confirm that this amount reached the clinic. Optional note, e.g. which statement it was matched against.',
        rejectPrompt:
            'Say what could not be matched. The patient sees this and can correct their details before the deadline.',
        waivePrompt:
            'Record why this fee is not being collected. “Why was this consultation free?” is the first question an audit asks.',
        // The path that makes cash possible for a consultation nobody attends
        // in person. It confirms in one step: the person recording it took the
        // notes and issued the receipt, so there is no separate claim to check.
        counterPrompt:
            'The patient, or someone acting for them, paid cash at the branch. Enter the amount collected and the Official Receipt number. This confirms the payment immediately — you took it.',
        counterAmountLabel: 'Amount collected (₱)',
        counterReceiptLabel: 'Official Receipt number',
    },

    // Shown above the queue. The one sentence that keeps the screen honest.
    disclaimer:
        'This system does not receive money. It records what a patient says they sent and what you found when you checked.',

    readOnlyNotice:
        'You can review this queue but not decide it — confirming that money arrived belongs to HR.',
} as const;

export const statusStyles: Record<
    PaymentStatus,
    { color: string; bg: string; border: string }
> = {
    pending: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    submitted: { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    verified: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    rejected: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    waived: { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

/** ₱1,234.00 — one formatter so no two surfaces disagree about the currency. */
export function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}
