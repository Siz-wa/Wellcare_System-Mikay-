// resources/js/pages/admin/staff/sections/roster-queue.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The schedule approval queue.
//
// Grouped by doctor rather than listed per block: an administrator agrees a
// week of duty hours, not seven independent rows.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Button, Card, Field, Textarea } from '@/design-system';
import { AdminModal } from '@/pages/admin/components/admin-modal';
import {
    AdminTable,
    AdminTableCell,
} from '@/pages/admin/components/admin-table';
import { rosterColumns, staffCopy } from '@/pages/admin/staff/staff-data';
import type { PendingRoster } from '@/pages/admin/staff/staff-data';

interface RosterQueueProps {
    pending: PendingRoster[];
}

export function RosterQueue({ pending }: RosterQueueProps): ReactElement {
    const [sendingBack, setSendingBack] = useState<PendingRoster | null>(null);
    const [remarks, setRemarks] = useState('');

    const publish = (doctorId: number) => {
        router.post(
            `/admin/staff/${doctorId}/schedule/publish`,
            {},
            { preserveScroll: true },
        );
    };

    const sendBack = () => {
        if (!sendingBack) {
            return;
        }

        router.post(
            `/admin/staff/${sendingBack.doctorId}/schedule/reject`,
            { remarks },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSendingBack(null);
                    setRemarks('');
                },
            },
        );
    };

    return (
        <>
            <Card>
                <AdminTable
                    columns={rosterColumns}
                    emptyMessage={staffCopy.rosterEmpty}
                    isEmpty={pending.length === 0}
                >
                    {pending.map((roster) => (
                        <tr key={roster.doctorId}>
                            <AdminTableCell>
                                <span style={{ fontWeight: 600 }}>
                                    {roster.name}
                                </span>
                            </AdminTableCell>

                            <AdminTableCell>
                                <div style={{ display: 'grid', gap: 4 }}>
                                    {roster.days.map((day) => (
                                        <span key={day.id}>
                                            <strong>{day.label}</strong>{' '}
                                            {day.startTime}–{day.endTime}{' '}
                                            <span
                                                style={{
                                                    color: 'var(--wc-text-muted)',
                                                }}
                                            >
                                                ({day.slotDuration} min slots)
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                {roster.submittedAt ?? '—'}
                            </AdminTableCell>

                            <AdminTableCell nowrap>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <Button
                                        size="xs"
                                        onClick={() => publish(roster.doctorId)}
                                    >
                                        {staffCopy.publishSchedule}
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => {
                                            setSendingBack(roster);
                                            setRemarks('');
                                        }}
                                    >
                                        {staffCopy.rejectSchedule}
                                    </Button>
                                </div>
                            </AdminTableCell>
                        </tr>
                    ))}
                </AdminTable>
            </Card>

            <AdminModal
                title={staffCopy.rejectScheduleTitle}
                open={sendingBack !== null}
                onClose={() => setSendingBack(null)}
            >
                <p
                    style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-secondary)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    {staffCopy.rejectScheduleHelp}
                </p>

                <Field label={staffCopy.remarksLabel} required>
                    <Textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={3}
                        placeholder="e.g. Clashes with the Monday laboratory rounds."
                    />
                </Field>

                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        justifyContent: 'flex-end',
                        marginTop: 'var(--space-4)',
                    }}
                >
                    <Button
                        variant="ghost"
                        onClick={() => setSendingBack(null)}
                    >
                        {staffCopy.cancel}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={sendBack}
                        disabled={remarks.trim() === ''}
                    >
                        {staffCopy.rejectSchedule}
                    </Button>
                </div>
            </AdminModal>
        </>
    );
}
