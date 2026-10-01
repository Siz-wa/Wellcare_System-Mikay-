// resources/js/pages/nurse/lab-queue/lab-queue-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content and types for the Staff Nurse lab queue.
// Every string the page renders lives here — no component holds copy.

// ── Server-provided shapes ────────────────────────────────────────────────────

export type LabWorkflowStatus = 'requested' | 'recorded' | 'reviewed';
export type LabSeverity = 'normal' | 'abnormal' | 'critical';
export type ParameterStatus = 'normal' | 'abnormal';

export interface LabQueueItem {
    id: string;
    name: string;
    initials: string;
    patientId: string;
    test: string;
    status: LabWorkflowStatus;
    severity: LabSeverity | null;
    requestedBy: string | null;
    requestedAt: string | null;
    timeAgo: string;
}

export interface LabQueueStats {
    pending: number;
    recordedToday: number;
    criticalToday: number;
}

// ── Recording form ────────────────────────────────────────────────────────────

// The index signature is what lets this be posted straight through Inertia —
// router.post requires every nested object to satisfy FormDataConvertible.
export interface ParameterDraft {
    [key: string]: string;
    name: string;
    result: string;
    unit: string;
    ref_range: string;
    status: ParameterStatus;
}

export const labAttachmentCopy = {
    attachmentLabel: 'Analyzer printout (optional)',
    attachmentHint:
        'PDF or photo of the machine printout. It is filed on the patient record as a lab document.',
};

export const emptyParameter: ParameterDraft = {
    name: '',
    result: '',
    unit: '',
    ref_range: '',
    status: 'normal',
};

/**
 * Standard panels, so the nurse fills in results rather than typing every
 * analyte name, unit and reference range by hand. Keys match the test names a
 * doctor orders (labTestPresets in doctor/consultations). Reference ranges are
 * common adult ranges; the analyzer printout is authoritative and the nurse can
 * edit any row.
 */
export const labPanelTemplates: Record<string, ParameterDraft[]> = {
    'Complete Blood Count': [
        {
            name: 'Hemoglobin',
            result: '',
            unit: 'g/dL',
            ref_range: '12.0–16.0',
            status: 'normal',
        },
        {
            name: 'Hematocrit',
            result: '',
            unit: '%',
            ref_range: '36–48',
            status: 'normal',
        },
        {
            name: 'RBC count',
            result: '',
            unit: 'x10^12/L',
            ref_range: '4.2–5.4',
            status: 'normal',
        },
        {
            name: 'WBC count',
            result: '',
            unit: 'x10^9/L',
            ref_range: '4.5–11.0',
            status: 'normal',
        },
        {
            name: 'Platelet count',
            result: '',
            unit: 'x10^9/L',
            ref_range: '150–400',
            status: 'normal',
        },
        {
            name: 'Neutrophils',
            result: '',
            unit: '%',
            ref_range: '40–70',
            status: 'normal',
        },
        {
            name: 'Lymphocytes',
            result: '',
            unit: '%',
            ref_range: '20–40',
            status: 'normal',
        },
    ],
    'Lipid Profile': [
        {
            name: 'Total cholesterol',
            result: '',
            unit: 'mg/dL',
            ref_range: '< 200',
            status: 'normal',
        },
        {
            name: 'LDL cholesterol',
            result: '',
            unit: 'mg/dL',
            ref_range: '< 100',
            status: 'normal',
        },
        {
            name: 'HDL cholesterol',
            result: '',
            unit: 'mg/dL',
            ref_range: '> 40',
            status: 'normal',
        },
        {
            name: 'Triglycerides',
            result: '',
            unit: 'mg/dL',
            ref_range: '< 150',
            status: 'normal',
        },
    ],
    'HbA1c Test': [
        {
            name: 'HbA1c',
            result: '',
            unit: '%',
            ref_range: '4.0–5.6',
            status: 'normal',
        },
    ],
    Urinalysis: [
        {
            name: 'Color',
            result: '',
            unit: '',
            ref_range: 'Yellow',
            status: 'normal',
        },
        {
            name: 'Transparency',
            result: '',
            unit: '',
            ref_range: 'Clear',
            status: 'normal',
        },
        {
            name: 'pH',
            result: '',
            unit: '',
            ref_range: '4.5–8.0',
            status: 'normal',
        },
        {
            name: 'Specific gravity',
            result: '',
            unit: '',
            ref_range: '1.005–1.030',
            status: 'normal',
        },
        {
            name: 'Protein',
            result: '',
            unit: '',
            ref_range: 'Negative',
            status: 'normal',
        },
        {
            name: 'Glucose',
            result: '',
            unit: '',
            ref_range: 'Negative',
            status: 'normal',
        },
        {
            name: 'WBC',
            result: '',
            unit: '/hpf',
            ref_range: '0–5',
            status: 'normal',
        },
        {
            name: 'RBC',
            result: '',
            unit: '/hpf',
            ref_range: '0–2',
            status: 'normal',
        },
    ],
    'Thyroid Panel': [
        {
            name: 'TSH',
            result: '',
            unit: 'mIU/L',
            ref_range: '0.4–4.0',
            status: 'normal',
        },
        {
            name: 'Free T4',
            result: '',
            unit: 'ng/dL',
            ref_range: '0.8–1.8',
            status: 'normal',
        },
        {
            name: 'Free T3',
            result: '',
            unit: 'pg/mL',
            ref_range: '2.3–4.2',
            status: 'normal',
        },
    ],
    'ECG Report': [
        {
            name: 'Rhythm',
            result: '',
            unit: '',
            ref_range: 'Sinus',
            status: 'normal',
        },
        {
            name: 'Heart rate',
            result: '',
            unit: 'bpm',
            ref_range: '60–100',
            status: 'normal',
        },
        {
            name: 'PR interval',
            result: '',
            unit: 'ms',
            ref_range: '120–200',
            status: 'normal',
        },
        {
            name: 'QRS duration',
            result: '',
            unit: 'ms',
            ref_range: '< 120',
            status: 'normal',
        },
        {
            name: 'QTc',
            result: '',
            unit: 'ms',
            ref_range: '< 450',
            status: 'normal',
        },
    ],
};

