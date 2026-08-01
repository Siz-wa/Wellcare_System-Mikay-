// resources/js/pages/admin/archive/archive.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Archive — Fig. 3's "Archive" use case. Composition only.
//
// No new schema: `appointments` and `patients` have carried softDeletes() since
// they were created, so archiving already happened — there was simply no way to
// see or undo it.

import { router } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Button, Input, StatCard } from '@/design-system';
import {
    archiveCopy,
    archiveStatCards,
} from '@/pages/admin/archive/archive-data';
import type {
    ArchiveStats,
    ArchivedAppointment,
    ArchivedPatient,
} from '@/pages/admin/archive/archive-data';
import { ArchivedAppointments } from '@/pages/admin/archive/sections/archived-appointments';
import { ArchivedPatients } from '@/pages/admin/archive/sections/archived-patients';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    appointments: ArchivedAppointment[];
    patients: ArchivedPatient[];
    stats: ArchiveStats;
    search: string;
}

export default function AdminArchivePage({
    appointments,
    patients,
    stats,
    search,
}: PageData): ReactElement {
    const [term, setTerm] = useState(search);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/admin/archive',
            { search: term },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AdminDashboardLayout activeId={archiveCopy.activeNavId}>
            <AdminPageHeader
                title={archiveCopy.pageTitle}
                subtitle={archiveCopy.pageSubtitle}
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                {archiveStatCards.map((card) => (
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
                    marginBottom: 'var(--space-5)',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ flex: '1 1 260px', minWidth: 200 }}>
                    <Input
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder={archiveCopy.searchPlaceholder}
                    />
                </div>
                <Button type="submit" variant="outline">
                    Search
                </Button>
            </form>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-6)',
                }}
            >
                <ArchivedAppointments rows={appointments} />
                <ArchivedPatients rows={patients} />
            </div>

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
