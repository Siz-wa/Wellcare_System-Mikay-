// resources/js/pages/nurse/appointments/appointments-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content and types for the nurse's daily appointment monitor.

import type { AppointmentStatus } from '@/pages/nurse/components/appointment-status-data';

// ── Server-provided shapes ────────────────────────────────────────────────────

export interface MonitoredAppointment {
    id: number;
    patient: string;
    initials: string;
    patientId: string | null;
    recordUrl: string | null;
    service: string;
    time: string;
    status: AppointmentStatus;
    coverage: string | null;
    doctor: string | null;
    contactNumber: string | null;
}

export interface AppointmentMonitorStats {
    total: number;
    checkedIn: number;
    inProgress: number;
    completed: number;
    cancelled: number;
}

// ── Page meta ─────────────────────────────────────────────────────────────────

export const appointmentMonitorMeta = {
    pageTitle: 'Appointments',
    pageSubtitle: 'Monitor the day list, check-in status and coverage',

    statLabels: {
        total: 'ACTIVE TODAY',
        checkedIn: 'CHECKED IN',
        inProgress: 'IN PROGRESS',
        completed: 'COMPLETED',
        cancelled: 'CANCELLED / NO SHOW',
    },

    dateLabel: 'Showing',
    todayLabel: 'Today',
    jumpToTodayLabel: 'Back to today',

    tableTitle: 'Appointment List',
    empty: 'No appointments booked for this date.',

    columns: {
        patient: 'Patient',
        service: 'Service',
        time: 'Time',
        doctor: 'Doctor',
        coverage: 'Coverage',
        status: 'Status',
    },

    viewRecordLabel: 'View record',
    noRecordLabel: 'No linked record',

    // Read-only notice — the nurse observes; doctors confirm, patients check in.
    readOnlyNote:
        'This view is read-only. Doctors confirm appointments and patients check themselves in.',

    // Must match NavItem.id in nurse-dashboard-data.ts
    activeNavId: 'appointments',
};
