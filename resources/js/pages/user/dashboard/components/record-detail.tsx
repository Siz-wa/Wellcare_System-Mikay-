// resources/js/pages/user/dashboard/components/record-detail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A finished visit, read from inside the history panel: SOAP notes, vitals and
// the cancellation reason where there is one. Lifted out of the page file
// unchanged in behaviour.

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { hasAnyVital } from '@/lib/vitals';
import type { PastRecord } from '../dashboard-data';
import { StatusBadge } from './status-badge';

export function RecordDetail({
    record,
    onBack,
}: {
    record: PastRecord;
    onBack: () => void;
}): ReactElement {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 10);

        return () => clearTimeout(t);
    }, []);

    const hasSoap = record.soap && Object.values(record.soap).some((v) => v);
    // hasAnyVital(), not Object.values(...).some: the payload now carries
    // `source` on every saved session, so iterating the object would report
    // "has vitals" for a visit where nothing was measured and render a panel
    // with every value suppressed — a Vitals heading over nothing.
    const hasVitals = hasAnyVital(record.vitals);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                transform: mounted ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
            }}
        >
            {/* Back header */}
            <div
                style={{
                    padding: '18px var(--space-6)',
                    borderBottom: '1px solid var(--wc-gray-100)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    flexShrink: 0,
                }}
            >
                <button
                    onClick={onBack}
                    aria-label="Back to visit list"
                    // Was an 18px glyph with 4px of padding — a 26px target,
                    // under even the WCAG 2.2 floor of 24 once the border box
                    // is measured, on the control that dismisses the record.
                    className="-ml-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-ink-muted"
                >
                    <svg
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        <polyline points="12 18 6 12 12 6" />
                    </svg>
                </button>
                <div style={{ flex: 1 }}>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-base)',
                            fontWeight: 800,
                            color: 'var(--wc-text-primary)',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {record.service}
                    </p>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {record.date} · {record.time}
                    </p>
                </div>
                <StatusBadge status={record.status} />
            </div>

            {/* Scrollable detail */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 'var(--space-5) var(--space-6)',
                }}
            >
                {/* Info row */}
                {/* Stacked on a phone. Two 149px columns truncated the one
                    field on this row nobody can guess from context — the
                    doctor's full name. */}
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                        {
                            label: 'Doctor',
                            value: record.doctor
                                ? record.doctor.startsWith('Dr.')
                                    ? record.doctor
                                    : `Dr. ${record.doctor}`
                                : 'Not assigned',
                        },
                        { label: 'Coverage', value: record.coverage },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            style={{
                                padding: 'var(--space-4)',
                                borderRadius: '12px',
                                background: 'var(--wc-gray-50)',
                                border: '1px solid var(--wc-gray-100)',
                            }}
                        >
                            <p
                                style={{
                                    margin: '0 0 3px',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                    color: 'var(--wc-text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.07em',
                                }}
                            >
                                {label}
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    color: 'var(--wc-text-primary)',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Cancellation reason */}
                {record.status === 'cancelled' && record.cancellationReason && (
                    <div
                        style={{
                            padding: 'var(--space-4)',
                            borderRadius: '12px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            marginBottom: 'var(--space-5)',
                        }}
                    >
                        <p
                            style={{
                                margin: '0 0 4px',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: '#b91c1c',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                            }}
                        >
                            Reason for cancellation
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-sm)',
                                color: '#b91c1c',
                            }}
                        >
                            {record.cancellationReason}
                        </p>
                    </div>
                )}

                {/* SOAP notes */}
                {hasSoap && record.soap && (
                    <div style={{ marginBottom: 'var(--space-5)' }}>
                        <p
                            style={{
                                margin: '0 0 var(--space-3)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'var(--wc-text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                            }}
                        >
                            Clinical Notes
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-2)',
                            }}
                        >
                            {[
                                {
                                    key: 'subjective',
                                    label: 'Subjective (Chief Complaint)',
                                },
                                {
                                    key: 'objective',
                                    label: 'Objective (Findings)',
                                },
                                {
                                    key: 'assessment',
                                    label: 'Assessment (Diagnosis)',
                                },
                                { key: 'plan', label: 'Plan / Treatment' },
                            ].map(({ key, label }) => {
                                const val =
                                    record.soap![
                                        key as keyof typeof record.soap
                                    ];

                                if (!val) {
                                    return null;
                                }

                                return (
                                    <div
                                        key={key}
                                        style={{
                                            padding: 'var(--space-4)',
                                            borderRadius: '12px',
                                            background: '#fff',
                                            border: '1px solid var(--wc-gray-100)',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: '0 0 4px',
                                                fontSize: 'var(--text-xs)',
                                                fontWeight: 700,
                                                color: 'var(--wc-blue-600)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.07em',
                                            }}
                                        >
                                            {label}
                                        </p>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: 'var(--text-sm)',
                                                color: 'var(--wc-text-primary)',
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {val}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Vitals */}
                {hasVitals && record.vitals && (
                    <div>
                        <p
                            style={{
                                margin: '0 0 var(--space-3)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'var(--wc-text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                            }}
                        >
                            Vitals
                        </p>
                        {record.vitals.sourceLabel && (
                            <p
                                style={{
                                    margin: '-8px 0 var(--space-3)',
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-text-muted)',
                                }}
                            >
                                {record.vitals.sourceLabel}
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                {
                                    label: 'Blood Pressure',
                                    value: record.vitals.bloodPressure,
                                    unit: 'mmHg',
                                },
                                {
                                    label: 'Heart Rate',
                                    value: record.vitals.heartRate,
                                    unit: 'bpm',
                                },
                                {
                                    label: 'Temperature',
                                    value: record.vitals.temperature,
                                    unit: '°C',
                                },
                                {
                                    label: 'O₂ Saturation',
                                    value: record.vitals.oxygenSaturation,
                                    unit: '%',
                                },
                                {
                                    label: 'Weight',
                                    value: record.vitals.weight,
                                    unit: 'kg',
                                },
                                {
                                    label: 'Height',
                                    value: record.vitals.height,
                                    unit: 'cm',
                                },
                            ].map(({ label, value, unit }) => {
                                if (!value) {
                                    return null;
                                }

                                return (
                                    <div
                                        key={label}
                                        style={{
                                            padding:
                                                'var(--space-3) var(--space-4)',
                                            borderRadius: '10px',
                                            background: '#f0f9ff',
                                            border: '1px solid #bae6fd',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: '0 0 2px',
                                                fontSize: 'var(--text-xs)',
                                                fontWeight: 700,
                                                color: '#0284c7',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}
                                        >
                                            {label}
                                        </p>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: 'var(--text-base)',
                                                fontWeight: 800,
                                                color: '#0c4a6e',
                                            }}
                                        >
                                            {value}{' '}
                                            <span
                                                style={{
                                                    fontSize: 'var(--text-xs)',
                                                    fontWeight: 500,
                                                    color: '#0284c7',
                                                }}
                                            >
                                                {unit}
                                            </span>
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* No consultation data */}
                {record.status === 'completed' && !hasSoap && !hasVitals && (
                    <div
                        style={{
                            padding: 'var(--space-8)',
                            textAlign: 'center',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                            No consultation notes recorded for this visit.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
