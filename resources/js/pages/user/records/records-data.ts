// resources/js/pages/user/records/records-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All copy, labels and empty states for the patient-facing medical record.
// Nothing in this feature hardcodes text in JSX.

import type { VitalsSource } from '@/lib/vitals';

export type AllergySeverity = 'mild' | 'moderate' | 'severe';
export type DiagnosisStatus = 'active' | 'resolved' | 'chronic';
export type DocumentType =
    | 'lab'
    | 'imaging'
    | 'referral'
    | 'prescription'
    | 'report'
    | 'other';

export interface PatientCard {
    id: number;
    name: string;
    initials: string;
    clinicId: string | null;
    age: number | null;
    gender: string | null;
    documentCount: number;
    appointmentCount: number;
    hasAllergy: boolean;
    allergySummary: string | null;
    activeDiagnoses: number;
}

export interface Profile {
    firstName: string;
    lastName: string;
    birthdate: string | null;
    age: number | null;
    gender: string | null;
    address: string | null;
    contactNumber: string | null;
    civilStatus: string | null;
    clinicId: string | null;
    email: string | null;
    hmoProvider: string | null;
}

export interface Allergy {
    id: number;
    allergen: string;
    severity: AllergySeverity;
    reaction: string | null;
    notes: string | null;
}

export interface Diagnosis {
    id: number;
    icdCode: string | null;
    diagnosis: string;
    type: 'primary' | 'secondary' | 'chronic';
    status: DiagnosisStatus;
    diagnosedAt: string;
    notes: string | null;
}

export interface RecordDocument {
    id: number;
    title: string;
    type: DocumentType;
    fileName: string;
    size: string;
    uploadedAt: string;
    downloadUrl: string;
}

export interface Vitals {
    bloodPressure: string | null;
    heartRate: string | null;
    temperature: string | null;
    oxygenSaturation: string | null;
    weight: string | null;
    height: string | null;
    source: VitalsSource | null;
    /** Null only for rows written before provenance was recorded. */
    sourceLabel: string | null;
}

export interface Prescription {
    name: string;
    instructions: string;
}

export interface Visit {
    id: number;
    date: string;
    time: string;
    service: string;
    doctor: string | null;
    assessment: string | null;
    plan: string | null;
    vitals: Vitals | null;
    prescriptions: Prescription[];
}

// ── Copy ──────────────────────────────────────────────────────────────────────

/**
 * One recorded access to this record by clinic staff.
 *
 * Roles, never names: the patient is owed "a nurse opened your chart on
 * 3 March", and naming individual staff to patients creates a problem of its
 * own. See PatientRecordController::staffAccessLog().
 */
export interface AccessLogEntry {
    id: number;
    role: string;
    action: 'viewed' | 'downloaded' | 'exported' | 'searched';
    at: string | null;
}

export const accessActionLabels: Record<AccessLogEntry['action'], string> = {
    viewed: 'Opened your record',
    downloaded: 'Downloaded a document',
    exported: 'Exported record data',
    searched: 'Searched the patient list',
};

export const recordsMeta = {
    indexTitle: 'My Medical Records',
    indexSubtitle:
        'Records held at WellCare Clinics & Laboratory for everyone booked under your account.',

    detailBackLabel: 'Back to my records',

    emptyPatients: {
        title: 'No records yet',
        body: 'Your medical record is created the first time you complete an appointment. Book a consultation to get started.',
        cta: 'Book an appointment',
        ctaHref: '/book',
    },

    sections: {
        profile: 'Personal information',
        allergies: 'Allergies',
        diagnoses: 'Diagnosis history',
        documents: 'Documents',
        visits: 'Past consultations',
        accessLog: 'Who has viewed this record',
    },

    empty: {
        allergies: 'No allergies have been recorded.',
        diagnoses: 'No diagnoses have been recorded yet.',
        documents: 'No documents have been uploaded to your record.',
        visits: 'You have no completed consultations yet.',
        accessLog:
            'No clinic staff have opened this record yet. Access by a doctor or nurse will appear here.',
    },

    labels: {
        clinicId: 'Clinic ID',
        birthdate: 'Date of birth',
        age: 'Age',
        gender: 'Sex',
        civilStatus: 'Civil status',
        contactNumber: 'Contact number',
        email: 'Email',
        address: 'Address',
        hmoProvider: 'HMO provider',
        diagnosedOn: 'Diagnosed',
        icdCode: 'ICD',
        reaction: 'Reaction',
        seenBy: 'Seen by',
        assessment: 'Assessment',
        plan: 'Plan',
        prescriptions: 'Prescriptions',
        vitals: 'Vitals',
        download: 'Download',
        documents: 'documents',
        visits: 'visits',
        activeDiagnoses: 'active diagnoses',
    },

    vitalLabels: {
        bloodPressure: 'Blood pressure',
        heartRate: 'Heart rate',
        temperature: 'Temperature',
        oxygenSaturation: 'O₂ saturation',
        weight: 'Weight',
        height: 'Height',
    },

    // Records are written by clinical staff; the portal is read-only. Saying so
    // pre-empts "why can't I edit this?" support questions.
    readOnlyNotice:
        'Your medical record is maintained by your care team. To correct anything shown here, please raise it at your next visit.',
} as const;

export const severityStyles: Record<
    AllergySeverity,
    { label: string; color: string; bg: string; border: string }
> = {
    severe: {
        label: 'Severe',
        color: '#b91c1c',
        bg: '#fef2f2',
        border: '#fecaca',
    },
    moderate: {
        label: 'Moderate',
        color: '#b45309',
        bg: '#fffbeb',
        border: '#fde68a',
    },
    mild: { label: 'Mild', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
};

export const diagnosisStatusStyles: Record<
    DiagnosisStatus,
    { label: string; color: string; bg: string }
> = {
    active: { label: 'Active', color: '#b45309', bg: '#fffbeb' },
    chronic: { label: 'Chronic', color: '#7c3aed', bg: '#f5f3ff' },
    resolved: { label: 'Resolved', color: '#15803d', bg: '#f0fdf4' },
};

export const documentTypeLabels: Record<DocumentType, string> = {
    lab: 'Lab result',
    imaging: 'Imaging',
    referral: 'Referral',
    prescription: 'Prescription',
    report: 'Report',
    other: 'Other',
};
