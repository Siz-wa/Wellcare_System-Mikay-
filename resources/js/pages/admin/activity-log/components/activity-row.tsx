// resources/js/pages/admin/activity-log/components/activity-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One audit entry. The field-level diff is rendered inline rather than behind a
// modal — it is the whole reason the row is interesting.

import type { ReactElement } from 'react';
import { Badge } from '@/design-system';
import { activityLogCopy } from '@/pages/admin/activity-log/activity-log-data';
import type { ActivityEntry } from '@/pages/admin/activity-log/activity-log-data';
import { AdminTableCell } from '@/pages/admin/components/admin-table';

interface ActivityRowProps {
    entry: ActivityEntry;
}

export function ActivityRow({ entry }: ActivityRowProps): ReactElement {
    return (
        <tr>
            <AdminTableCell>{entry.description}</AdminTableCell>

            <AdminTableCell nowrap>
                <div style={{ fontWeight: 600 }}>{entry.causer}</div>
                {entry.causerRole && (
                    <div style={{ fontSize: 11, color: 'var(--wc-gray-500)' }}>
                        {entry.causerRole}
                    </div>
                )}
            </AdminTableCell>

            <AdminTableCell nowrap>
                {entry.subjectType ? (
                    <>
                        {entry.subjectType}
                        {entry.subjectId ? ` #${entry.subjectId}` : ''}
                    </>
                ) : (
                    '—'
                )}
            </AdminTableCell>

            <AdminTableCell nowrap>
                {entry.event ? (
                    <Badge variant="neutral">{entry.event}</Badge>
                ) : (
                    '—'
                )}
            </AdminTableCell>

            <AdminTableCell>
                {entry.changes.length === 0 ? (
                    <span style={{ color: 'var(--wc-gray-500)' }}>
                        {activityLogCopy.noChanges}
                    </span>
                ) : (
                    <ul
                        style={{
                            margin: 0,
                            padding: 0,
                            listStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        {entry.changes.map((change) => (
                            <li
                                key={change.field}
                                style={{
                                    fontSize: 12,
                                    color: 'var(--wc-gray-600, #475569)',
                                }}
                            >
                                <strong>{change.field}</strong>:{' '}
                                <span
                                    style={{
                                        textDecoration: 'line-through',
                                        opacity: 0.6,
                                    }}
                                >
                                    {change.from}
                                </span>{' '}
                                → {change.to}
                            </li>
                        ))}
                    </ul>
                )}
            </AdminTableCell>

            <AdminTableCell nowrap>
                <div>{entry.ago ?? '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--wc-gray-500)' }}>
                    {entry.at ?? ''}
                </div>
            </AdminTableCell>
        </tr>
    );
}
