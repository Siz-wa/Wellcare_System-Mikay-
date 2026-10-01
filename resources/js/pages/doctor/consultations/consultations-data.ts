// resources/js/pages/doctor/dashboard/consultations/consultations-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types, interfaces and static meta only.
// Actual consultation records come from the Inertia `consultations` prop
// served by DoctorConsultationController — NOT hardcoded here.

import type { VitalMeasurementKey, VitalsSource } from '@/lib/vitals';

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
    /** The doctor's written assessment, once there is one. */
    assessment?: string | null;
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
    /** The Patient record's id — what visit history is keyed on. */
    patientRecordId: number | null;
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
    /**
     * Height and weight the patient gave at registration. Reference only — it
     * is self-reported and possibly years old, so it is displayed beside the
     * vitals form and never loaded into it.
     */
    baseline?: {
        height: string | null;
        weight: string | null;
        source: string;
    } | null;
    vitals?: {
        bloodPressure: string;
        heartRate: string;
        temperature: string;
        oxygenSaturation: string;
        weight: string;
        height: string;
        source: VitalsSource;
        /** Null only for rows written before provenance was recorded. */
        sourceLabel: string | null;
    } | null;
    prescriptions?: Medication[];
    /** The chart's allergy list, shown beside the prescription form. */
    allergies?: RecordedAllergy[];
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
    /**
     * Where the six above came from. Part of the same form because it is part
     * of the same clinical claim — see `@/lib/vitals`.
     */
    source: VitalsSource;
}

export const defaultVitals: VitalsFields = {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    // Overwritten from the server's `vitals.source` as soon as a session loads;
    // this is only the shape for a form that has not been filled from one yet.
    source: 'clinic_measured',
};

/**
 * `VitalMeasurementKey`, not `keyof VitalsFields`: the six-field grid renders
 * text inputs with units, and `source` is a select over a closed vocabulary.
 * Typing the key this way makes it impossible to add it to `vitalFields` and
 * get a free-text provenance box.
 */
/**
 * What kind of value a measurement holds.
 *
 * Declared here rather than as a sanitizer function so this file stays the
 * declarative table it is meant to be; patient-vitals.tsx maps each shape to
 * the sanitizer that enforces it. Every one of these six was a plain text box
 * with a `string|max:10` rule behind it, which made `abcdefghij` a storable
 * heart rate in the clinical record.
 */
export type VitalValueShape = 'integer' | 'decimal' | 'blood-pressure';

export interface VitalField {
    key: VitalMeasurementKey;
    label: string;
    unit: string;
    placeholder: string;
    shape: VitalValueShape;
    /**
     * The plausible range, shown under the field.
     *
     * A hint, not a gate: a reading outside it is far more likely to be a
     * typo than a genuine finding, but a genuine one still has to be
     * recordable — the server bounds are deliberately wider than these.
     */
    range: string;
}

export const vitalFields: VitalField[] = [
    {
        key: 'bloodPressure',
        label: 'Blood Pressure',
        unit: 'MMHG',
        placeholder: '120/80',
        shape: 'blood-pressure',
        range: 'systolic / diastolic',
    },
    {
        key: 'heartRate',
        label: 'Heart Rate',
        unit: 'BPM',
        placeholder: '72',
        shape: 'integer',
        range: '40–180',
    },
    {
        key: 'temperature',
        label: 'Temperature',
        unit: '°C',
        placeholder: '36.5',
        shape: 'decimal',
        range: '34–42',
    },
    {
        key: 'oxygenSaturation',
        label: 'Oxygen Saturation',
        unit: '%',
        placeholder: '98',
        shape: 'integer',
        range: '70–100',
    },
    {
        key: 'weight',
        label: 'Weight',
        unit: 'KG',
        placeholder: '70',
        shape: 'decimal',
        range: '1–300',
    },
    {
        key: 'height',
        label: 'Height',
        unit: 'CM',
        placeholder: '175',
        shape: 'decimal',
        range: '30–250',
    },
];

