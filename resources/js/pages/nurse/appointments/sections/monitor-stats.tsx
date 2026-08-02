// resources/js/pages/nurse/appointments/sections/monitor-stats.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Five-up stat row across the top of the appointment monitor.

import {
    CalendarCheck2,
    CheckCircle2,
    LogIn,
    Stethoscope,
    XCircle,
} from 'lucide-react';
import type { ReactElement } from 'react';
import type { NurseStat } from '@/pages/nurse/components/nurse-stat-row';
import { NurseStatRow } from '@/pages/nurse/components/nurse-stat-row';
import type { AppointmentMonitorStats } from '../appointments-data';
import { appointmentMonitorMeta } from '../appointments-data';

interface MonitorStatsProps {
    stats: AppointmentMonitorStats;
}

export function MonitorStats({ stats }: MonitorStatsProps): ReactElement {
    const labels = appointmentMonitorMeta.statLabels;

    const cards: NurseStat[] = [
        {
            key: 'total',
            label: labels.total,
            value: stats.total,
            icon: <CalendarCheck2 size={18} strokeWidth={1.8} />,
            color: 'var(--wc-blue-600)',
            bg: '#eff6ff',
        },
        {
            key: 'checkedIn',
            label: labels.checkedIn,
            value: stats.checkedIn,
            icon: <LogIn size={18} strokeWidth={1.8} />,
            color: '#7c3aed',
            bg: '#f5f3ff',
        },
        {
            key: 'inProgress',
            label: labels.inProgress,
            value: stats.inProgress,
            icon: <Stethoscope size={18} strokeWidth={1.8} />,
            color: '#c2410c',
            bg: '#fff7ed',
        },
        {
            key: 'completed',
            label: labels.completed,
            value: stats.completed,
            icon: <CheckCircle2 size={18} strokeWidth={1.8} />,
            color: '#16a34a',
            bg: '#f0fdf4',
        },
        {
            key: 'cancelled',
            label: labels.cancelled,
            value: stats.cancelled,
            icon: <XCircle size={18} strokeWidth={1.8} />,
            color: '#dc2626',
            bg: '#fef2f2',
        },
    ];

    return <NurseStatRow stats={cards} minWidth={180} />;
}
