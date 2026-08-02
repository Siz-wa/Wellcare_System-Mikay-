// resources/js/pages/nurse/components/status-pill.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Appointment status pill, shared by the dashboard's upcoming list and the
// appointment monitor. Colours come from appointment-status-data.ts.

import type { ReactElement } from 'react';
import type { AppointmentStatus } from './appointment-status-data';
import { statusStyles } from './appointment-status-data';

interface StatusPillProps {
    status: AppointmentStatus;
}

export function StatusPill({ status }: StatusPillProps): ReactElement {
    const style = statusStyles[status] ?? statusStyles.requested;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                background: style.bg,
                color: style.color,
            }}
        >
            {style.label}
        </span>
    );
}