// ── Prescription / medications ────────────────────────────────────────────────

export interface Medication {
    id: string;
    name: string;
    instructions: string;
}

/** One allergy already on the patient's chart. */
export interface RecordedAllergy {
    allergen: string;
    severity: 'mild' | 'moderate' | 'severe';
    reaction: string | null;
}

/**
 * A conflict the server found between a prescription and the chart.
 *
 * `match` grades how sure it is: a direct name match, the same ingredient
 * family, or a partial cross-reactivity worth mentioning but not equivalent to
 * a contraindication.
 */
export interface AllergyConflict {
    name: string;
    conflicts: {
        allergen: string;
        severity: 'mild' | 'moderate' | 'severe';
        reaction: string | null;
        match: 'direct' | 'family' | 'cross_reactive';
        family: string | null;
    }[];
}

export const defaultMedications: Medication[] = [];

// ── Session editor tabs ───────────────────────────────────────────────────────

export type SessionTab = 'soap' | 'vitals' | 'labs' | 'meds';

export interface TabItem {
    key: SessionTab;
    label: string;
    iconKey: 'soap' | 'vitals' | 'labs' | 'meds';
}

export const sessionTabs: TabItem[] = [
    { key: 'soap', label: 'Soap Notes', iconKey: 'soap' },
    { key: 'vitals', label: 'Patient Vitals', iconKey: 'vitals' },
    { key: 'meds', label: 'Prescription', iconKey: 'meds' },
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
    /*
     * Replaces a "Start New Session" button that could not start anything.
     *
     * It opened the session editor with no appointment behind it, and the
     * editor's Save Draft and Finalize are both disabled without one — so the
     * doctor got a full clinical form, typed into it, and had no way to save
     * a word of it. There is no way for that button to work, either: a
     * consultation is documented against a booked appointment (patient,
     * coverage, allergies, lab orders all hang off it), and the doctor is not
     * the one who books.
     *
     * The visit arrives here on its own — the patient checks in from their
     * dashboard on the day, which flips the appointment to `checked_in` and
     * notifies the doctor. This line says so, where the button used to be.
     */
    sessionOriginNote:
        'Consultations appear here when a patient checks in for their appointment. Open the visit below to document it.',
    searchPlaceholder: 'Search by patient or diagnosis…',
    filtersLabel: 'Filters',
    recentTitle: 'Recent Consultations',
    viewAll: 'VIEW ALL',
    colPatient: 'PATIENT',
    colDateTime: 'DATE / TIME',
    colDiagnosis: 'SERVICE · ASSESSMENT',
    colStatus: 'STATUS',
    colActions: 'ACTIONS',
    viewSummaryLabel: 'VIEW SUMMARY',
    /**
     * The vitals provenance control. See `@/lib/vitals` for why the record has
     * to carry this rather than six bare numbers.
     */
    vitalsSourceLabel: 'How were these obtained?',
    vitalsSourceNote:
        'Readings the patient gives you over a call are patient-reported, not clinic measurements. The record shows this alongside the numbers.',
    vitalsNotObtainedNote:
        'Marked as not obtained, so the fields are closed. This is recorded as a deliberate absence rather than an unfilled form.',
    editorTitle: 'Consultation Session',
    editorPatientLabel: 'PATIENT:',
    pastHistoryLabel: 'PAST HISTORY',
    autoSaveLabel: 'Not saved yet. Use Save Draft to keep your notes.',
    saveRefusedTitle: 'Nothing was saved. Fix these and save again:',
    discardLabel: 'Discard',
    finalizeLabel: 'Finalize Consultation',
    medicationListTitle: 'Medication List',
    addMedicineLabel: '+ ADD MEDICINE',
    newMedNamePlaceholder: 'Medicine name & dosage',
    newMedInstrPlaceholder: 'Instructions (e.g. Twice daily • 7 Days)',
    emptyState: 'No consultations found.',
    emptyStateFiltered: 'No consultations match your search.',
};
