// resources/js/pages/dpo/access-log.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The record access log — GV-5.
//
// This table is the answer to "who LOOKED at this record", which `activity_log`
// cannot give and which a breach notification has 72 hours to produce. The rows
// have been written on every chart view, document download and export since the
// September compliance pass; until this screen existed, nothing read them.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Card, CardBody, Check, Input, Select } from '@/design-system';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminTable } from '@/pages/admin/components/admin-table';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { AccessRow } from '@/pages/dpo/components/access-row';
import { dpoCopy, dpoNavGroups } from '@/pages/dpo/dpo-data';
import type { AccessLogRow } from '@/pages/dpo/dpo-data';
import type { PageProps } from '@/types';

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
}

interface PageData extends PageProps {
    entries: Paginated<AccessLogRow>;
    filters: {
        action: string;
        actor: string;
        breakGlass: boolean;
    };
}

const COLUMNS = [
    'Staff',
    'Patient',
    'Action',
    'Relationship',
    'When',
    'Origin',
];

const ACTION_OPTIONS = [
    { value: '', label: dpoCopy.filterAll },
    { value: 'viewed', label: 'Viewed' },
    { value: 'downloaded', label: 'Downloaded' },
    { value: 'exported', label: 'Exported' },
    { value: 'searched', label: 'Searched' },
];

export default function DpoAccessLogPage({
    entries,
    filters,
}: PageData): ReactElement {
    /**
     * Filters go through the URL rather than through local state so a DPO can
     * bookmark or share "every break-glass event by this account" — which is
     * the shape of a link that goes into an incident report.
     */
    const applyFilter = (patch: Record<string, string | boolean>) => {
        router.get(
            '/dpo/access-log',
            { ...filters, ...patch },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AdminDashboardLayout activeId="access-log" groups={dpoNavGroups}>
            <AdminPageHeader
                title={dpoCopy.accessLogTitle}
                subtitle={dpoCopy.accessLogSubtitle}
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
                        <div style={{ minWidth: 220, flex: 1 }}>
                            <Input
                                placeholder={dpoCopy.filterActorPlaceholder}
                                defaultValue={filters.actor}
                                onBlur={(e) =>
                                    applyFilter({ actor: e.target.value })
                                }
                            />
                        </div>

                        <div style={{ minWidth: 180 }}>
                            <Select
                                value={filters.action}
                                onChange={(value) =>
                                    applyFilter({ action: value })
                                }
                                options={ACTION_OPTIONS}
                            />
                        </div>

                        <Check
                            checked={filters.breakGlass}
                            onChange={(e) =>
                                applyFilter({ breakGlass: e.target.checked })
                            }
                            label={dpoCopy.filterBreakGlass}
                        />

                        <span
                            style={{
                                marginLeft: 'auto',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {entries.total} event
                            {entries.total === 1 ? '' : 's'}
                        </span>
                    </div>

                    <AdminTable
                        columns={COLUMNS}
                        emptyMessage={dpoCopy.accessLogEmpty}
                        isEmpty={entries.data.length === 0}
                    >
                        {entries.data.map((row) => (
                            <AccessRow key={row.id} row={row} />
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
                        {entries.links.map((link) => (
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
                                // Laravel's paginator labels carry &laquo; and
                                // &raquo; entities.
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                </CardBody>
            </Card>
        </AdminDashboardLayout>
    );
}
