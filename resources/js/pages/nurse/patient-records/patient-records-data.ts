// resources/js/pages/nurse/patient-records/patient-records-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content and types for the nurse patient-record screens.
//
// The shapes mirror App\Concerns\ReadsPatientRecords, which is shared with the
// doctor's record screens — a record reads identically for both roles. What
// differs is what the nurse may write; see Nurse\PatientRecordController.

// ── Server-provided shapes ────────────────────────────────────────────────────

export interface PatientSummary {
    id: number;
    patientId: string;
    name: string;
    initials: string;
    email: string | null;
    lastUpdate: string;
    docCount: number;
    appointmentCount: number;
    hasAllergy: boolean;
    activeDiagnoses: number;
    status: string;
    allergySummary: string | null;
}

export interface PaginatedPatients {
    data: PatientSummary[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface PatientProfile {
    firstName: string;
    lastName: string;
    birthdate: string | null;
    gender: string | null;
    address: string | null;
    contactNumber: string | null;
    civilStatus: string | null;
    clientNumber: string | null;
    email: string | null;
}

export interface Allergy {
    id: number;
    allergen: string;
    severity: 'mild' | 'moderate' | 'severe';
    reaction: string | null;
    notes: string | null;
}

export interface Diagnosis {
    id: number;
    icdCode: string | null;
    diagnosis: string;
    type: string;
    status: string;
    diagnosedAt: string;
    notes: string | null;
}

export interface PatientDocument {
    id: number;
    title: string;
    type: string;
    fileName: string;
    size: string;
    uploadedAt: string;
    downloadUrl: string;
}

export interface Vitals {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
}

export interface Visit {
    id: number;
    date: string;
    service: string;
    soap: { assessment: string; plan: string } | null;
    vitals: Vitals | null;
    prescriptions: { name: string; instructions: string | null }[];
}

// ── Form drafts ───────────────────────────────────────────────────────────────

export interface AllergyDraft {
    [key: string]: string;
    allergen: string;
    severity: string;
    reaction: string;
    notes: string;
}

export const emptyAllergy: AllergyDraft = {
    allergen: '',
    severity: 'mild',
    reaction: '',
    notes: '',
};

export const severityOptions = [
    { value: 'mild', label: 'Mild', color: '#16a34a' },
    { value: 'moderate', label: 'Moderate', color: '#ca8a04' },
    { value: 'severe', label: 'Severe', color: '#dc2626' },
];

export const severityColors: Record<string, string> = {
    mild: '#16a34a',
    moderate: '#ca8a04',
    severe: '#dc2626',
};

export const documentTypes = [
    { value: 'lab', label: 'Laboratory' },
    { value: 'imaging', label: 'Imaging' },
    { value: 'referral', label: 'Referral' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'report', label: 'Report' },
    { value: 'other', label: 'Other' },
];

// Values must match the `patients.gender` enum, which is
// enum('male','female','other') — not the 'M'/'F' pair the user profile
// tables use.
export const genderOptions = [
    { value: '', label: 'Not stated' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

export const civilStatusOptions = [
    { value: '', label: 'Not stated' },
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'widowed', label: 'Widowed' },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const nursePatientRecordsMeta = {
    pageTitle: 'Patient Records',
    pageSubtitle: 'Look up a record, encode intake data and upload documents',

    searchPlaceholder: 'Search by name, email or clinic ID…',
    listCardTitle: 'All Patients',
    empty: 'No patients found.',
    recordsSuffix: 'records',

    columns: {
        patient: 'Patient',
        clinicId: 'Clinic ID',
        visits: 'Visits',
        documents: 'Docs',
        lastUpdate: 'Last visit',
    },

    allergyBadge: 'Allergy',

    // Detail page
    backLabel: '← Back to patient records',

    profileTitle: 'Patient Details',
    profileEditLabel: 'Edit details',
    profileCancelLabel: 'Cancel',
    profileSaveLabel: 'Save changes',
    profileSavingLabel: 'Saving…',
    profileFields: {
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email',
        contactNumber: 'Contact number',
        birthdate: 'Birthdate',
        gender: 'Gender',
        civilStatus: 'Civil status',
        address: 'Address',
        clientNumber: 'Clinic ID',
    },
    coverageNote:
        'Insurance and coverage details are managed by HR on the LOA screens.',

    vitalsTitle: 'Latest Vitals',
    vitalsEmpty: 'No vitals recorded yet.',
    vitalsLabels: {
        bloodPressure: 'Blood pressure',
        heartRate: 'Heart rate',
        temperature: 'Temperature',
        oxygenSaturation: 'O₂ saturation',
        weight: 'Weight',
        height: 'Height',
    },

    allergiesTitle: 'Allergies',
    allergiesEmpty: 'No allergies recorded.',
    allergyAddLabel: '+ Record allergy',
    allergyRemoveLabel: 'Remove',
    allergyFields: {
        allergen: 'Allergen',
        severity: 'Severity',
        reaction: 'Reaction',
        notes: 'Notes',
    },
    allergyPlaceholders: {
        allergen: 'Penicillin, Shellfish…',
        reaction: 'Rash, anaphylaxis…',
        notes: 'Anything the doctor should know…',
    },
    allergySaveLabel: 'Save allergy',
    allergySavingLabel: 'Saving…',
    allergyCancelLabel: 'Cancel',

    diagnosesTitle: 'Diagnoses',
    diagnosesEmpty: 'No diagnoses recorded.',
    // The nurse reads diagnoses but never writes them — there is no diagnosis
    // route in the nurse group. Stated in the UI so the boundary is visible
    // rather than looking like a missing button.
    diagnosesReadOnlyNote:
        'Read-only. Diagnoses are recorded by the attending doctor.',

    documentsTitle: 'Documents',
    documentsEmpty: 'No documents uploaded.',
    documentUploadLabel: '+ Upload document',
    documentFields: {
        title: 'Title',
        type: 'Type',
        file: 'File',
    },
    documentTitlePlaceholder: 'CBC result, referral letter…',
    documentHint: 'PDF, image or Word document, up to 20 MB.',
    documentSaveLabel: 'Upload',
    documentSavingLabel: 'Uploading…',
    documentCancelLabel: 'Cancel',
    documentDownloadLabel: 'Download',

    visitsTitle: 'Visit History',
    visitsEmpty: 'No completed visits yet.',
    visitAssessmentLabel: 'Assessment',
    visitPlanLabel: 'Plan',
    visitPrescriptionsLabel: 'Prescriptions',

    // Must match NavItem.id in nurse-dashboard-data.ts
    activeNavId: 'patient-records',
};
