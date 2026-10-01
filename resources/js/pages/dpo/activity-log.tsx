// resources/js/pages/dpo/activity-log.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The change log, read by the DPO — GV-5.
//
// Same `activity_log` table the administrator screen renders. What differs is
// the reader: this account holds no permission to create, edit, promote or
// suspend anything, so it is reading a record of actions it could not have
// taken and cannot alter. That is the independence NIST SP 800-53 AU-9(4) asks
// for, expressed as a role rather than as a storage guarantee.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Card, CardBody, Input, Select } from '@/design-system';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { dpoCopy, dpoNavGroups } from '@/pages/dpo/dpo-data';
import type { ChangeLogRow } from '@/pages/dpo/dpo-data';
import type { PageProps } from '@/types';

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
}

interface PageData extends PageProps {
    activities: Paginated<ChangeLogRow>;
    filters: { event: string; search: string };
    events: string[];
}

const COLUMNS = ['What changed', 'Who', 'Record', 'When'];

export default function DpoActivityLogPage({
    activities,
    filters,
    events,
}: PageData): ReactElement {
    const applyFilter = (patch: Record<string, string>) => {
        router.get(
            '/dpo/activity-log',
            { ...filters, ...patch },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AdminDashboardLayout activeId="activity-log" groups={dpoNavGroups}>
            <AdminPageHeader
                title={dpoCopy.changeLogTitle}
                subtitle={dpoCopy.changeLogSubtitle}
            />

            <Card>
                <CardBody>
                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--space-4)',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            marginBottom: 'var(--space-5)',
                        }}
                    >
                        <div style={{ minWidth: 240, flex: 1 }}>
                            <Input
                                placeholder="Search descriptions…"
                                defaultValue={filters.search}
                                onBlur={(e) =>
                                    applyFilter({ search: e.target.value })
                                }
                            />
                        </div>

                        <div style={{ minWidth: 180 }}>
                            <Select
                                value={filters.event}
                                onChange={(value) =>
                                    applyFilter({ event: value })
                                }
                                options={[
                                    { value: '', label: 'All events' },
                                    ...events.map((event) => ({
                                        value: event,
                                        label: event,
                                    })),
                                ]}
                            />
                        </div>

                        <span
                            style={{
                                marginLeft: 'auto',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {activities.total} entr
                            {activities.total === 1 ? 'y' : 'ies'}
                        </span>
                    </div>

                    <AdminTable
                        columns={COLUMNS}
                        emptyMessage={dpoCopy.changeLogEmpty}
                        isEmpty={activities.data.length === 0}
                    >
                        {activities.data.map((row) => (
                            <tr key={row.id}>
                                <AdminTableCell>
                                    <div style={{ fontWeight: 500 }}>
                                        {row.description}
                                    </div>
                                    {row.event && (
                                        <div style={{ marginTop: 4 }}>
                                            <Badge variant="neutral">
                                                {row.event}
                                            </Badge>
                                        </div>
                                    )}
                                </AdminTableCell>

                                <AdminTableCell>
                                    <div>{row.causer}</div>
                                    <div
                                        style={{
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-text-muted)',
                                        }}
                                    >
                                        {row.causerRole ?? '—'}
                                    </div>
                                </AdminTableCell>

                                <AdminTableCell nowrap>
                                    {row.subjectType
                                        ? `${row.subjectType} #${row.subjectId}`
                                        : '—'}
                                </AdminTableCell>

                                <AdminTableCell nowrap>
                                    {row.at ?? row.ago ?? '—'}
                                </AdminTableCell>
                            </tr>
                        ))}
                    </AdminTable>

                    <nav
                        aria-label="Pagination"
                        style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                            marginTop: 'var(--space-5)',
                        }}
                    >
                        {activities.links.map((link) => (
                            <button
                                key={link.label}
                                type="button"
                                disabled={link.url === null}
                                onClick={() =>
                                    link.url &&
                                    router.get(
                                        link.url,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid #e2e8f0',
                                    background: link.active
                                        ? '#0056b3'
                                        : 'transparent',
                                    color: link.active
                                        ? '#fff'
                                        : 'var(--wc-text-muted)',
                                    cursor:
                                        link.url === null
                                            ? 'not-allowed'
                                            : 'pointer',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 600,
                                }}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                </CardBody>
            </Card>
        </AdminDashboardLayout>
    );
}
