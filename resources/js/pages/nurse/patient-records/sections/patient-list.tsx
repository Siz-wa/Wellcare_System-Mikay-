// resources/js/pages/nurse/patient-records/sections/patient-list.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Paginated patient table for the nurse record index.

import { Link } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';
import type { PaginatedPatients } from '../patient-records-data';
import { nursePatientRecordsMeta } from '../patient-records-data';

interface PatientListProps {
    patients: PaginatedPatients;
    search: string;
}

const CELL: React.CSSProperties = {
    padding: 'var(--space-4) var(--space-3)',
    fontSize: 'var(--text-sm)',
    color: 'var(--wc-gray-700)',
    verticalAlign: 'middle',
};

const HEAD: React.CSSProperties = {
    padding: 'var(--space-3)',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--wc-gray-500)',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
};

export function PatientList({
    patients,
    search,
}: PatientListProps): ReactElement {
    const meta = nursePatientRecordsMeta;

    return (
        <section
            style={{
                background: 'var(--wc-white)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-5)',
                    borderBottom: '1px solid var(--wc-gray-200)',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        color: 'var(--wc-dark)',
                        fontFamily: "var(--font-display,'Bricolage Grotesque')",
                    }}
                >
                    {meta.listCardTitle}
                </h2>
                <span
                    style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {patients.total} {meta.recordsSuffix}
                </span>
            </header>

            {patients.data.length === 0 ? (
                <p
                    style={{
                        margin: 0,
                        padding: 'var(--space-8) var(--space-5)',
                        textAlign: 'center',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.empty}
                </p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            minWidth: 720,
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    borderBottom:
                                        '1px solid var(--wc-gray-200)',
                                }}
                            >
                                <th
                                    style={{
                                        ...HEAD,
                                        paddingLeft: 'var(--space-5)',
                                    }}
                                >
                                    {meta.columns.patient}
                                </th>
                                <th style={HEAD}>{meta.columns.clinicId}</th>
                                <th style={HEAD}>{meta.columns.visits}</th>
                                <th style={HEAD}>{meta.columns.documents}</th>
                                <th
                                    style={{
                                        ...HEAD,
                                        paddingRight: 'var(--space-5)',
                                    }}
                                >
                                    {meta.columns.lastUpdate}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.data.map((patient) => (
                                <tr
                                    key={patient.id}
                                    style={{
                                        borderBottom:
                                            '1px solid var(--wc-gray-100)',
                                    }}
                                >
                                    <td
                                        style={{
                                            ...CELL,
                                            paddingLeft: 'var(--space-5)',
                                        }}
                                    >
                                        <Link
                                            href={`/nurse/patient-records/${patient.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-3)',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 34,
                                                    height: 34,
                                                    flexShrink: 0,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: '#eff6ff',
                                                    color: 'var(--wc-blue-600)',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {patient.initials}
                                            </span>
                                            <span style={{ minWidth: 0 }}>
                                                <span
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontWeight: 600,
                                                        color: 'var(--wc-dark)',
                                                    }}
                                                >
                                                    {patient.name}
                                                    {patient.hasAllergy && (
                                                        <AlertTriangle
                                                            size={13}
                                                            strokeWidth={2}
                                                            color="#dc2626"
                                                            aria-label={
                                                                meta.allergyBadge
                                                            }
                                                        />
                                                    )}
                                                </span>
                                                {patient.email && (
                                                    <span
                                                        style={{
                                                            display: 'block',
                                                            fontSize: '11px',
                                                            color: 'var(--wc-gray-500)',
                                                        }}
                                                    >
                                                        {patient.email}
                                                    </span>
                                                )}
                                            </span>
                                        </Link>
                                    </td>
                                    <td
                                        style={{
                                            ...CELL,
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                        }}
                                    >
                                        {patient.patientId}
                                    </td>
                                    <td style={CELL}>
                                        {patient.appointmentCount}
                                    </td>
                                    <td style={CELL}>{patient.docCount}</td>
                                    <td
                                        style={{
                                            ...CELL,
                                            paddingRight: 'var(--space-5)',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {patient.lastUpdate}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {patients.last_page > 1 && (
                <nav
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        justifyContent: 'center',
                        padding: 'var(--space-4)',
                        borderTop: '1px solid var(--wc-gray-200)',
                    }}
                >
                    {Array.from(
                        { length: patients.last_page },
                        (_, i) => i + 1,
                    ).map((page) => {
                        const active = page === patients.current_page;

                        return (
                            <Link
                                key={page}
                                href="/nurse/patient-records"
                                data={{ page, search: search || undefined }}
                                preserveScroll
                                style={{
                                    minWidth: 34,
                                    padding: '6px 10px',
                                    borderRadius: 10,
                                    textAlign: 'center',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: active ? 700 : 500,
                                    textDecoration: 'none',
                                    background: active
                                        ? 'var(--wc-blue-600)'
                                        : 'var(--wc-gray-50)',
                                    color: active
                                        ? '#fff'
                                        : 'var(--wc-gray-600)',
                                }}
                            >
                                {page}
                            </Link>
                        );
                    })}
                </nav>
            )}
        </section>
    );
}
