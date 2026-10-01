// resources/js/pages/user/payments/payments-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and display maps for the patient-facing settlement page.
//
// A video consultation is the one visit with no cashier between the patient and
// the doctor, so the clinic has to be paid before the room opens. Every string
// here is written for someone who has just been told that and is holding a
// phone — the instructions are the product, not decoration around it.

export type PaymentStatus =
    | 'pending'
    | 'submitted'
    | 'verified'
    | 'rejected'
    | 'waived';

export type PaymentMethod = 'otc_cash' | 'gcash' | 'maya' | 'bank_transfer';

export interface PaymentAppointment {
    id: number;
    date: string | null;
    time: string | null;
    service: string;
    doctor: string | null;
    status: string;
}

export interface PaymentRecord {
    id: number;
    reference: string;
    status: PaymentStatus;
    patientName: string;
    patientInitials: string;
    amountDue: number;
    amountPaid: number | null;
    method: PaymentMethod | null;
    methodLabel: string | null;
    dueAt: string | null;
    dueIn: string | null;
    isOverdue: boolean;
    submittedAt: string | null;
    decidedAt: string | null;
    remarks: string | null;
    hasProof: boolean;
    proofName: string | null;
    appointment: PaymentAppointment | null;
}

/** One of the clinic's own accounts, as published by config/payments.php. */
export interface PaymentChannel {
    value: PaymentMethod;
    label: string;
    instructions: string;
    accountName: string | null;
    accountNumber: string | null;
}

export interface PaymentStats {
    total: number;
    owed: number;
    checking: number;
    settled: number;
}

export const paymentsMeta = {
    title: 'Payments',
    subtitle:
        'Settle the fee for a video consultation. In-person visits are paid at the clinic cashier as usual — only video consultations are listed here.',

    statsLabels: {
        total: 'Total',
        owed: 'To pay',
        checking: 'Being checked',
        settled: 'Settled',
    },

    empty: {
        title: 'Nothing to pay',
        // A patient who only ever visits in person should not think this is
        // broken, and neither should one whose HMO covers everything.
        body: 'A fee appears here when you book a video consultation and pay for it yourself. Visits covered by an HMO, PhilHealth or a company account are settled by your coverage, and in-person visits are paid at the clinic cashier.',
    },

    labels: {
        reference: 'Payment reference',
        amountDue: 'Amount due',
        amountPaid: 'You sent',
        method: 'Paid via',
        dueBy: 'Pay before',
        submitted: 'Submitted',
        decided: 'Confirmed',
        appointment: 'Consultation',
        remarks: 'Note from the clinic',
        proof: 'Your receipt',
        noAppointment: 'No consultation is linked to this payment.',
    },

    // Written for patients, not bookkeepers.
    statusLabels: {
        pending: 'To pay',
        submitted: 'Being checked',
        verified: 'Paid',
        rejected: 'Not matched',
        waived: 'Waived',
    },

    // What happens next, per state. The `pending` and `rejected` lines are the
    // ones that matter: both end in a cancelled appointment if ignored.
    statusHints: {
        pending:
            'Pay the amount below, then tell us the reference number from your receipt. Your video room will not open until the clinic confirms it, and the booking is released if the deadline passes unpaid.',
        submitted:
            'The clinic is checking your payment against its own records. Nothing more is needed from you.',
        verified:
            'Payment confirmed. Your video room will open at your scheduled time.',
        rejected:
            'The clinic could not match the details you sent. Check your receipt and submit again before the deadline, or the booking will be released.',
        waived: 'The clinic has waived this fee. Your consultation will go ahead with nothing to pay.',
    },

    // The settlement form.
    form: {
        heading: 'Tell us about your payment',
        // The sentence that makes the whole design honest: the app is not
        // taking the money and should not imply that it is.
        preamble:
            'Send the money through one of the channels below, or pay at the Dasmariñas branch cashier. Then enter the reference number here so the clinic can match it.',
        methodLabel: 'How did you pay?',
        amountLabel: 'Amount sent (₱)',
        referenceLabel: 'Reference / OR number',
        referenceHint:
            'The number printed on your GCash, Maya or bank receipt — or the OR number from the clinic cashier.',
        proofLabel: 'Screenshot or photo of the receipt (optional)',
        proofHint: 'JPG, PNG, WEBP or PDF, up to 5 MB.',
        submit: 'Submit payment details',
        submitting: 'Submitting…',
        resubmit: 'Submit corrected details',
        accountName: 'Account name',
        accountNumber: 'Send to',
        payAtDesk: 'No account number needed',
    },

    overdueNotice:
        'This payment is past its deadline. The booking may be released at any time — settle it now or book again.',
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
