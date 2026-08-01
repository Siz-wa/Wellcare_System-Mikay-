// resources/js/pages/admin/archive/sections/archived-patients.tsx

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Alert, Button, Card, CardBody, CardHeader } from '@/design-system';
import {
    archiveCopy,
    patientColumns,
} from '@/pages/admin/archive/archive-data';
import type { ArchivedPatient } from '@/pages/admin/archive/archive-data';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';

interface ArchivedPatientsProps {
    rows: ArchivedPatient[];
}

export function ArchivedPatients({
    rows,
}: ArchivedPatientsProps): ReactElement {
    const restore = (id: number) => {
        if (!window.confirm(archiveCopy.restorePatientConfirm)) {
            return;
        }

        router.post(
            `/admin/archive/patients/${id}/restore`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <Card>
            <CardHeader>{archiveCopy.patientsTitle}</CardHeader>
            <CardBody>
                {rows.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <Alert variant="info">{archiveCopy.cascadeNote}</Alert>
                    </div>
                )}

                <AdminTable
                    columns={patientColumns}
                    isEmpty={rows.length === 0}
                    emptyMessage={archiveCopy.patientsEmpty}
                >
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <AdminTableCell>
                                <div style={{ fontWeight: 600 }}>
                                    {row.name}
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
                                {row.clinicId ?? '—'}
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.contactNumber ?? '—'}
                            </AdminTableCell>
                            <AdminTableCell nowrap>
                                {row.guarantor ?? '—'}
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
    );
}
