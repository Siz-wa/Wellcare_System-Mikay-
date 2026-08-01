// resources/js/pages/user/lab-results/lab-results-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy and display maps for the patient-facing laboratory results page.

export type LabSeverity = 'normal' | 'abnormal' | 'critical';
export type ParameterStatus = 'normal' | 'abnormal';

export interface LabParameter {
    name: string;
    result: string;
    unit: string;
    refRange: string;
    status: ParameterStatus;
}

export interface LabResult {
    id: number;
    testName: string;
    patientName: string;
    patientInitials: string;
    severity: LabSeverity | null;
    reviewedAt: string | null;
    reviewedAgo: string | null;
    reviewedBy: string | null;
    interpretation: string | null;
    parameters: LabParameter[];
}

export interface LabResultStats {
    total: number;
    abnormal: number;
    patients: number;
}

export const labResultsMeta = {
    title: 'Laboratory Results',
    subtitle:
        'Results appear here once your doctor has reviewed and interpreted them.',

    statsLabels: {
        total: 'Results released',
        abnormal: 'Needing attention',
        patients: 'Patients on this account',
    },

    empty: {
        title: 'No results released yet',
        // Explains the gap between "test was taken" and "result is visible" —
        // otherwise a patient who just had bloods drawn assumes it is broken.
        body: 'Laboratory results are published here after your doctor has reviewed them. If you have had a test recently, it may still be with the laboratory or awaiting review.',
    },

    labels: {
        reviewedBy: 'Reviewed by',
        interpretation: "Doctor's interpretation",
        parameter: 'Test',
        result: 'Result',
        reference: 'Reference range',
        noParameters: 'No individual measurements were recorded for this test.',
        noInterpretation: 'No written interpretation was provided.',
    },

    // Patients read these words, not clinicians — "abnormal" over "flagged".
    severityLabels: {
        normal: 'Normal',
        abnormal: 'Abnormal',
        critical: 'Needs attention',
    },
} as const;

export const severityStyles: Record<
    LabSeverity,
    { color: string; bg: string; border: string }
> = {
    normal: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    abnormal: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    critical: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};
