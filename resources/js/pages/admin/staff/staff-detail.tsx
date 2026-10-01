// resources/js/pages/admin/staff/staff-detail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One staff member's credentialing file — Phase 9. Composition only.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Button, Card, CardBody, CardHeader } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { CredentialForm } from '@/pages/admin/staff/components/credential-form';
import { OutOfOfficeForm } from '@/pages/admin/staff/components/out-of-office-form';
import { CredentialPanel } from '@/pages/admin/staff/sections/credential-panel';
import { RosterQueue } from '@/pages/admin/staff/sections/roster-queue';
import { staffCopy } from '@/pages/admin/staff/staff-data';
import type {
    CredentialFile,
    ScheduleDay,
    SelectOption,
    SpecialtyOption,
    StaffRow,
} from '@/pages/admin/staff/staff-data';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    staff: StaffRow;
    credential: CredentialFile | null;
    proposedSchedule: ScheduleDay[];
    specialties: SpecialtyOption[];
    boardStatuses: SelectOption[];
}

export default function AdminStaffDetailPage({
    staff,
    credential,
    proposedSchedule,
    specialties,
    boardStatuses,
}: PageData): ReactElement {
    return (
        <AdminDashboardLayout activeId={staffCopy.activeNavId}>
            <AdminPageHeader
                title={staff.displayName ?? staff.name}
                subtitle={`${staff.email} · ${staffCopy.detailSubtitle}`}
            />

            <div style={{ marginBottom: 'var(--space-5)' }}>
                <Link href="/admin/staff">
                    <Button variant="ghost" size="sm">
                        ← Back to staff
                    </Button>
                </Link>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
                    gap: 'var(--space-5)',
                    alignItems: 'start',
                }}
            >
                <Card>
                    <CardHeader>
                        <span style={{ fontWeight: 700 }}>
                            {staffCopy.detailTitle}
                        </span>
                    </CardHeader>
                    <CardBody>
                        <CredentialForm
                            staffId={staff.id}
                            credential={credential}
                            boardStatuses={boardStatuses}
                        />
                    </CardBody>
                </Card>

                <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
                    <CredentialPanel staff={staff} specialties={specialties} />

                    {staff.role === 'doctor' && (
                        <Card>
                            <CardHeader>
                                <span style={{ fontWeight: 700 }}>
                                    {staffCopy.outOfOffice.title}
                                </span>
                            </CardHeader>
                            <CardBody>
                                <OutOfOfficeForm doctorId={staff.id} />
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* The doctor's own proposed hours, decided from the same page. */}
            {proposedSchedule.length > 0 && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                    <h2
                        style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            marginBottom: 'var(--space-3)',
                        }}
                    >
                        Schedule awaiting approval
                    </h2>

                    <RosterQueue
                        pending={[
                            {
                                doctorId: staff.id,
                                name: staff.displayName ?? staff.name,
                                specialty: staff.specialty,
                                submittedAt: null,
                                days: proposedSchedule,
                            },
                        ]}
                    />
                </div>
            )}

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
