// resources/js/pages/admin/staff/components/staff-row.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One clinical account in the Staff & Credentials table.
//
// The two columns that matter are Credential and Booking, and they are shown
// side by side on purpose: "verified" and "bookable" are the same fact seen
// from two directions, and a row where they disagree is the thing an
// administrator needs to notice.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Button } from '@/design-system';
import { AdminTableCell } from '@/pages/admin/components/admin-table';
import {
    expiryLabel,
    expiryTone,
    roleLabels,
    staffCopy,
} from '@/pages/admin/staff/staff-data';
import type { StaffRow } from '@/pages/admin/staff/staff-data';

type BadgeVariant =
    | 'primary'
    | 'sky'
    | 'success'
    | 'warning'
    | 'error'
    | 'neutral'
    | 'dark';

interface StaffRowProps {
    staff: StaffRow;
}

export function StaffTableRow({ staff }: StaffRowProps): ReactElement {
    return (
        <tr>
            <AdminTableCell>
                <div style={{ display: 'grid', gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>
                        {staff.displayName ?? staff.name}
                    </span>
                    <span
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {staff.email}
                    </span>
                </div>
            </AdminTableCell>

            <AdminTableCell nowrap>
                {roleLabels[staff.role] ?? staff.role}
            </AdminTableCell>

            <AdminTableCell nowrap>
                {staff.specialtyLabel ?? (
                    <span style={{ color: 'var(--wc-text-muted)' }}>—</span>
                )}
            </AdminTableCell>

            <AdminTableCell nowrap>
                <Badge variant={staff.credentialTone as BadgeVariant}>
                    {staff.credentialLabel}
                </Badge>
            </AdminTableCell>

            <AdminTableCell nowrap>
                <div style={{ display: 'grid', gap: 2 }}>
                    <span>{staff.prcExpiresOn ?? '—'}</span>
                    <Badge
                        variant={expiryTone(
                            staff.daysUntilExpiry,
                            staff.hasLapsed,
                        )}
                    >
                        {expiryLabel(staff.daysUntilExpiry, staff.hasLapsed)}
                    </Badge>
                </div>
            </AdminTableCell>

            <AdminTableCell nowrap>
                <Badge variant={staff.isPublished ? 'success' : 'neutral'} dot>
                    {staff.isPublished
                        ? staffCopy.published
                        : staffCopy.notPublished}
                </Badge>
            </AdminTableCell>

            <AdminTableCell nowrap>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Link href={`/admin/staff/${staff.id}`}>
                        <Button variant="outline" size="xs">
                            {staffCopy.viewFile}
                        </Button>
                    </Link>

                    {staff.pendingScheduleDays > 0 && (
                        <Badge variant="warning">
                            {staff.pendingScheduleDays} day
                            {staff.pendingScheduleDays === 1 ? '' : 's'} to
                            approve
                        </Badge>
                    )}
                </div>
            </AdminTableCell>
        </tr>
    );
}
