// resources/js/pages/admin/archive/archive-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and prop shapes for the Archive — Fig. 3's "Archive" use case.

export interface ArchivedAppointment {
    id: number;
    patient: string;
    email: string;
    service: string;
    doctor: string | null;
    date: string | null;
    time: string | null;
    status: string;
    reason: string | null;
    archivedAt: string | null;
}

export interface ArchivedPatient {
    id: number;
    name: string;
    email: string;
    clinicId: string | null;
    contactNumber: string | null;
    guarantor: string | null;
    archivedAt: string | null;
}

export interface ArchiveStats {
    appointments: number;
    patients: number;
}

export const archiveCopy = {
    activeNavId: 'archive',
    pageTitle: 'Archive',
    pageSubtitle:
        'Archived records are hidden from day-to-day use but never deleted. Restore anything here.',
    searchPlaceholder: 'Search archived records…',

    appointmentsTitle: 'Archived appointments',
    appointmentsEmpty: 'No archived appointments.',
    patientsTitle: 'Archived patients',
    patientsEmpty: 'No archived patients.',

    restore: 'Restore',
    restoreAppointmentConfirm:
        'Restore this appointment? It will reappear in the doctor and patient views.',
    restorePatientConfirm:
        'Restore this patient record? Their archived appointments stay archived and must be restored separately.',

    cascadeNote:
        'Restoring a patient does not restore their appointments. The two lists are independent, so a visit cancelled for its own reasons is not resurrected by mistake.',
};

export const appointmentColumns = [
    'Patient',
    'Service',
    'Doctor',
    'Scheduled',
    'Reason',
    'Archived',
    '',
];

export const patientColumns = [
    'Patient',
    'Clinic ID',
    'Contact',
    'Guarantor',
    'Archived',
    '',
];

export const archiveStatCards: {
    key: keyof ArchiveStats;
    label: string;
}[] = [
    { key: 'appointments', label: 'Archived appointments' },
    { key: 'patients', label: 'Archived patients' },
];
