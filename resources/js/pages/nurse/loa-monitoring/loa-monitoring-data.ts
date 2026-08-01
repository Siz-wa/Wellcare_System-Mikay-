// resources/js/pages/nurse/loa-monitoring/loa-monitoring-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and display maps for the Staff Nurse LOA monitor.
// Figure 10's `tb5 LOA Monitoring` process — read-only; HR owns the decision.

export type LoaStatus = 'submitted' | 'approved' | 'rejected' | 'expired';

export interface LoaMonitorItem {
    id: string;
    loaNumber: string;
    name: string;
    initials: string;
    patientId: string;
    hmoProvider: string;
    hmoId: string;
    status: LoaStatus;
    service: string;
    appointmentDate: string;
    requestedAt: string | null;
    timeAgo: string;
    validUntil: string | null;
    remarks: string | null;
}

export interface LoaMonitorStats {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
}

export const loaMonitoringMeta = {
    activeNavId: 'loa-monitoring',

    pageTitle: 'LOA Monitoring',
    pageSubtitle:
        'Coverage status for patients booked under an HMO. Approvals are handled by HR — this view is read-only.',

    statsLabels: {
        pending: 'AWAITING APPROVAL',
        approvedToday: 'APPROVED TODAY',
        rejectedToday: 'REJECTED TODAY',
    },

    pendingCardTitle: 'Awaiting HMO approval',
    recentCardTitle: 'Recently decided',

    emptyPending: 'No LOA requests are waiting on approval.',
    emptyRecent: 'No LOA requests have been decided yet.',

    statusLabels: {
        submitted: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        expired: 'Expired',
    },

    labels: {
        validUntil: 'Valid until',
        requested: 'Requested',
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
