// resources/js/pages/nurse/dashboard/sections/dashboard-stats.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Stat grid across the top of the nurse dashboard.

import {
    AlertTriangle,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    FileCheck2,
    FlaskConical,
    LogIn,
    Users,
} from 'lucide-react';
import type { ReactElement } from 'react';
import type { NurseStat } from '@/pages/nurse/components/nurse-stat-row';
import { NurseStatRow } from '@/pages/nurse/components/nurse-stat-row';
import type { NurseDashboardStats } from '../dashboard-data';
import { nurseDashboardPageMeta } from '../dashboard-data';

interface DashboardStatsProps {
    stats: NurseDashboardStats;
}

export function DashboardStats({ stats }: DashboardStatsProps): ReactElement {
    const labels = nurseDashboardPageMeta.statLabels;

    const cards: NurseStat[] = [
        {
            key: 'pendingLabs',
            label: labels.pendingLabs,
            value: stats.pendingLabs,
            icon: <FlaskConical size={18} strokeWidth={1.8} />,
            color: 'var(--wc-blue-600)',
            bg: '#eff6ff',
        },
        {
            key: 'criticalToday',
            label: labels.criticalToday,
            value: stats.criticalToday,
            icon: <AlertTriangle size={18} strokeWidth={1.8} />,
            color: '#dc2626',
            bg: '#fef2f2',
        },
        {
            key: 'recordedToday',
            label: labels.recordedToday,
            value: stats.recordedToday,
            icon: <ClipboardCheck size={18} strokeWidth={1.8} />,
            color: '#16a34a',
            bg: '#f0fdf4',
        },
        {
            key: 'appointmentsToday',
            label: labels.appointmentsToday,
            value: stats.appointmentsToday,
            icon: <CalendarCheck2 size={18} strokeWidth={1.8} />,
            color: '#7c3aed',
            bg: '#f5f3ff',
        },
        {
            key: 'checkedInToday',
            label: labels.checkedInToday,
            value: stats.checkedInToday,
            icon: <LogIn size={18} strokeWidth={1.8} />,
            color: '#0891b2',
            bg: '#ecfeff',
        },
        {
            key: 'completedToday',
            label: labels.completedToday,
            value: stats.completedToday,
            icon: <CheckCircle2 size={18} strokeWidth={1.8} />,
            color: '#16a34a',
            bg: '#f0fdf4',
        },
        {
            key: 'pendingLoa',
            label: labels.pendingLoa,
            value: stats.pendingLoa,
            icon: <FileCheck2 size={18} strokeWidth={1.8} />,
            color: '#ca8a04',
            bg: '#fefce8',
        },
        {
            key: 'totalPatients',
            label: labels.totalPatients,
            value: stats.totalPatients,
            icon: <Users size={18} strokeWidth={1.8} />,
            color: '#475569',
            bg: '#f1f5f9',
        },
    ];

    return <NurseStatRow stats={cards} />;
}
