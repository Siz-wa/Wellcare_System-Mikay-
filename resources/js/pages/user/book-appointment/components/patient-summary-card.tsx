// resources/js/pages/user/book-appointment/components/patient-summary-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Who this appointment is for, shown above the wizard.
//
// This replaces the old Step 1. The details are read-only here because they
// belong to the patient's record, not to this booking — editing them mid-flow
// would have been editing a medical record from inside a form. "Change" reopens
// the gate instead.

import type { ReactElement } from 'react';
import type { PatientOption } from '@/pages/user/book-appointment/sections/bookingdata';

interface PatientSummaryCardProps {
    patient: PatientOption;
    onChange: () => void;
}

export function PatientSummaryCard({
    patient,
    onChange,
}: PatientSummaryCardProps): ReactElement {
    const meta = [
        patient.relationshipLabel,
        patient.age !== null ? `${patient.age} yrs` : null,
        patient.gender,
    ].filter(Boolean);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                marginBottom: 'var(--space-6)',
                borderRadius: 'var(--radius-lg)',
                background: '#ffffff',
                border: '1px solid var(--wc-blue-100)',
                boxShadow: 'var(--shadow-sm)',
            }}
        >
            <div
                aria-hidden="true"
                style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--wc-blue-600)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                }}
            >
                {patient.initials}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
                <span
                    className="wc-label"
                    style={{
                        color: 'var(--wc-sky-500)',
                        display: 'block',
                        marginBottom: 2,
                    }}
                >
                    Appointment for
                </span>
                <p
                    style={{
                        margin: 0,
                        fontWeight: 700,
                        color: 'var(--wc-gray-900)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {patient.name}
                </p>
                {meta.length > 0 && (
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {meta.join(' · ')}
                    </p>
                )}
            </div>

            <button
                type="button"
                onClick={onChange}
                className="wc-btn wc-btn-ghost wc-btn-sm wc-btn-pill"
                style={{ flexShrink: 0 }}
            >
                Change
            </button>
        </div>
    );
}
