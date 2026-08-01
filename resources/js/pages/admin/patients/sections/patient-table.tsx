// resources/js/pages/admin/patients/sections/patient-table.tsx

import type { ReactElement } from 'react';
import { Badge, Button, Card, CardBody } from '@/design-system';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import {
    patientColumns,
    patientsCopy,
} from '@/pages/admin/patients/patients-data';
import type { AdminPatientRow } from '@/pages/admin/patients/patients-data';

interface PatientTableProps {
    patients: AdminPatientRow[];
    onEdit: (patient: AdminPatientRow) => void;
}

export function PatientTable({
    patients,
    onEdit,
}: PatientTableProps): ReactElement {
    return (
        <Card>
            <CardBody>
                <AdminTable
                    columns={patientColumns}
                    isEmpty={patients.length === 0}
                    emptyMessage={patientsCopy.tableEmpty}
                >
                    {patients.map((patient) => (
                        <tr key={patient.id}>
                            <AdminTableCell>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: '50%',
                                            background: '#f0fdfa',
                                            color: '#0f766e',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {patient.initials}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {patient.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: 'var(--wc-gray-500)',
                                            }}
                                        >
                                            {patient.email}
                                        </div>
                                    </div>
                                </div>
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                {patient.clinicId ?? '—'}
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                {patient.contactNumber}
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                {patient.coverage ? (
                                    <Badge
                                        variant={
                                            patient.coverage === 'hmo'
                                                ? 'sky'
                                                : 'neutral'
                                        }
                                    >
                                        {patient.coverage}
                                    </Badge>
                                ) : (
                                    '—'
                                )}
                                {patient.hmoProvider && (
                                    <div
                                        style={{
                                            marginTop: 4,
                                            fontSize: 11,
                                            color: 'var(--wc-gray-500)',
                                        }}
                                    >
                                        {patient.hmoProvider}
                                    </div>
                                )}
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                {patient.guarantor ?? '—'}
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                {patient.appointmentCount}
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => onEdit(patient)}
                                >
                                    Edit
                                </Button>
                            </AdminTableCell>
                        </tr>
                    ))}
                </AdminTable>
            </CardBody>
        </Card>
    );
}
