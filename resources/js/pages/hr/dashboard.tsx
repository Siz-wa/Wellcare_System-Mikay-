// resources/js/pages/hr/dashboard/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HR / HMO Officer overview dashboard.
// Shows pending HMO queue, today's stats, and quick action links.

import { Link, usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { HRDashboardLayout } from '@/pages/hr/layout/hr-dashboard-layout';
import type { PageProps } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingItem {
    id: number;
    patient: string;
    initials: string;
    service: string;
    date: string;
    time: string;
    hmo: string | null;
    hmoId: string | null;
    isToday: boolean;
    isTomorrow: boolean;
}

interface Stats {
    pendingHmo: number;
    approvedToday: number;
    rejectedToday: number;
    totalAppointments: number;
}

interface PageData extends PageProps {
    pending: PendingItem[];
    stats: Stats;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
    value,
    label,
    color,
    icon,
}: {
    value: number;
    label: string;
    color: string;
    icon: ReactElement;
}): ReactElement {
    return (
        <div
            className="wc-card"
            style={{
                padding: 'var(--space-5) var(--space-6)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
            }}
        >
            <div
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-xl)',
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 14px -2px ${color}60`,
                }}
            >
                {icon}
            </div>
            <div>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-3xl)',
                        fontWeight: 800,
                        color: 'var(--wc-dark)',
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {value}
                </p>
                <p
                    style={{
                        margin: '3px 0 0',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {label}
                </p>
            </div>
        </div>
    );
}

// ── Quick pending row ─────────────────────────────────────────────────────────

function PendingRow({ item }: { item: PendingItem }): ReactElement {
    const dateLabel = item.isToday
        ? 'Today'
        : item.isTomorrow
          ? 'Tomorrow'
          : item.date;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--wc-gray-100)',
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    background: 'var(--wc-blue-600)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 800,
                    flexShrink: 0,
                }}
            >
                {item.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--wc-dark)',
                    }}
                >
                    {item.patient}
                </p>
                <p
                    style={{
                        margin: '1px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {item.service} · {item.hmo ?? 'HMO'} · ID:{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.hmoId ?? '—'}
                    </span>
                </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: item.isToday
                            ? 'var(--wc-blue-600)'
                            : 'var(--wc-dark)',
                    }}
                >
                    {dateLabel}
                </p>
                <p
                    style={{
                        margin: '1px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-400)',
                    }}
                >
                    {item.time}
                </p>
            </div>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 12px',
                    borderRadius: '100px',
                    background: '#f5f3ff',
                    color: '#7c3aed',
                    fontSize: '11px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: '1px solid #ede9fe',
                }}
            >
                Pending HMO
            </span>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HRDashboard(): ReactElement {
    const { props } = usePage<PageData>();
    const user = (props.auth as any)?.user;
    const firstName = user?.first_name ?? 'there';
    const hour = new Date().getHours();
    const greeting =
        hour < 12
            ? 'Good morning'
            : hour < 18
              ? 'Good afternoon'
              : 'Good evening';

    return (
        <HRDashboardLayout activeId="dashboard">
            {/* Welcome */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-8)',
                }}
            >
                <div>
                    <h1
                        style={{
                            margin: '0 0 var(--space-1)',
                            fontSize: 'var(--text-3xl)',
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            color: 'var(--wc-dark)',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {greeting},{' '}
                        <span style={{ color: 'var(--wc-blue-600)' }}>
                            {firstName}
                        </span>{' '}
                        👋
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            color: 'var(--wc-gray-500)',
                            fontSize: 'var(--text-base)',
                        }}
                    >
                        Here's the HMO queue and today's appointment overview.
                    </p>
                </div>
                <Link
                    href="/hr/hmo-approvals"
                    className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                >
                    Review HMO Queue
                </Link>
            </div>

            {/* Stats */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)',
                }}
            >
                <StatCard
                    value={props.stats.pendingHmo}
                    label="Pending HMO Review"
                    color="#8B5CF6"
                    icon={
                        <svg
                            width="22"
                            height="22"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    }
                />
                <StatCard
                    value={props.stats.approvedToday}
                    label="Approved Today"
                    color="#10B981"
                    icon={
                        <svg
                            width="22"
                            height="22"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    }
                />
                <StatCard
                    value={props.stats.rejectedToday}
                    label="Rejected Today"
                    color="#EF4444"
                    icon={
                        <svg
                            width="22"
                            height="22"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    }
                />
                <StatCard
                    value={props.stats.totalAppointments}
                    label="Total Appointments"
                    color="#2B59C3"
                    icon={
                        <svg
                            width="22"
                            height="22"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    }
                />
            </div>

            {/* Info banner if queue is empty */}
            {props.stats.pendingHmo > 0 && (
                <div
                    style={{
                        padding: '14px 20px',
                        borderRadius: '12px',
                        background: '#faf5ff',
                        border: '1px solid #e9d5ff',
                        marginBottom: 'var(--space-6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '10px',
                                background: '#8B5CF6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                fill="none"
                                stroke="#fff"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-sm)',
                                fontWeight: 600,
                                color: '#5b21b6',
                            }}
                        >
                            <strong>
                                {props.stats.pendingHmo} HMO{' '}
                                {props.stats.pendingHmo === 1
                                    ? 'appointment'
                                    : 'appointments'}
                            </strong>{' '}
                            waiting for your review. Approve to forward to the
                            doctor.
                        </p>
                    </div>
                    <Link
                        href="/hr/hmo-approvals"
                        style={{
                            flexShrink: 0,
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: '#7c3aed',
                            textDecoration: 'none',
                        }}
                    >
                        Review all →
                    </Link>
                </div>
            )}

            {/* Pending queue preview */}
            <div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-xl)',
                            fontWeight: 700,
                            color: 'var(--wc-dark)',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        Pending HMO Approvals
                    </h2>
                    {props.pending.length > 0 && (
                        <Link
                            href="/hr/hmo-approvals"
                            style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: 700,
                                color: 'var(--wc-blue-600)',
                                textDecoration: 'none',
                            }}
                        >
                            View all
                        </Link>
                    )}
                </div>

                <div className="wc-card" style={{ overflow: 'hidden' }}>
                    {props.pending.length === 0 ? (
                        <div
                            style={{
                                padding: 'var(--space-12)',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 'var(--radius-2xl)',
                                    background: '#f0fdf4',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto var(--space-4)',
                                }}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    fill="none"
                                    stroke="#16a34a"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <p
                                style={{
                                    margin: '0 0 4px',
                                    fontSize: 'var(--text-base)',
                                    fontWeight: 700,
                                    color: 'var(--wc-gray-600)',
                                }}
                            >
                                All caught up!
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--wc-gray-400)',
                                }}
                            >
                                No HMO appointments pending review right now.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {props.pending.slice(0, 5).map((item) => (
                                <PendingRow key={item.id} item={item} />
                            ))}
                            {props.pending.length > 5 && (
                                <div
                                    style={{
                                        padding:
                                            'var(--space-4) var(--space-5)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Link
                                        href="/hr/hmo-approvals"
                                        style={{
                                            fontSize: 'var(--text-sm)',
                                            fontWeight: 700,
                                            color: 'var(--wc-blue-600)',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        +{props.pending.length - 5} more — View
                                        all
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </HRDashboardLayout>
    );
}
