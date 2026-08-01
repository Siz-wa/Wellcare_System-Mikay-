// resources/js/pages/user/dashboard/components/appointment-list.tsx
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useInView } from '@/hooks/useInView';
import { todayAppointments, dashboardMeta } from '../dashboard-data';
import type { TodayAppointment } from '../dashboard-data';
import { StatusBadge } from '../icons';
import { IconClock, IconArrowRight } from '../icons';

function AppointmentRow({
    appt,
    delay,
    inView,
}: {
    appt: TodayAppointment;
    delay: number;
    inView: boolean;
}): ReactElement {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderBottom: '1px solid #f1f3f4',
                borderRadius: hovered ? '16px' : '0',
                background: hovered ? '#f8f9fa' : 'transparent',
                marginInline: hovered ? '-16px' : '0',
                cursor: 'pointer',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 350ms ease ${delay}ms, transform 350ms ease ${delay}ms, background 150ms ease, border-radius 150ms ease, margin 150ms ease`,
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: appt.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                    transition: 'transform 200ms ease',
                    transform: hovered ? 'scale(1.1)' : 'scale(1)',
                }}
            >
                {appt.initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f1f1f',
                        lineHeight: 1.3,
                    }}
                >
                    {appt.name}
                </p>
                <p
                    style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#70757a',
                        lineHeight: 1.3,
                    }}
                >
                    {appt.service}
                </p>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: hovered ? '#444746' : '#70757a',
                    fontSize: '12px',
                    flexShrink: 0,
                    transition: 'color 150ms ease',
                }}
            >
                <IconClock /> {appt.time}
            </div>

            <div style={{ flexShrink: 0 }}>
                <StatusBadge status={appt.status} />
            </div>
        </div>
    );
}

export function AppointmentList(): ReactElement {
    const meta = dashboardMeta;
    const { ref, inView } = useInView(0.1);

    return (
        <div
            ref={ref}
            style={{
                background: '#ffffff',
                border: '1px solid #e3e3e3',
                borderRadius: '32px',
                padding: '32px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 500ms ease, transform 500ms ease',
                willChange: 'transform, opacity',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#1f1f1f',
                    }}
                >
                    {meta.todayAppointmentsTitle}
                </h2>
                <a
                    href="/appointments"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#1a73e8',
                        textDecoration: 'none',
                    }}
                >
                    {meta.viewAll} <IconArrowRight />
                </a>
            </div>

            <div>
                {todayAppointments.map((appt, i) => (
                    <AppointmentRow
                        key={appt.id}
                        appt={appt}
                        delay={i * 60}
                        inView={inView}
                    />
                ))}
            </div>
        </div>
    );
}
