// resources/js/pages/doctor/dashboard/consultations/consultations-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types, interfaces and static meta only.
// Actual consultation records come from the Inertia `consultations` prop
// served by DoctorConsultationController — NOT hardcoded here.

// ── Status ────────────────────────────────────────────────────────────────────

export type ConsultationStatus = 'finalized' | 'in-progress' | 'draft';

// ── Consultation record shape (mirrors DoctorConsultationController output) ───

export interface ConsultationRecord {
    id: number;
    patientId: string; // "C-001" formatted
    patient: string; // "First Last"
    initials: string; // "FL"
    color: string; // hex color per service
    date: string; // "24 Mar 2026"
    time: string; // "10:00 AM"
    diagnosis: string; // service label e.g. "General Consultation"
    status: ConsultationStatus;
    rawStatus: string; // actual DB value: checked_in | in_progress | completed
    consultationType: string; // in_person | virtual
    /** Server-computed: mirrors the window openVirtualRoom() will accept. */
    canStartVideo: boolean;
    /** A room is already waiting or active — the button reads "Rejoin". */
    roomIsLive: boolean;
    coverage: string;
    patientStatus: string;
    additionalInfo: string | null;
    email: string;
    contactNumber: string;
    age: number;
    gender: string;
    // ── Session data (from consultation_sessions table) ───────────────────────
    sessionId?: number | null;
    soap?: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    } | null;
    vitals?: {
        bloodPressure: string;
        heartRate: string;
        temperature: string;
        oxygenSaturation: string;
        weight: string;
        height: string;
    } | null;
    prescriptions?: { medication: string; dosage: string; duration: string }[];
    // ── Lab tests ordered during this visit (from lab_test_results) ───────────
    labs?: LabOrder[];
}

// ── Lab orders ────────────────────────────────────────────────────────────────

export type LabOrderStatus = 'requested' | 'recorded' | 'reviewed';

export interface LabOrder {
    id: string;
    testName: string;
    status: LabOrderStatus;
    severity: 'normal' | 'abnormal' | 'critical' | null;
    requestedAt: string | null;
}

/**
 * Preset panels the doctor can order. These must stay in sync with
 * LabResultSeeder::PANELS so seeded and hand-ordered tests share test names.
 */
export const labTestPresets: string[] = [
    'Complete Blood Count',
    'Lipid Profile',
    'HbA1c Test',
    'Urinalysis',
    'Thyroid Panel',
    'ECG Report',
];

export const labOrderStatusLabels: Record<LabOrderStatus, string> = {
    requested: 'Awaiting results',
    recorded: 'Ready for review',
    reviewed: 'Reviewed',
};

export const labOrderStatusColors: Record<LabOrderStatus, string> = {
    requested: 'var(--wc-gray-500)',
    recorded: 'var(--wc-blue-600)',
    reviewed: '#16a34a',
};

export const labSeverityColors: Record<string, string> = {
    normal: '#16a34a',
    abnormal: '#ca8a04',
    critical: '#dc2626',
};

export const labOrdersCopy = {
    existingTitle: 'Tests ordered this visit',
    emptyMessage: 'No lab tests ordered yet for this visit.',
    requestTitle: 'Request a test',
    presetLabel: 'Test',
    customOption: 'Other (type below)…',
    customPlaceholder: 'Name the test you are requesting',
    submitLabel: 'Request Test',
    submittingLabel: 'Requesting…',
    successHint: 'The lab team has been notified.',
    // Shown when the editor was opened via "Start New Session": a lab test hangs
    // off an appointment, so there is nothing to attach it to yet.
    noAppointment:
        'Lab tests are ordered against a booked appointment. Open this session from the consultation list to request one.',
};

// ── SOAP notes ────────────────────────────────────────────────────────────────

export interface SoapFields {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

export const emptySoap: SoapFields = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
};

export interface SoapField {
    key: keyof SoapFields;
    label: string;
    placeholder: string;
    dotColor: string;
}

