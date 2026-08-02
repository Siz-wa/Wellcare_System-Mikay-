// resources/js/pages/nurse/lab-queue/components/record-results-modal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The nurse's data-entry surface — DFD process 6 (RECORD LAB RESULTS).
// Dynamic parameter rows plus an overall severity flag, matching the six-step
// lab workflow in doctor/dashboard-data.ts ("Nurse Validation").

import type { ReactElement } from 'react';
import { useState } from 'react';
import {
    emptyParameter,
    labQueueMeta,
    parameterColumns,
    severityOptions,
} from '../lab-queue-data';
import type {
    LabQueueItem,
    LabSeverity,
    ParameterDraft,
} from '../lab-queue-data';

interface RecordResultsModalProps {
    item: LabQueueItem;
    processing: boolean;
    errors: Record<string, string>;
    onClose: () => void;
    onSubmit: (payload: {
        parameters: ParameterDraft[];
        severity: LabSeverity;
        notes: string;
    }) => void;
}

const LABEL_STYLE = {
    display: 'block',
    marginBottom: 'var(--space-2)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--wc-gray-500)',
};

export function RecordResultsModal({
    item,
    processing,
    errors,
    onClose,
    onSubmit,
}: RecordResultsModalProps): ReactElement {
    const meta = labQueueMeta;

    const [parameters, setParameters] = useState<ParameterDraft[]>([
        { ...emptyParameter },
    ]);
    const [severity, setSeverity] = useState<LabSeverity>('normal');
    const [notes, setNotes] = useState('');

    function updateParameter(
        index: number,
        field: keyof ParameterDraft,
        value: string,
    ): void {
        setParameters((rows) =>
            rows.map((row, i) =>
                i === index ? { ...row, [field]: value } : row,
            ),
        );
    }

    function addParameter(): void {
        setParameters((rows) => [...rows, { ...emptyParameter }]);
    }

    function removeParameter(index: number): void {
        setParameters((rows) =>
            rows.length === 1 ? rows : rows.filter((_, i) => i !== index),
        );
    }

    function handleSubmit(): void {
        onSubmit({ parameters, severity, notes });
    }

    // Surface the first server-side parameter error; they are keyed by index
    // (parameters.0.name) so a flat lookup would miss them.
    const parameterError = Object.entries(errors).find(([key]) =>
        key.startsWith('parameters'),
    )?.[1];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={meta.modalTitle}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-4)',
                background: 'rgba(15,23,42,0.45)',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 780,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'var(--wc-white)',
                    borderRadius: 20,
                    boxShadow: '0 24px 60px -12px rgba(15,23,42,0.35)',
                }}
            >
                {/* ── Header ──────────────────────────────────────────────── */}
                <div
                    style={{
                        padding: 'var(--space-6)',
                        borderBottom: '1px solid var(--wc-gray-200)',
                    }}
                >
                    <h2
                        style={{
                            margin: '0 0 var(--space-1)',
                            fontSize: 'var(--text-xl)',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            color: 'var(--wc-dark)',
                            fontFamily:
                                "var(--font-display,'Bricolage Grotesque')",
                        }}
                    >
                        {meta.modalTitle}
                    </h2>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {item.test} — {item.name} ({item.patientId})
                    </p>
                </div>

                <div
                    style={{
                        padding: 'var(--space-6)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-6)',
                    }}
                >
                    {/* ── Parameters ──────────────────────────────────────── */}
                    <div>
                        <span style={LABEL_STYLE}>{meta.parametersLabel}</span>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-2)',
                            }}
                        >
                            {parameters.map((row, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        gap: 'var(--space-2)',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {parameterColumns.map((column) => (
                                        <input
                                            key={column.key}
                                            className="wc-input"
                                            aria-label={column.label}
                                            placeholder={column.placeholder}
                                            value={row[column.key]}
                                            onChange={(e) =>
                                                updateParameter(
                                                    index,
                                                    column.key,
                                                    e.target.value,
                                                )
                                            }
                                            style={{
                                                flex: column.flex,
                                                minWidth: 90,
                                                height: 40,
                                                fontSize: 'var(--text-sm)',
                                            }}
                                        />
                                    ))}

                                    <select
                                        className="wc-input"
                                        aria-label="Parameter status"
                                        value={row.status}
                                        onChange={(e) =>
                                            updateParameter(
                                                index,
                                                'status',
                                                e.target.value,
                                            )
                                        }
                                        style={{
                                            width: 118,
                                            height: 40,
                                            fontSize: 'var(--text-sm)',
                                        }}
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="abnormal">
                                            Abnormal
                                        </option>
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => removeParameter(index)}
                                        disabled={parameters.length === 1}
                                        aria-label={`${meta.removeParameterLabel} ${
                                            row.name || `row ${index + 1}`
                                        }`}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            flexShrink: 0,
                                            borderRadius: 10,
                                            border: '1px solid var(--wc-gray-200)',
                                            background: 'transparent',
                                            color:
                                                parameters.length === 1
                                                    ? 'var(--wc-gray-300)'
                                                    : '#dc2626',
                                            cursor:
                                                parameters.length === 1
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            fontSize: 18,
                                            lineHeight: 1,
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addParameter}
                            style={{
                                marginTop: 'var(--space-3)',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--wc-blue-600)',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            {meta.addParameterLabel}
                        </button>

                        {parameterError && (
                            <p
                                style={{
                                    margin: 'var(--space-2) 0 0',
                                    fontSize: 'var(--text-sm)',
                                    color: '#dc2626',
                                }}
                            >
                                {parameterError}
                            </p>
                        )}
                    </div>

                    {/* ── Severity ────────────────────────────────────────── */}
                    <div>
                        <span style={LABEL_STYLE}>{meta.severityLabel}</span>
                        <div
                            style={{
                                display: 'flex',
                                gap: 'var(--space-3)',
                                flexWrap: 'wrap',
                            }}
                        >
                            {severityOptions.map((option) => {
                                const active = severity === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                            setSeverity(option.value)
                                        }
                                        aria-pressed={active}
                                        style={{
                                            flex: '1 1 180px',
                                            textAlign: 'left',
                                            padding:
                                                'var(--space-3) var(--space-4)',
                                            borderRadius: 14,
                                            cursor: 'pointer',
                                            background: active
                                                ? `${option.color}12`
                                                : 'transparent',
                                            border: `1.5px solid ${
                                                active
                                                    ? option.color
                                                    : 'var(--wc-gray-200)'
                                            }`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'block',
                                                fontSize: 'var(--text-sm)',
                                                fontWeight: 700,
                                                color: active
                                                    ? option.color
                                                    : 'var(--wc-dark)',
                                            }}
                                        >
                                            {option.label}
                                        </span>
                                        <span
                                            style={{
                                                display: 'block',
                                                marginTop: 2,
                                                fontSize: '12px',
                                                color: 'var(--wc-gray-500)',
                                            }}
                                        >
                                            {option.hint}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.severity && (
                            <p
                                style={{
                                    margin: 'var(--space-2) 0 0',
                                    fontSize: 'var(--text-sm)',
                                    color: '#dc2626',
                                }}
                            >
                                {errors.severity}
                            </p>
                        )}
                    </div>

                    {/* ── Notes ───────────────────────────────────────────── */}
                    <div>
                        <label htmlFor="lab-notes" style={LABEL_STYLE}>
                            {meta.notesLabel}
                        </label>
                        <textarea
                            id="lab-notes"
                            className="wc-input"
                            rows={3}
                            placeholder={meta.notesPlaceholder}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{
                                width: '100%',
                                fontSize: 'var(--text-sm)',
                                resize: 'vertical',
                            }}
                        />
                    </div>
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <div
                    style={{
                        padding: 'var(--space-6)',
                        borderTop: '1px solid var(--wc-gray-200)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-3)',
                    }}
                >
                    <button
                        type="button"
                        className="wc-btn wc-btn-outline wc-btn-md"
                        onClick={onClose}
                        disabled={processing}
                    >
                        {meta.cancelLabel}
                    </button>
                    <button
                        type="button"
                        className="wc-btn wc-btn-primary wc-btn-md"
                        onClick={handleSubmit}
                        disabled={processing}
                    >
                        {processing ? meta.submittingLabel : meta.submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
