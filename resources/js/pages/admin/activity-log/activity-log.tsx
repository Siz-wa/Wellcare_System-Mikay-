// resources/js/pages/admin/activity-log/activity-log.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Activity Log — Fig. 3's "Activity Log" oval and Fig. 4's "Monitor System"
// flow. Composition only.

import { router } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Alert, Button, Input, Select, StatCard } from '@/design-system';
import {
    activityLogCopy,
    activityStatCards,
} from '@/pages/admin/activity-log/activity-log-data';
import type {
    ActivityEntry,
    ActivityFilters,
    ActivityStats,
    Paginated,
} from '@/pages/admin/activity-log/activity-log-data';
import { ActivityTable } from '@/pages/admin/activity-log/sections/activity-table';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    activities: Paginated<ActivityEntry>;
    filters: ActivityFilters;
    logNames: string[];
    events: string[];
    stats: ActivityStats;
}

export default function AdminActivityLogPage({
    activities,
    filters,
    logNames,
    events,
    stats,
}: PageData): ReactElement {
    const [search, setSearch] = useState(filters.search);

    const go = (next: Partial<ActivityFilters>) => {
        router.get(
            '/admin/activity-log',
            { ...filters, search, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        go({});
    };

    return (
        <AdminDashboardLayout activeId={activityLogCopy.activeNavId}>
            <AdminPageHeader
                title={activityLogCopy.pageTitle}
                subtitle={activityLogCopy.pageSubtitle}
            />

            <div style={{ marginBottom: 'var(--space-6)' }}>
                <Alert variant="info">{activityLogCopy.readOnlyNote}</Alert>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                {activityStatCards.map((card) => (
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
                <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={activityLogCopy.searchPlaceholder}
                    />
                </div>

                <div style={{ minWidth: 180 }}>
                    <Select
                        value={filters.log}
                        onChange={(e) => go({ log: e.target.value })}
                        options={[
                            { value: '', label: activityLogCopy.allLogs },
                            ...logNames.map((name) => ({
                                value: name,
                                label: name,
                            })),
                        ]}
                    />
                </div>

                <div style={{ minWidth: 160 }}>
                    <Select
                        value={filters.event}
                        onChange={(e) => go({ event: e.target.value })}
                        options={[
                            { value: '', label: activityLogCopy.allEvents },
                            ...events.map((name) => ({
                                value: name,
                                label: name,
                            })),
                        ]}
                    />
                </div>

                <Button type="submit" variant="outline">
                    Search
                </Button>
            </form>

            <ActivityTable activities={activities} />
        </AdminDashboardLayout>
    );
}
