// resources/js/pages/user/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The patient dashboard. Composition only — the overview, the appointment board
// and the history panel each own their own markup under pages/user/dashboard/.

import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ConfirmDialog } from '@/design-system';
import type {
    AppointmentItem,
    DashboardPageProps,
} from '@/pages/user/dashboard/dashboard-data';
import { dashboardCopy } from '@/pages/user/dashboard/dashboard-data';
import { AppointmentBoard } from '@/pages/user/dashboard/sections/appointment-board';
import { DashboardOverview } from '@/pages/user/dashboard/sections/dashboard-overview';
import { HistoryPanel } from '@/pages/user/dashboard/sections/history-panel';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import { RescheduleDialog } from './dashboard/components/reschedule-dialog';

export default function PatientDashboard(): ReactElement {
    const { props } = usePage<DashboardPageProps>();
    const [showHistory, setShowHistory] = useState(false);

    const appointments = props.appointments ?? [];
    const patients = props.appointmentPatients ?? [];
    const pastByPatient = props.pastByPatient ?? [];

    // The controller orders on `appointment_at` in SQL, so the head of the list
    // is genuinely the next thing happening — no client-side date maths needed.
    const nextUp = appointments[0] ?? null;

    const historyCount = pastByPatient.reduce(
        (sum, group) => sum + group.records.length,
        0,
    );

    // Which appointment the confirm dialog is asking about — null when closed.
    // Was a native `confirm()`, which drew the OS dialog and blocked the page
    // thread until it was dismissed.
    const [cancelId, setCancelId] = useState<number | null>(null);
    const [cancelling, setCancelling] = useState(false);
    /** Optional, shown to the doctor with the cancellation notice. */
    const [cancelReason, setCancelReason] = useState('');
    /** The booking being moved — null when the reschedule dialog is closed. */
    const [rescheduling, setRescheduling] = useState<AppointmentItem | null>(
        null,
    );

    function handleCancel(id: number): void {
        setCancelId(id);
    }

    function confirmCancel(): void {
        if (cancelId === null) {
            return;
        }

        setCancelling(true);

        router.post(
            `/user/appointments/${cancelId}/cancel`,
            { reason: cancelReason.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => {
                    setCancelling(false);
                    setCancelId(null);
                    setCancelReason('');
                },
            },
        );
    }

    return (
        <PatientDashboardLayout activeId="dashboard">
            <DashboardOverview
                firstName={props.auth?.user?.first_name ?? 'there'}
                peopleCount={patients.length}
                stats={props.stats}
                nextUp={nextUp}
            />

            <AppointmentBoard
                appointments={appointments}
                patients={patients}
                historyCount={historyCount}
                onOpenHistory={() => setShowHistory(true)}
                onCancel={handleCancel}
                onReschedule={setRescheduling}
            />

            <RescheduleDialog
                appointment={rescheduling}
                window={props.bookingWindow}
                onClose={() => setRescheduling(null)}
            />

            <ConfirmDialog
                open={cancelId !== null}
                onOpenChange={(open) => !open && setCancelId(null)}
                title={dashboardCopy.cancelConfirmTitle}
                description={
                    <span style={{ display: 'grid', gap: 10 }}>
                        <span>{dashboardCopy.cancelConfirm}</span>
                        <span style={{ fontSize: 'var(--text-sm)' }}>
                            {dashboardCopy.cancelLateNote}
                        </span>
                        <label style={{ display: 'grid', gap: 4 }}>
                            <span style={{ fontWeight: 600 }}>
                                {dashboardCopy.cancelReasonLabel}
                            </span>
                            <textarea
                                className="wc-input wc-textarea"
                                rows={2}
                                maxLength={500}
                                value={cancelReason}
                                onChange={(e) =>
                                    setCancelReason(e.target.value)
                                }
                                placeholder={
                                    dashboardCopy.cancelReasonPlaceholder
                                }
                            />
                        </label>
                    </span>
                }
                confirmLabel={dashboardCopy.cancelConfirmAction}
                cancelLabel={dashboardCopy.cancelConfirmDismiss}
                processing={cancelling}
                onConfirm={confirmCancel}
            />

            {showHistory && (
                <HistoryPanel
                    groups={pastByPatient}
                    onClose={() => setShowHistory(false)}
                />
            )}
        </PatientDashboardLayout>
    );
}