/** The template rows for a test, or one blank row when there is none. */
export function templateFor(testName: string): ParameterDraft[] {
    const rows = labPanelTemplates[testName];

    return rows ? rows.map((r) => ({ ...r })) : [{ ...emptyParameter }];
}

export const severityOptions: {
    value: LabSeverity;
    label: string;
    hint: string;
    color: string;
}[] = [
    {
        value: 'normal',
        label: 'Normal',
        hint: 'All values within the reference range.',
        color: '#16a34a',
    },
    {
        value: 'abnormal',
        label: 'Abnormal',
        hint: 'One or more values outside the range, not urgent.',
        color: '#ca8a04',
    },
    {
        value: 'critical',
        label: 'Critical',
        hint: 'Needs the doctor’s immediate attention.',
        color: '#dc2626',
    },
];

export const severityColors: Record<LabSeverity, string> = {
    normal: '#16a34a',
    abnormal: '#ca8a04',
    critical: '#dc2626',
};

export const statusLabels: Record<LabWorkflowStatus, string> = {
    requested: 'Awaiting results',
    recorded: 'With doctor',
    reviewed: 'Reviewed',
};

// ── Column headers for the parameter editor ───────────────────────────────────

export const parameterColumns = [
    { key: 'name', label: 'Parameter', placeholder: 'Hemoglobin', flex: 2 },
    { key: 'result', label: 'Result', placeholder: '13.2', flex: 1 },
    { key: 'unit', label: 'Unit', placeholder: 'g/dL', flex: 1 },
    { key: 'ref_range', label: 'Reference', placeholder: '12.0–16.0', flex: 1 },
] as const;

// ── Page meta ─────────────────────────────────────────────────────────────────

export const labQueueMeta = {
    ...labAttachmentCopy,
    pageTitle: 'Lab Queue',
    pageSubtitle:
        'Encode laboratory results and flag critical values for the doctor',

    statsLabels: {
        pending: 'AWAITING RESULTS',
        recordedToday: 'RECORDED TODAY',
        criticalToday: 'CRITICAL TODAY',
    },

    pendingCardTitle: 'Requests Awaiting Results',
    recentCardTitle: 'Recently Recorded',
    emptyPending:
        'No lab requests waiting. New orders from doctors appear here.',
    emptyRecent: 'Nothing recorded yet.',

    recordLabel: 'Record Results',
    requestedByLabel: 'Requested by',

    // Recording modal
    modalTitle: 'Record Lab Results',
    parametersLabel: 'Test Parameters',
    addParameterLabel: '+ Add parameter',
    removeParameterLabel: 'Remove',
    severityLabel: 'Overall Assessment',
    notesLabel: 'Notes for the doctor',
    notesPlaceholder:
        'Specimen quality, collection notes, anything the doctor should know…',
    cancelLabel: 'Cancel',
    submitLabel: 'Submit to Doctor',
    submittingLabel: 'Submitting…',

    // Active nav id — must match NavItem.id in nurse-dashboard-data.ts
    activeNavId: 'lab-queue',
};

/**
 * Where a result sits against its own reference range.
 *
 * Returns null when the question cannot be answered — a non-numeric result
 * ("Reactive", "No growth seen"), a blank value, or a range that is not two
 * numbers. Those are for the nurse to classify, and guessing at them would be
 * worse than leaving the row alone.
 *
 * Accepts the range separators that actually get typed: an ASCII hyphen, an en
 * dash, or the word "to". A leading "<" or ">" bound is read as one-sided.
 */
export function statusForResult(
    result: string,
    refRange: string,
): ParameterStatus | null {
    const value = Number.parseFloat(result.trim());

    if (!Number.isFinite(value)) {
        return null;
    }

    const range = refRange.trim();

    if (range === '') {
        return null;
    }

    const upperOnly = range.match(/^<\s*=?\s*(-?\d+(?:\.\d+)?)$/);

    if (upperOnly) {
        return value <= Number.parseFloat(upperOnly[1]) ? 'normal' : 'abnormal';
    }

    const lowerOnly = range.match(/^>\s*=?\s*(-?\d+(?:\.\d+)?)$/);

    if (lowerOnly) {
        return value >= Number.parseFloat(lowerOnly[1]) ? 'normal' : 'abnormal';
    }

    const pair = range.match(
        /^(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)$/i,
    );

    if (!pair) {
        return null;
    }

    const low = Number.parseFloat(pair[1]);
    const high = Number.parseFloat(pair[2]);

    return value >= Math.min(low, high) && value <= Math.max(low, high)
        ? 'normal'
        : 'abnormal';
}
