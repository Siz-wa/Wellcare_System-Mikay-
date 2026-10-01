// resources/js/pages/admin/services/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Manage Services — the bookable catalogue, administered. Composition only.

import type { ReactElement } from 'react';
import { useState } from 'react';
import { Alert, Button, StatCard } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminModal } from '@/pages/admin/components/admin-modal';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { ServiceForm } from '@/pages/admin/services/components/service-form';
import { ServiceTable } from '@/pages/admin/services/sections/service-table';
import {
    serviceStatCards,
    servicesCopy,
} from '@/pages/admin/services/services-data';
import type {
    AdminServiceRow,
    SpecialtyOption,
} from '@/pages/admin/services/services-data';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    services: AdminServiceRow[];
    specialties: SpecialtyOption[];
}

export default function AdminServicesPage({
    services,
    specialties,
}: PageData): ReactElement {
    // `null` means the modal is shut. Editing holds the row; creating holds
    // the string 'new' — one piece of state rather than an open flag plus a
    // selection that can disagree with it.
    const [editing, setEditing] = useState<AdminServiceRow | 'new' | null>(
        null,
    );

    const stats = {
        total: services.length,
        active: services.filter((s) => s.isActive).length,
        retired: services.filter((s) => !s.isActive).length,
        inPerson: services.filter((s) => s.requiresInPerson).length,
    };

    // A new service lands after everything already in the catalogue, on the
    // same tens the seeder uses so there is room to slot others between later.
    const nextSortOrder =
        services.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 10;

    return (
        <AdminDashboardLayout activeId={servicesCopy.activeNavId}>
            <AdminPageHeader
                title={servicesCopy.pageTitle}
                subtitle={servicesCopy.pageSubtitle}
                action={
                    <Button onClick={() => setEditing('new')}>
                        {servicesCopy.addLabel}
                    </Button>
                }
            />

            <AdminFlash />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                {serviceStatCards.map((card) => (
                    <StatCard
                        key={card.key}
                        value={stats[card.key]}
                        label={card.label}
                    />
                ))}
            </div>

            {/* Answers the question this screen raises before an administrator
                goes looking for a delete button that is deliberately absent. */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
                <Alert variant="info">{servicesCopy.retireNotice}</Alert>
            </div>

            <ServiceTable services={services} onEdit={setEditing} />

            <AdminModal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={
                    editing === 'new'
                        ? servicesCopy.addTitle
                        : servicesCopy.editTitle
                }
            >
                {editing !== null && (
                    <ServiceForm
                        // Remounts the form when the target changes, so the
                        // fields are seeded from the new row rather than
                        // carrying the last one's values across.
                        key={editing === 'new' ? 'new' : editing.id}
                        service={editing === 'new' ? null : editing}
                        specialties={specialties}
                        nextSortOrder={nextSortOrder}
                        onDone={() => setEditing(null)}
                    />
                )}
            </AdminModal>
        </AdminDashboardLayout>
    );
}
