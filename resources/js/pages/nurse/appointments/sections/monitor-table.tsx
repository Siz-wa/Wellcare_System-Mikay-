// resources/js/pages/nurse/appointments/sections/monitor-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The day list. Read-only — every row links out to the patient record, and
// nothing here mutates an appointment.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { StatusPill } from '@/pages/nurse/components/status-pill';
import type { MonitoredAppointment } from '../appointments-data';
import { appointmentMonitorMeta } from '../appointments-data';

interface MonitorTableProps {
    appointments: MonitoredAppointment[];
}

const CELL: React.CSSProperties = {
    padding: 'var(--space-4) var(--space-3)',
    fontSize: 'var(--text-sm)',
    color: 'var(--wc-gray-700)',
    verticalAlign: 'middle',
};

const HEAD: React.CSSProperties = {
    padding: 'var(--space-3)',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--wc-gray-500)',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
};

export function MonitorTable({
    appointments,
}: MonitorTableProps): ReactElement {
    const meta = appointmentMonitorMeta;

    return (
        <section
            style={{
                background: 'var(--wc-white)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            <header
                style={{
                    padding: 'var(--space-5)',
                    borderBottom: '1px solid var(--wc-gray-200)',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        color: 'var(--wc-dark)',
                        fontFamily: "var(--font-display,'Bricolage Grotesque')",
                    }}
                >
                    {meta.tableTitle}
                </h2>
                <p
                    style={{
                        margin: '4px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.readOnlyNote}
                </p>
            </header>

            {appointments.length === 0 ? (
                <p
                    style={{
                        margin: 0,
                        padding: 'var(--space-8) var(--space-5)',
                        textAlign: 'center',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.empty}
                </p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            minWidth: 760,
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    borderBottom:
                                        '1px solid var(--wc-gray-200)',
                                }}
                            >
                                <th
                                    style={{
                                        ...HEAD,
                                        paddingLeft: 'var(--space-5)',
                                    }}
                                >
                                    {meta.columns.patient}
                                </th>
                                <th style={HEAD}>{meta.columns.service}</th>
                                <th style={HEAD}>{meta.columns.time}</th>
                                <th style={HEAD}>{meta.columns.doctor}</th>
                                <th style={HEAD}>{meta.columns.coverage}</th>
                                <th
                                    style={{
                                        ...HEAD,
                                        paddingRight: 'var(--space-5)',
                                    }}
                                >
                                    {meta.columns.status}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((appointment) => (
                                <tr
                                    key={appointment.id}
                                    style={{
                                        borderBottom:
                                            '1px solid var(--wc-gray-100)',
                                    }}
                                >
                                    <td
                                        style={{
                                            ...CELL,
                                            paddingLeft: 'var(--space-5)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-3)',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 34,
                                                    height: 34,
                                                    flexShrink: 0,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: '#eff6ff',
                                                    color: 'var(--wc-blue-600)',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {appointment.initials}
                                            </span>
                                            <div style={{ minWidth: 0 }}>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontWeight: 600,
                                                        color: 'var(--wc-dark)',
                                                    }}
                                                >
                                                    {appointment.patient}
                                                </p>
                                                {appointment.recordUrl ? (
                                                    <Link
                                                        href={
                                                            appointment.recordUrl
                                                        }
                                                        style={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            color: 'var(--wc-blue-600)',
                                                            textDecoration:
                                                                'none',
                                                        }}
                                                    >
                                                        {meta.viewRecordLabel}
                                                    </Link>
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontSize: '11px',
                                                            color: 'var(--wc-gray-400)',
                                                        }}
                                                    >
                                                        {meta.noRecordLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={CELL}>{appointment.service}</td>
                                    <td
                                        style={{
                                            ...CELL,
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {appointment.time}
                                    </td>
                                    <td style={CELL}>
                                        {appointment.doctor ?? '—'}
                                    </td>
                                    <td
                                        style={{
                                            ...CELL,
                                            textTransform: 'uppercase',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {appointment.coverage ?? '—'}
                                    </td>
                                    <td
                                        style={{
                                            ...CELL,
                                            paddingRight: 'var(--space-5)',
                                        }}
                                    >
                                        <StatusPill
                                            status={appointment.status}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
