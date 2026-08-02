// resources/js/pages/admin/patients/patients-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and prop shapes for Manage Patients — Fig. 3's "Manage Patient" oval.
//
// Scope note worth keeping visible: this screen is demographic and
// administrative only. Allergies, diagnoses, lab results and consultation
// notes belong to the doctor's records screen, behind role:doctor.

export interface AdminPatientRow {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    initials: string;
    clinicId: string | null;
    email: string;
    contactNumber: string;
    age: number | null;
    gender: string | null;
    birthdate: string | null;
    address: string | null;
    civilStatus: string | null;
    company: string | null;
    coverage: string | null;
    hmoProvider: string | null;
    guarantor: string | null;
    appointmentCount: number;
}

export interface PatientStats {
    total: number;
    withGuarantor: number;
    hmo: number;
    archived: number;
}

export interface PatientFilters {
    search: string;
    coverage: string;
}

export const patientsCopy = {
    activeNavId: 'patients',
    pageTitle: 'Manage Patients',
    pageSubtitle:
        'Contact details, coverage and guarantor links. Clinical records stay with the doctor.',
    searchPlaceholder: 'Search by name, email, contact or clinic ID…',
    tableEmpty: 'No patients match these filters.',
    allCoverage: 'All coverage types',

    editTitle: 'Edit patient details',
    editSubmit: 'Save changes',
    cancel: 'Cancel',

    clinicalNote:
        'Allergies, diagnoses, lab results and consultation notes are not editable here — they belong to the attending doctor.',
};

export const patientColumns = [
    'Patient',
    'Clinic ID',
    'Contact',
    'Coverage',
    'Guarantor',
    'Visits',
    '',
];

export const coverageOptions = [
    { value: '', label: 'Not set' },
    { value: 'cash', label: 'Cash / Self-pay' },
    { value: 'hmo', label: 'HMO' },
    { value: 'philhealth', label: 'PhilHealth' },
    { value: 'corporate', label: 'Corporate' },
];

export const genderOptions = [
    { value: '', label: 'Not specified' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

export const civilStatusOptions = [
    { value: '', label: 'Not specified' },
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'widowed', label: 'Widowed' },
];

export const patientStatCards: {
    key: keyof PatientStats;
    label: string;
}[] = [
    { key: 'total', label: 'Patient records' },
    { key: 'withGuarantor', label: 'Linked to an account' },
    { key: 'hmo', label: 'HMO coverage' },
    { key: 'archived', label: 'Archived' },
];
