// resources/js/pages/nurse/appointments/appointments.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Nurse daily appointment monitor — thin composer.

import { router } from '@inertiajs/react';
import type { ChangeEvent, ReactElement } from 'react';
import { NurseDashboardLayout } from '@/pages/nurse/layout/nurse-dashboard-layout';
import type { PageProps } from '@/types';
import type {
    AppointmentMonitorStats,
    MonitoredAppointment,
} from './appointments-data';
import { appointmentMonitorMeta } from './appointments-data';
import { MonitorStats } from './sections/monitor-stats';
import { MonitorTable } from './sections/monitor-table';

interface PageData extends PageProps {
    date: string;
    dateLabel: string;
    isToday: boolean;
    stats: AppointmentMonitorStats;
    appointments: MonitoredAppointment[];
}

export default function NurseAppointmentsPage({
    date,
    dateLabel,
    isToday,
    stats,
    appointments,
}: PageData): ReactElement {
    const meta = appointmentMonitorMeta;

    function handleDateChange(event: ChangeEvent<HTMLInputElement>): void {
        router.get(
            '/nurse/appointments',
            { date: event.target.value },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <NurseDashboardLayout activeId={meta.activeNavId}>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)',
                }}
            >
                <div>
                    <h1
                        style={{
                            margin: '0 0 var(--space-1)',
                            fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.15,
                            color: 'var(--wc-dark)',
                            fontFamily:
                                "var(--font-display,'Bricolage Grotesque')",
                        }}
                    >
                        {meta.pageTitle}
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-gray-500)',
                        }}
                    >
                        {meta.dateLabel}{' '}
                        <strong style={{ color: 'var(--wc-gray-700)' }}>
                            {dateLabel}
                        </strong>
                        {isToday ? ` · ${meta.todayLabel}` : ''}
                    </p>
                </div>

                <input
                    type="date"
                    value={date}
                    onChange={handleDateChange}
                    aria-label={meta.dateLabel}
                    style={{
                        padding: '9px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--wc-gray-200)',
                        background: 'var(--wc-white)',
                        fontSize: 'var(--text-sm)',
                        fontFamily: 'var(--font-sans)',
                        color: 'var(--wc-gray-700)',
                    }}
                />
            </div>

            <MonitorStats stats={stats} />
            <MonitorTable appointments={appointments} />
        </NurseDashboardLayout>
    );
}
