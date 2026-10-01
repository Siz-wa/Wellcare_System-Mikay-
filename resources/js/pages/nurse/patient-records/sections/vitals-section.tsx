// resources/js/pages/nurse/patient-records/sections/vitals-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Latest vitals from the most recent completed consultation. Read-only —
// vitals are captured by the doctor during the session.

import type { ReactElement } from 'react';
import { EmptyNote, RecordSection } from '../components/record-section';
import type { Vitals } from '../patient-records-data';
import { nursePatientRecordsMeta } from '../patient-records-data';

interface VitalsSectionProps {
    vitals: Vitals | null;
}

export function VitalsSection({ vitals }: VitalsSectionProps): ReactElement {
    const meta = nursePatientRecordsMeta;
    const labels = meta.vitalsLabels;

    if (!vitals) {
        return (
            <RecordSection title={meta.vitalsTitle}>
                <EmptyNote>{meta.vitalsEmpty}</EmptyNote>
            </RecordSection>
        );
    }

    const rows: { key: keyof Vitals; label: string }[] = [
        { key: 'bloodPressure', label: labels.bloodPressure },
        { key: 'heartRate', label: labels.heartRate },
        { key: 'temperature', label: labels.temperature },
        { key: 'oxygenSaturation', label: labels.oxygenSaturation },
        { key: 'weight', label: labels.weight },
        { key: 'height', label: labels.height },
    ];

    return (
        <RecordSection title={meta.vitalsTitle}>
            {/* Provenance above the numbers, because it qualifies all of them.
                A video visit's readings come from the patient's own devices;
                a nurse reading this needs to know that before acting on one. */}
            <p
                style={{
                    margin: '0 0 var(--space-3)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--wc-text-muted)',
                }}
            >
                {vitals.sourceLabel ?? meta.vitalsSourceUnknown}
            </p>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 'var(--space-4)',
                }}
            >
                {rows.map((row) => (
                    <div key={row.key}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {row.label}
                        </p>
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-lg)',
                                fontWeight: 700,
                                color: vitals[row.key]
                                    ? 'var(--wc-dark)'
                                    : 'var(--wc-gray-400)',
                                fontFamily: 'var(--font-display)',
                            }}
                        >
                            {vitals[row.key] || '—'}
                        </p>
                    </div>
                ))}
            </div>
        </RecordSection>
    );
}
