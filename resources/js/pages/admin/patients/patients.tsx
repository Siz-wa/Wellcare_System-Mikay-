// resources/js/pages/admin/patients/patients.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Manage Patients — Fig. 3's "Manage Patient" use case. Composition only.

import { router } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Button, Input, Select, StatCard } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminModal } from '@/pages/admin/components/admin-modal';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { PatientForm } from '@/pages/admin/patients/components/patient-form';
import {
    coverageOptions,
    patientStatCards,
    patientsCopy,
} from '@/pages/admin/patients/patients-data';
import type {
    AdminPatientRow,
    PatientFilters,
    PatientStats,
} from '@/pages/admin/patients/patients-data';
import { PatientTable } from '@/pages/admin/patients/sections/patient-table';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    patients: AdminPatientRow[];
    filters: PatientFilters;
    stats: PatientStats;
}

export default function AdminPatientsPage({
    patients,
    filters,
    stats,
}: PageData): ReactElement {
    const [search, setSearch] = useState(filters.search);
    const [editing, setEditing] = useState<AdminPatientRow | null>(null);

    const go = (next: Partial<PatientFilters>) => {
        router.get(
            '/admin/patients',
            { ...filters, search, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        go({});
    };

    return (
        <AdminDashboardLayout activeId={patientsCopy.activeNavId}>
            <AdminPageHeader
                title={patientsCopy.pageTitle}
                subtitle={patientsCopy.pageSubtitle}
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                {patientStatCards.map((card) => (
                    <StatCard
                        key={card.key}
                        value={stats[card.key] ?? 0}
                        label={card.label}
                    />
                ))}
            </div>

            <form
                onSubmit={submit}
                style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginBottom: 'var(--space-5)',
                }}
            >
                <div style={{ flex: '1 1 260px', minWidth: 200 }}>
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={patientsCopy.searchPlaceholder}
                    />
                </div>

                <div style={{ minWidth: 190 }}>
                    <Select
                        value={filters.coverage}
                        onChange={(e) => go({ coverage: e.target.value })}
                        options={[
                            { value: '', label: patientsCopy.allCoverage },
                            ...coverageOptions.filter((o) => o.value !== ''),
                        ]}
                    />
                </div>

                <Button type="submit" variant="outline">
                    Search
                </Button>
            </form>

            <PatientTable patients={patients} onEdit={setEditing} />

            <AdminModal
                title={patientsCopy.editTitle}
                open={editing !== null}
                onClose={() => setEditing(null)}
            >
                {editing && (
                    <PatientForm
                        key={editing.id}
                        patient={editing}
                        onDone={() => setEditing(null)}
                    />
                )}
            </AdminModal>

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
