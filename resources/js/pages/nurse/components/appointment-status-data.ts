// resources/js/pages/nurse/components/appointment-status-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Appointment status vocabulary for the nurse portal.
//
// Mirrors the MySQL enum on `appointments.status` — see the state machine in
// CLAUDE.md. Adding a state there means adding it here.

export type AppointmentStatus =
    | 'pending_hmo_approval'
    | 'requested'
    | 'confirmed'
    | 'checked_in'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show';

export const statusStyles: Record<
    AppointmentStatus,
    { label: string; color: string; bg: string }
> = {
    pending_hmo_approval: {
        label: 'Awaiting LOA',
        color: '#a16207',
        bg: '#fefce8',
    },
    requested: { label: 'Requested', color: '#475569', bg: '#f1f5f9' },
    confirmed: { label: 'Confirmed', color: '#0056b3', bg: '#eff6ff' },
    checked_in: { label: 'Checked in', color: '#7c3aed', bg: '#f5f3ff' },
    in_progress: { label: 'In progress', color: '#c2410c', bg: '#fff7ed' },
    completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
    cancelled: { label: 'Cancelled', color: '#dc2626', bg: '#fef2f2' },
    no_show: { label: 'No show', color: '#dc2626', bg: '#fef2f2' },
};