export const soapFields: SoapField[] = [
    {
        key: 'subjective',
        label: 'SUBJECTIVE',
        placeholder: "Patient's reported symptoms and history…",
        dotColor: 'var(--wc-sky-500)',
    },
    {
        key: 'objective',
        label: 'OBJECTIVE',
        placeholder: 'Physical exam findings and test results…',
        dotColor: '#16a34a',
    },
    {
        key: 'assessment',
        label: 'ASSESSMENT',
        placeholder: 'Diagnosis and clinical reasoning…',
        dotColor: 'var(--wc-blue-600)',
    },
    {
        key: 'plan',
        label: 'PLAN',
        placeholder: 'Treatment plan and follow-up steps…',
        dotColor: '#ca8a04',
    },
];

// ── Vitals ────────────────────────────────────────────────────────────────────

export interface VitalsFields {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
}

export const defaultVitals: VitalsFields = {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
};

export interface VitalField {
    key: keyof VitalsFields;
    label: string;
    unit: string;
    placeholder: string;
}

export const vitalFields: VitalField[] = [
    {
        key: 'bloodPressure',
        label: 'Blood Pressure',
        unit: 'MMHG',
        placeholder: '120/80',
    },
    { key: 'heartRate', label: 'Heart Rate', unit: 'BPM', placeholder: '72' },
    {
        key: 'temperature',
        label: 'Temperature',
        unit: '°C',
        placeholder: '36.5',
    },
    {
        key: 'oxygenSaturation',
        label: 'Oxygen Saturation',
        unit: '%',
        placeholder: '98',
    },
    { key: 'weight', label: 'Weight', unit: 'KG', placeholder: '70' },
    { key: 'height', label: 'Height', unit: 'CM', placeholder: '175' },
];

// ── Prescription / medications ────────────────────────────────────────────────

export interface Medication {
    id: string;
    name: string;
    instructions: string;
}

export const defaultMedications: Medication[] = [];

// ── Session editor tabs ───────────────────────────────────────────────────────

export type SessionTab = 'soap' | 'vitals' | 'labs';

export interface TabItem {
    key: SessionTab;
    label: string;
    iconKey: 'soap' | 'vitals' | 'labs';
}

export const sessionTabs: TabItem[] = [
    { key: 'soap', label: 'Soap Notes', iconKey: 'soap' },
    { key: 'vitals', label: 'Patient Vitals', iconKey: 'vitals' },
    { key: 'labs', label: 'Lab Tests', iconKey: 'labs' },
];

// ── Filters ───────────────────────────────────────────────────────────────────

export interface ConsultationFilters {
    search: string;
    status: string;
}

// ── Page meta ─────────────────────────────────────────────────────────────────

export const consultationsMeta = {
    pageTitle: 'Consultations',
    pageSubtitle: 'Conduct and manage clinical consultation sessions',
    startSessionLabel: 'Start New Session',
    searchPlaceholder: 'Search by patient or diagnosis…',
    filtersLabel: 'Filters',
    recentTitle: 'Recent Consultations',
    viewAll: 'VIEW ALL',
    colPatient: 'PATIENT',
    colDateTime: 'DATE / TIME',
    colDiagnosis: 'DIAGNOSIS',
    colStatus: 'STATUS',
    colActions: 'ACTIONS',
    viewSummaryLabel: 'VIEW SUMMARY',
    editorTitle: 'Consultation Session',
    editorPatientLabel: 'PATIENT:',
    editorPatientEmpty: 'SELECT PATIENT',
    pastHistoryLabel: 'PAST HISTORY',
    autoSaveLabel: 'AUTO-SAVING SESSION…',
    discardLabel: 'Discard',
    finalizeLabel: 'Finalize Consultation',
    medicationListTitle: 'Medication List',
    addMedicineLabel: '+ ADD MEDICINE',
    newMedNamePlaceholder: 'Medicine name & dosage',
    newMedInstrPlaceholder: 'Instructions (e.g. Twice daily • 7 Days)',
    emptyState: 'No consultations found.',
    emptyStateFiltered: 'No consultations match your search.',
};
