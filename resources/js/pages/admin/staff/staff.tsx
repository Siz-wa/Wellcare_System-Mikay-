// resources/js/pages/admin/staff/staff.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Staff & Credentials — Phase 9. Composition only.
//
// The administrator acting as the clinic's medical director: who holds a valid
// PRC registration, which specialty they may practise, and whether they are
// currently cleared to see patients.

import { router } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Alert, Button, Input, Select, StatCard } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { StaffTable } from '@/pages/admin/staff/sections/staff-table';
import { staffCopy, staffStatCards } from '@/pages/admin/staff/staff-data';
import type {
    SelectOption,
    StaffFilters,
    StaffRow,
    StaffStats,
} from '@/pages/admin/staff/staff-data';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    staff: StaffRow[];
    stats: StaffStats;
    statuses: SelectOption[];
    filters: StaffFilters;
}

export default function AdminStaffPage({
    staff,
    stats,
    statuses,
    filters,
}: PageData): ReactElement {
    const [search, setSearch] = useState(filters.search);

    const go = (next: Partial<StaffFilters>) => {
        router.get(
            '/admin/staff',
            { ...filters, search, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        go({});
    };

    return (
        <AdminDashboardLayout activeId={staffCopy.activeNavId}>
            <AdminPageHeader
                title={staffCopy.pageTitle}
                subtitle={staffCopy.pageSubtitle}
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-5)',
                }}
            >
                {staffStatCards.map((card) => (
                    <StatCard
                        key={card.key}
                        value={stats[card.key] ?? 0}
                        label={card.label}
                    />
                ))}
            </div>

            {/* The rule the whole screen exists to enforce, stated once. */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
                <Alert variant="info">{staffCopy.gateNote}</Alert>
            </div>

            {stats.lapsed > 0 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                    <Alert variant="error">
                        {stats.lapsed} staff member
                        {stats.lapsed === 1 ? ' holds' : 's hold'} a lapsed
                        licence and{' '}
                        {stats.lapsed === 1 ? 'has been' : 'have been'}{' '}
                        withdrawn from booking. {staffCopy.prcNote}
                    </Alert>
                </div>
            )}

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
                        placeholder={staffCopy.searchPlaceholder}
                    />
                </div>

                <div style={{ minWidth: 220 }}>
                    <Select
                        value={filters.status}
                        onChange={(value) => go({ status: value })}
                        options={[
                            { value: '', label: staffCopy.allStatuses },
                            ...statuses,
                        ]}
                    />
                </div>

                <Button type="submit" variant="outline">
                    Search
                </Button>
            </form>

            <StaffTable staff={staff} />

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
