// resources/js/pages/nurse/dashboard/sections/upcoming-list.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Today's schedule, first few appointments. Full list lives at
// /nurse/appointments.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { StatusPill } from '@/pages/nurse/components/status-pill';
import type { UpcomingAppointment } from '../dashboard-data';
import { nurseDashboardPageMeta } from '../dashboard-data';

interface UpcomingListProps {
    appointments: UpcomingAppointment[];
}

export function UpcomingList({
    appointments,
}: UpcomingListProps): ReactElement {
    const meta = nurseDashboardPageMeta;

    return (
        <section
            style={{
                background: 'var(--wc-white)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 16,
                marginBottom: 'var(--space-6)',
                overflow: 'hidden',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
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
                    {meta.upcomingTitle}
                </h2>
                <Link
                    href="/nurse/appointments"
                    style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--wc-blue-600)',
                        textDecoration: 'none',
                    }}
                >
                    {meta.upcomingViewAll}
                </Link>
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
                    {meta.upcomingEmpty}
                </p>
            ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {appointments.map((appointment, index) => (
                        <li
                            key={appointment.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-4)',
                                padding: 'var(--space-4) var(--space-5)',
                                borderTop:
                                    index === 0
                                        ? 'none'
                                        : '1px solid var(--wc-gray-100)',
                            }}
                        >
                            <span
                                style={{
                                    width: 38,
                                    height: 38,
                                    flexShrink: 0,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#eff6ff',
                                    color: 'var(--wc-blue-600)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                }}
                            >
                                {appointment.initials}
                            </span>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        color: 'var(--wc-dark)',
                                    }}
                                >
                                    {appointment.patient}
                                </p>
                                <p
                                    style={{
                                        margin: '2px 0 0',
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    {appointment.service}
                                    {appointment.doctor
                                        ? ` · ${appointment.doctor}`
                                        : ''}
                                </p>
                            </div>

                            <span
                                style={{
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    color: 'var(--wc-gray-600)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {appointment.time}
                            </span>

                            <StatusPill status={appointment.status} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
