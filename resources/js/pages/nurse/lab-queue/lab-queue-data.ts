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

export const emptyParameter: ParameterDraft = {
    name: '',
    result: '',
    unit: '',
    ref_range: '',
    status: 'normal',
};

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
