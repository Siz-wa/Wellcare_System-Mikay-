// resources/js/pages/admin/activity-log/sections/activity-table.tsx

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Card, CardBody, CardFooter } from '@/design-system';
import {
    activityColumns,
    activityLogCopy,
} from '@/pages/admin/activity-log/activity-log-data';
import type {
    ActivityEntry,
    Paginated,
} from '@/pages/admin/activity-log/activity-log-data';
import { ActivityRow } from '@/pages/admin/activity-log/components/activity-row';
import { AdminTable } from '@/pages/admin/components/admin-table';

interface ActivityTableProps {
    activities: Paginated<ActivityEntry>;
}

export function ActivityTable({
    activities,
}: ActivityTableProps): ReactElement {
    return (
        <Card>
            <CardBody>
                <AdminTable
                    columns={activityColumns}
                    isEmpty={activities.data.length === 0}
                    emptyMessage={activityLogCopy.tableEmpty}
                >
                    {activities.data.map((entry) => (
                        <ActivityRow key={entry.id} entry={entry} />
                    ))}
                </AdminTable>
            </CardBody>

            {activities.last_page > 1 && (
                <CardFooter>
                    <div
                        style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                        }}
                    >
                        {activities.links.map((link, index) => {
                            const label = link.label
                                .replace('&laquo;', '‹')
                                .replace('&raquo;', '›');

                            if (!link.url) {
                                return (
                                    <span
                                        key={index}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: 'var(--text-sm)',
                                            color: 'var(--wc-gray-400, #94a3b8)',
                                        }}
                                    >
                                        {label}
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={index}
                                    href={link.url}
                                    preserveScroll
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 8,
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: link.active ? 700 : 500,
                                        textDecoration: 'none',
                                        background: link.active
                                            ? '#0056b3'
                                            : 'transparent',
                                        color: link.active ? '#fff' : '#64748b',
                                    }}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
