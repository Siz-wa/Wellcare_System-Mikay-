// resources/js/pages/nurse/dashboard/dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content and types for the Staff Nurse dashboard.

import type { AppointmentStatus } from '@/pages/nurse/components/appointment-status-data';

// ── Server-provided shapes ────────────────────────────────────────────────────

export interface NurseDashboardStats {
    pendingLabs: number;
    recordedToday: number;
    criticalToday: number;
    appointmentsToday: number;
    checkedInToday: number;
    completedToday: number;
    pendingLoa: number;
    totalPatients: number;
}

export interface UpcomingAppointment {
    id: number;
    patient: string;
    initials: string;
    service: string;
    time: string;
    status: AppointmentStatus;
    doctor: string | null;
}

// ── Page meta ─────────────────────────────────────────────────────────────────

export const nurseDashboardPageMeta = {
    pageTitle: 'Dashboard',
    pageSubtitle: 'Today at a glance — the lab queue, the day list and LOA',

    statLabels: {
        pendingLabs: 'AWAITING RESULTS',
        criticalToday: 'CRITICAL TODAY',
        appointmentsToday: 'APPOINTMENTS TODAY',
        checkedInToday: 'CHECKED IN',
        completedToday: 'COMPLETED',
        recordedToday: 'RECORDED TODAY',
        pendingLoa: 'LOA AWAITING HR',
        totalPatients: 'PATIENT RECORDS',
    },

    upcomingTitle: "Today's Schedule",
    upcomingEmpty: 'No appointments booked for today.',
    upcomingViewAll: 'View all →',

    quickLinksTitle: 'Jump to',
    quickLinks: [
        {
            id: 'lab-queue',
            label: 'Lab Queue',
            description: 'Encode results the doctors have ordered',
            href: '/nurse/lab-queue',
        },
        {
            id: 'patient-records',
            label: 'Patient Records',
            description: 'Look up a record, encode intake data',
            href: '/nurse/patient-records',
        },
        {
            id: 'appointments',
            label: "Today's Appointments",
            description: 'Monitor the day list and check-in status',
            href: '/nurse/appointments',
        },
        {
            id: 'loa-monitoring',
            label: 'LOA Monitoring',
            description: 'HMO coverage status, read-only',
            href: '/nurse/loa-monitoring',
        },
    ],

    // Must match NavItem.id in nurse-dashboard-data.ts
    activeNavId: 'dashboard',
};
