// resources/js/pages/nurse/patient-records/patient-records.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Nurse patient-record index — thin composer.

import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { NurseDashboardLayout } from '@/pages/nurse/layout/nurse-dashboard-layout';
import type { PageProps } from '@/types';
import type { PaginatedPatients } from './patient-records-data';
import { nursePatientRecordsMeta } from './patient-records-data';
import { PatientList } from './sections/patient-list';

interface PageData extends PageProps {
    patients: PaginatedPatients;
    filters: { search: string; service: string };
}

export default function NursePatientRecordsPage({
    patients,
    filters,
}: PageData): ReactElement {
    const meta = nursePatientRecordsMeta;
    const [search, setSearch] = useState(filters.search ?? '');

    function handleSearch(event: FormEvent): void {
        event.preventDefault();

        router.get(
            '/nurse/patient-records',
            { search: search || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <NurseDashboardLayout activeId={meta.activeNavId}>
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <h1
                    style={{
                        margin: '0 0 var(--space-1)',
                        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        color: 'var(--wc-dark)',
                        fontFamily: "var(--font-display,'Bricolage Grotesque')",
                    }}
                >
                    {meta.pageTitle}
                </h1>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.pageSubtitle}
                </p>
            </div>

            <form
                onSubmit={handleSearch}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-6)',
                    maxWidth: 480,
                }}
            >
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search
                        size={16}
                        strokeWidth={1.8}
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--wc-gray-400)',
                        }}
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={meta.searchPlaceholder}
                        aria-label={meta.searchPlaceholder}
                        style={{
                            width: '100%',
                            padding: '10px 14px 10px 36px',
                            borderRadius: 12,
                            border: '1px solid var(--wc-gray-200)',
                            background: 'var(--wc-white)',
                            fontSize: 'var(--text-sm)',
                            fontFamily: 'var(--font-sans)',
                            color: 'var(--wc-gray-700)',
                        }}
                    />
                </div>
            </form>

            <PatientList patients={patients} search={filters.search ?? ''} />
        </NurseDashboardLayout>
    );
}
