// resources/js/pages/doctor/dashboard/patient-records/patient-records.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Patient Records index — all clinic patients, DB-driven.
// Changes from mockup:
//   - Reads `patients` (paginated) and `filters` from Inertia props
//   - Red allergy flag on cards with known allergies
//   - Active diagnosis count badge
//   - "OPEN ARCHIVE" navigates to the detail page (not a modal)
//   - Search/filter sends server-side queries via Inertia router

import { router, usePage, Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type { PageProps } from '@/types';
import { DashboardLayout } from '../layout/dashboard-layout';
import { patientRecordsMeta } from './patient-records-data';
import type { Patient } from './patient-records-data';

// ── Inertia page props ────────────────────────────────────────────────────────

interface PaginatedPatients {
    data: Patient[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface PageData extends PageProps {
    patients: PaginatedPatients;
    filters: { search: string; service: string };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconFolder = ({ active }: { active?: boolean }): ReactElement => (
    <div
        style={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            background: active ? 'var(--wc-blue-600)' : 'transparent',
            border: active ? 'none' : '1.5px solid var(--wc-blue-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: active ? '#fff' : 'var(--wc-blue-600)',
            marginBottom: 'var(--space-4)',
            transition:
                'background 0.22s ease, border 0.22s ease, color 0.22s ease',
        }}
    >
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    </div>
);

// ── Record Card ───────────────────────────────────────────────────────────────

function RecordCard({ patient }: { patient: Patient }): ReactElement {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered
                    ? 'linear-gradient(135deg, #f0f5ff 0%, #e8f0fe 100%)'
                    : '#fff',
                padding: 'var(--space-6)',
                borderRadius: '24px',
                border: hovered
                    ? '1px solid #c7d9fa'
                    : '1px solid var(--wc-gray-100)',
                position: 'relative',
                boxShadow: hovered
                    ? '0 12px 32px -6px rgba(59,130,246,0.18)'
                    : 'none',
                transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
                transition: 'all 0.22s ease',
                cursor: 'pointer',
            }}
        >
            {/* Allergy flag — red badge top-right, immediately visible */}
            {patient.hasAllergy && (
                <div
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        fontSize: '10px',
                        fontWeight: 800,
                        border: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    ⚠ ALLERGY
                </div>
            )}

            <IconFolder active={hovered} />

            <h3
                style={{
                    margin: '0 0 4px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: hovered ? 'var(--wc-blue-600)' : 'var(--wc-dark)',
                    transition: 'color 0.22s ease',
                    paddingRight: patient.hasAllergy ? '80px' : 0,
                }}
            >
                {patient.name}
            </h3>

            <p
                style={{
                    margin: '0 0 var(--space-5)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--wc-gray-400)',
                    fontWeight: 600,
                }}
            >
                {patient.patientId} · {patient.email}
            </p>

            {/* Active diagnoses warning */}
            {patient.activeDiagnoses > 0 && (
                <div
                    style={{
                        marginBottom: 'var(--space-3)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <span
                        style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#c2410c',
                        }}
                    >
                        {patient.activeDiagnoses} active{' '}
                        {patient.activeDiagnoses === 1
                            ? 'diagnosis'
                            : 'diagnoses'}
                    </span>
                </div>
            )}

            {/* Meta row */}
            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-5)',
                    marginBottom: 'var(--space-5)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--wc-gray-500)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                    }}
                >
                    <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {patient.lastUpdate}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--wc-gray-500)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                    }}
                >
                    <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {patient.docCount} DOCS
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--wc-gray-500)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                    }}
                >
                    <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {patient.appointmentCount} VISITS
                </div>
            </div>

            {/* Footer */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--wc-gray-100)',
                    paddingTop: 'var(--space-4)',
                }}
            >
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#f0fdf4',
                        color: '#16a34a',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 800,
                        border: '1px solid #dcfce7',
                    }}
                >
                    <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                    >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                    </svg>
                    VERIFIED
                </span>
                <Link
                    href={`/doctor/patient-records/${patient.id}`}
                    style={{
                        color: 'var(--wc-blue-600)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        textDecoration: 'none',
                        opacity: hovered ? 1 : 0,
                        transition: 'opacity 0.22s ease',
                        pointerEvents: hovered ? 'auto' : 'none',
                    }}
                >
                    OPEN ARCHIVE ›
                </Link>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientRecordsPage(): ReactElement {
    const { props } = usePage<PageData>();
    const meta = patientRecordsMeta;
    const [search, setSearch] = useState(props.filters.search ?? '');

    function handleSearch(value: string): void {
        setSearch(value);
        router.get(
            window.location.pathname,
            { search: value, service: props.filters.service },
            { preserveState: true, replace: true },
        );
    }

    return (
        <DashboardLayout activeId={meta.activeNav}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <h1
                    style={{
                        margin: '0 0 var(--space-1)',
                        fontSize: 'var(--text-3xl)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        color: 'var(--wc-dark)',
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {meta.pageTitle}
                </h1>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-base)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.pageSubtitle}
                </p>
            </div>

            {/* Stats row */}
            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                <div
                    className="wc-card"
                    style={{
                        padding: 'var(--space-4) var(--space-5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                    }}
                >
                    <span
                        style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 800,
                            color: 'var(--wc-blue-600)',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {props.patients.total}
                    </span>
                    <span
                        style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        Total Patients
                    </span>
                </div>
                <div
                    className="wc-card"
                    style={{
                        padding: 'var(--space-4) var(--space-5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                    }}
                >
                    <span
                        style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 800,
                            color: '#b91c1c',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {props.patients.data.filter((p) => p.hasAllergy).length}
                    </span>
                    <span
                        style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        Patients with Known Allergies
                    </span>
                </div>
            </div>

            {/* Search bar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                <div style={{ flex: 1, position: 'relative' }}>
                    <span
                        style={{
                            position: 'absolute',
                            left: 'var(--space-4)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--wc-gray-400)',
                            display: 'flex',
                            pointerEvents: 'none',
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        type="search"
                        className="wc-input"
                        placeholder={meta.searchPlaceholder}
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                            paddingLeft: 'calc(var(--space-4) + 22px)',
                            fontSize: 'var(--text-sm)',
                            background: 'var(--wc-white)',
                            width: '100%',
                        }}
                    />
                </div>
            </div>

            {/* Grid */}
            <div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-5)',
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-lg)',
                            fontWeight: 700,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {meta.listCardTitle}
                    </h2>
                    <span
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-gray-400)',
                            fontWeight: 600,
                        }}
                    >
                        {props.patients.total} records
                    </span>
                </div>

                {props.patients.data.length === 0 ? (
                    <div
                        className="wc-card"
                        style={{
                            padding: 'var(--space-12)',
                            textAlign: 'center',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-base)',
                                color: 'var(--wc-gray-400)',
                            }}
                        >
                            No patients found.
                        </p>
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: 'var(--space-6)',
                        }}
                    >
                        {props.patients.data.map((p) => (
                            <RecordCard key={p.id} patient={p} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {props.patients.last_page > 1 && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 'var(--space-2)',
                            marginTop: 'var(--space-8)',
                        }}
                    >
                        {Array.from(
                            { length: props.patients.last_page },
                            (_, i) => i + 1,
                        ).map((page) => (
                            <button
                                key={page}
                                onClick={() =>
                                    router.get(
                                        window.location.pathname,
                                        { ...props.filters, page },
                                        { preserveState: true },
                                    )
                                }
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--wc-gray-200)',
                                    background:
                                        page === props.patients.current_page
                                            ? 'var(--wc-blue-600)'
                                            : '#fff',
                                    color:
                                        page === props.patients.current_page
                                            ? '#fff'
                                            : 'var(--wc-gray-600)',
                                    fontWeight: 700,
                                    fontSize: 'var(--text-sm)',
                                    cursor: 'pointer',
                                }}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
