// resources/js/pages/admin/archive/sections/archived-appointments.tsx

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Button, Card, CardBody, CardHeader } from '@/design-system';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
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
    const { confirm, dialog } = useConfirmDialog();

    const restore = async (id: number) => {
        if (
            !(await confirm({
                title: 'Restore this appointment?',
                description: archiveCopy.restoreAppointmentConfirm,
                confirmLabel: 'Restore appointment',
                destructive: false,
            }))
        ) {
            return;
        }

        router.post(
            `/admin/archive/appointments/${id}/restore`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <>
            {dialog}
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
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-text-muted)',
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
                                <AdminTableCell>
                                    {row.reason ?? '—'}
                                </AdminTableCell>
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
        </>
    );
}
