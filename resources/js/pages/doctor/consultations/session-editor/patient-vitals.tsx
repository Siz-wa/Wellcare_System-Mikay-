// resources/js/pages/user/consultations/components/session-editor/patient-vitals.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient Vitals tab — 3×2 grid of vital sign input fields.

import type { ReactElement } from 'react';
import { Select } from '@/design-system';
import { bloodPressureOnly, decimalOnly, digitsOnly } from '@/lib/input-masks';
import type { VitalsSource } from '@/lib/vitals';
import { consultationsMeta, vitalFields } from '../consultations-data';
import type { VitalsFields, VitalValueShape } from '../consultations-data';

/**
 * What each measurement will accept, keyed by the shape declared on the
 * field. These are the only thing standing between a typo and the clinical
 * record: the six boxes were plain text, and the rule behind them was
 * `string|max:10`.
 */
const SANITIZERS: Record<VitalValueShape, (value: string) => string> = {
    integer: (value) => digitsOnly(value, 3),
    decimal: (value) => decimalOnly(value, 5),
    'blood-pressure': bloodPressureOnly,
};

interface PatientVitalsProps {
    values: VitalsFields;
    /** value -> label, from ConsultationSession::VITALS_SOURCE_LABELS. */
    sources: Record<VitalsSource, string>;
    /** Self-reported figures from registration; reference only, never prefilled. */
    baseline?: {
        height: string | null;
        weight: string | null;
        source: string;
    } | null;
    onChange: (key: keyof VitalsFields, value: string) => void;
}

export function PatientVitals({
    values,
    sources,
    baseline,
    onChange,
}: PatientVitalsProps): ReactElement {
    const notObtained = values.source === 'not_obtained';

    const baselineParts = baseline
        ? [
              baseline.height ? `${baseline.height} cm` : null,
              baseline.weight ? `${baseline.weight} kg` : null,
          ].filter(Boolean)
        : [];

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                alignContent: 'start',
            }}
        >
            {/* Registration baseline, for comparison only. Rendered above the
                inputs and deliberately not in them: these are self-reported and
                possibly years old, and a number the patient typed at sign-up
                must never be saved as today's measurement. Until this line
                existed the figures were captured and then never shown to
                anyone. */}
            {baselineParts.length > 0 && (
                <p
                    style={{
                        margin: 0,
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--wc-gray-50)',
                        border: '1px solid var(--wc-gray-200)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    <strong style={{ color: 'var(--wc-text-secondary)' }}>
                        On file:
                    </strong>{' '}
                    {baselineParts.join(' · ')} — {baseline?.source}
                </p>
            )}

            {/*
                Provenance first, because it qualifies everything under it.

                This editor opens on virtual visits as well as in-person ones —
                the consultations table offers it for both — and on a video call
                nobody holds a cuff, a thermometer or a scale. Six unlabelled
                numbers here would assert a clinic measurement that never
                happened, which is precisely what the record must not do.
            */}
            <div>
                <p
                    style={{
                        margin: '0 0 var(--space-2)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        color: 'var(--wc-text-muted)',
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                    }}
                >
                    {consultationsMeta.vitalsSourceLabel}
                </p>
                <Select
                    aria-label="Vitals source"
                    value={values.source}
                    onChange={(value) => onChange('source', value)}
                    options={(
                        Object.entries(sources) as Array<[VitalsSource, string]>
                    ).map(([value, label]) => ({ value, label }))}
                />
                <p
                    style={{
                        margin: 'var(--space-2) 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {notObtained
                        ? consultationsMeta.vitalsNotObtainedNote
                        : consultationsMeta.vitalsSourceNote}
                </p>
            </div>

            <div
                className="grid grid-cols-2 content-start gap-4 md:grid-cols-3"
                style={{
                    // Closed, not hidden — the doctor still sees which six
                    // readings the visit went without.
                    opacity: notObtained ? 0.5 : 1,
                }}
            >
                {vitalFields.map((field) => (
                    <div key={field.key}>
                        {/* Label */}
                        <label
                            htmlFor={`vital-${field.key}`}
                            style={{
                                display: 'block',
                                margin: '0 0 var(--space-2)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'var(--wc-text-muted)',
                                letterSpacing: '0.07em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {field.label}
                        </label>

                        {/* Input with unit suffix */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 'var(--radius-xl)',
                                border: '1px solid var(--wc-gray-200)',
                                background: 'var(--wc-white)',
                                overflow: 'hidden',
                                transition:
                                    'border-color var(--duration-base) var(--ease-out)',
                            }}
                        >
                            <input
                                type="text"
                                inputMode={
                                    field.shape === 'decimal'
                                        ? 'decimal'
                                        : 'numeric'
                                }
                                id={`vital-${field.key}`}
                                aria-describedby={`vital-${field.key}-range`}
                                disabled={notObtained}
                                value={values[field.key]}
                                onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                    onChange(
                                        field.key,
                                        SANITIZERS[field.shape](e.target.value),
                                    )
                                }
                                placeholder={field.placeholder}
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-3) var(--space-4)',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 500,
                                    color: 'var(--wc-text-primary)',
                                    background: 'transparent',
                                    fontFamily: 'var(--font-sans)',
                                }}
                            />
                            <span
                                style={{
                                    padding: '0 var(--space-3)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                    color: 'var(--wc-text-muted)',
                                    flexShrink: 0,
                                }}
                            >
                                {field.unit}
                            </span>
                        </div>

                        {/*
                            The plausible range, stated rather than enforced.
                            A reading outside it is far more likely to be a
                            typo than a finding — but a genuine one still has
                            to be recordable, so the server bounds sit wider
                            than these and nothing here blocks a save.
                        */}
                        <p
                            id={`vital-${field.key}-range`}
                            style={{
                                margin: 'var(--space-1) 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {field.range}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
