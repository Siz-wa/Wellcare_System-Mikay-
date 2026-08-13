// resources/js/pages/user/patients/components/patient-roster-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One person on the guarantor's roster, with the two writes they are allowed:
// edit their demographics, or archive them. Clinical data is not reachable from
// here — that lives on the read-only records page.

import { Link } from '@inertiajs/react';
import { CalendarPlus, FileText, Pencil, Archive } from 'lucide-react';
import type { ReactElement } from 'react';
import type { PatientOption } from '@/pages/user/book-appointment/sections/bookingdata';
import { patientsMeta } from '../patients-data';

interface PatientRosterCardProps {
    patient: PatientOption;
    onEdit: () => void;
    onArchive: () => void;
}

export function PatientRosterCard({
    patient,
    onEdit,
    onArchive,
}: PatientRosterCardProps): ReactElement {
    const isSelf = patient.relationship === 'self';

    const relationship = patient.relationshipLabel;

    const meta = [
        patient.age !== null ? `${patient.age} yrs` : null,
        patient.gender,
        patient.clinicId,
    ].filter(Boolean);

    return (
        <article
            style={{
                background: '#fff',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-3)',
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: 'var(--radius-full, 999px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--wc-blue-50)',
                        color: 'var(--wc-blue-700)',
                        fontWeight: 700,
                        fontSize: 14,
                    }}
                >
                    {patient.initials}
                </span>

                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 700,
                                color: 'var(--wc-gray-900)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {patient.name}
                        </h2>
                        {isSelf && (
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: 'var(--wc-blue-600)',
                                    color: '#fff',
                                }}
                            >
                                {patientsMeta.selfBadge}
                            </span>
                        )}
                    </div>

                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: 13,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {[relationship, ...meta].filter(Boolean).join(' · ')}
                    </p>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-4)',
                    fontSize: 13,
                    color: 'var(--wc-gray-500)',
                }}
            >
                <span>{patient.appointmentCount} visits</span>
                <span>{patient.documentCount} documents</span>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                    paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--wc-gray-100)',
                }}
            >
                <Link
                    href={`/book?patient=${patient.id}`}
                    className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                    style={{ display: 'inline-flex', gap: 6 }}
                >
                    <CalendarPlus size={14} /> Book
                </Link>

                <Link
                    href={`/user/records/${patient.id}`}
                    className="wc-btn wc-btn-ghost wc-btn-sm wc-btn-pill"
                    style={{ display: 'inline-flex', gap: 6 }}
                >
                    <FileText size={14} /> Record
                </Link>

                <button
                    type="button"
                    onClick={onEdit}
                    className="wc-btn wc-btn-ghost wc-btn-sm wc-btn-pill"
                    style={{ display: 'inline-flex', gap: 6 }}
                >
                    <Pencil size={14} /> {patientsMeta.edit.label}
                </button>

                {/* Your own record cannot be archived — the server would only
                    recreate it on the next visit to /book. */}
                {!isSelf && (
                    <button
                        type="button"
                        onClick={onArchive}
                        className="wc-btn wc-btn-ghost wc-btn-sm wc-btn-pill"
                        style={{
                            display: 'inline-flex',
                            gap: 6,
                            color: 'var(--wc-error)',
                        }}
                    >
                        <Archive size={14} /> {patientsMeta.archive.label}
                    </button>
                )}
            </div>
        </article>
    );
}
