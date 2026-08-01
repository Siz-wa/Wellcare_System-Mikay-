// resources/js/pages/user/records/components/patient-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One person on the records index. An account can guarantee several patients,
// so this is a chooser rather than a single record view.

import { Link } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, FileText } from 'lucide-react';
import type { ReactElement } from 'react';
import type { PatientCard as PatientCardData } from '../records-data';
import { recordsMeta } from '../records-data';

interface PatientCardProps {
    patient: PatientCardData;
}

export function PatientCard({ patient }: PatientCardProps): ReactElement {
    const { labels } = recordsMeta;

    return (
        <Link
            href={`/user/records/${patient.id}`}
            style={{
                display: 'block',
                textDecoration: 'none',
                background: '#fff',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 'var(--space-5)',
                transition: 'border-color .15s ease, box-shadow .15s ease',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'var(--wc-blue-50, #eff6ff)',
                        color: 'var(--wc-blue-600)',
                        fontWeight: 700,
                        fontSize: 16,
                        flexShrink: 0,
                    }}
                >
                    {patient.initials}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--wc-gray-900)',
                        }}
                    >
                        {patient.name}
                    </p>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 13,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {[
                            patient.clinicId,
                            patient.age ? `${patient.age} yrs` : null,
                            patient.gender,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>

                <ChevronRight
                    size={18}
                    strokeWidth={1.8}
                    style={{ color: 'var(--wc-gray-400)', flexShrink: 0 }}
                />
            </div>

            {/* Allergies are safety-critical — they surface on the card, not
                only inside the record. */}
            {patient.hasAllergy && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 'var(--space-4)',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        fontSize: 13,
                        fontWeight: 500,
                    }}
                >
                    <AlertTriangle size={15} strokeWidth={2} />
                    <span>{patient.allergySummary}</span>
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-5)',
                    marginTop: 'var(--space-4)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--wc-gray-100)',
                    fontSize: 13,
                    color: 'var(--wc-gray-600)',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} strokeWidth={1.8} />
                    {patient.documentCount} {labels.documents}
                </span>
                <span>
                    {patient.appointmentCount} {labels.visits}
                </span>
                {patient.activeDiagnoses > 0 && (
                    <span>
                        {patient.activeDiagnoses} {labels.activeDiagnoses}
                    </span>
                )}
            </div>
        </Link>
    );
}
