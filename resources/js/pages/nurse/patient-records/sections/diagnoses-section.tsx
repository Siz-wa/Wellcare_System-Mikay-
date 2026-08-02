// resources/js/pages/nurse/patient-records/sections/diagnoses-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Diagnoses — READ ONLY for the nurse.
//
// There is no diagnosis write route in the `role:nurse` group, and this section
// deliberately renders the reason rather than simply omitting the controls: a
// missing button reads as an oversight, a stated boundary reads as a decision.
// Authoring a diagnosis is the attending doctor's clinical judgment.

import type { ReactElement } from 'react';
import { EmptyNote, RecordSection } from '../components/record-section';
import type { Diagnosis } from '../patient-records-data';
import { nursePatientRecordsMeta } from '../patient-records-data';

interface DiagnosesSectionProps {
    diagnoses: Diagnosis[];
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    active: { color: '#c2410c', bg: '#fff7ed' },
    chronic: { color: '#7c3aed', bg: '#f5f3ff' },
    resolved: { color: '#16a34a', bg: '#f0fdf4' },
};

export function DiagnosesSection({
    diagnoses,
}: DiagnosesSectionProps): ReactElement {
    const meta = nursePatientRecordsMeta;

    return (
        <RecordSection
            title={meta.diagnosesTitle}
            note={meta.diagnosesReadOnlyNote}
        >
            {diagnoses.length === 0 ? (
                <EmptyNote>{meta.diagnosesEmpty}</EmptyNote>
            ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {diagnoses.map((diagnosis, index) => {
                        const tone =
                            STATUS_COLORS[diagnosis.status] ??
                            STATUS_COLORS.active;

                        return (
                            <li
                                key={diagnosis.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-3) 0',
                                    borderTop:
                                        index === 0
                                            ? 'none'
                                            : '1px solid var(--wc-gray-100)',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 'var(--text-sm)',
                                            fontWeight: 600,
                                            color: 'var(--wc-dark)',
                                        }}
                                    >
                                        {diagnosis.diagnosis}
                                        {diagnosis.icdCode && (
                                            <span
                                                style={{
                                                    marginLeft: 8,
                                                    fontFamily: 'monospace',
                                                    fontSize: '11px',
                                                    color: 'var(--wc-gray-500)',
                                                }}
                                            >
                                                {diagnosis.icdCode}
                                            </span>
                                        )}
                                    </p>
                                    <p
                                        style={{
                                            margin: '2px 0 0',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {diagnosis.type} ·{' '}
                                        {diagnosis.diagnosedAt}
                                        {diagnosis.notes
                                            ? ` · ${diagnosis.notes}`
                                            : ''}
                                    </p>
                                </div>
                                <span
                                    style={{
                                        padding: '3px 10px',
                                        borderRadius: 999,
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        background: tone.bg,
                                        color: tone.color,
                                    }}
                                >
                                    {diagnosis.status}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </RecordSection>
    );
}
