// resources/js/pages/admin/archive/sections/archived-appointments.tsx

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Button, Card, CardBody, CardHeader } from '@/design-system';
import {
    appointmentColumns,
    archiveCopy,
} from '@/pages/admin/archive/archive-data';
import type { ArchivedAppointment } from '@/pages/admin/archive/archive-data';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';

interface ArchivedAppointmentsProps {
    rows: ArchivedAppointment[];
}

export function ArchivedAppointments({
    rows,
}: ArchivedAppointmentsProps): ReactElement {
    const restore = (id: number) => {
        if (!window.confirm(archiveCopy.restoreAppointmentConfirm)) {
            return;
        }

        router.post(
            `/admin/archive/appointments/${id}/restore`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <Card>
            <CardHeader>{archiveCopy.appointmentsTitle}</CardHeader>
            <CardBody>
                <AdminTable
                    columns={appointmentColumns}
                    isEmpty={rows.length === 0}
                    emptyMessage={archiveCopy.appointmentsEmpty}
                >
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <AdminTableCell>
                                <div style={{ fontWeight: 600 }}>
                                    {row.patient}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    {row.email}
                                </div>
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.service}
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.doctor ?? '—'}
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.date ?? '—'}
                                {row.time ? ` · ${row.time}` : ''}
                                <div style={{ marginTop: 4 }}>
                                    <Badge variant="neutral">
                                        {row.status}
                                    </Badge>
                                </div>
                            </AdminTableCell>
                            <AdminTableCell>{row.reason ?? '—'}</AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.archivedAt ?? '—'}
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => restore(row.id)}
                                >
                                    {archiveCopy.restore}
                                </Button>
                            </AdminTableCell>
                        </tr>
                    ))}
                </AdminTable>
            </CardBody>
        </Card>
    );
}
