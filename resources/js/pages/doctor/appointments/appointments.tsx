// resources/js/pages/doctor/dashboard/appointments/appointments.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TOAST CHANGES:
//   - Added LocalToast + useToast hook
//   - Confirm and Cancel actions now call showToast on success/error
//   - CancelModal receives onSuccess/onError callbacks
//   - All router.post calls use preserveScroll: true to prevent page jump

import { router, usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState, useCallback, useEffect } from 'react';
import type { PageProps } from '@/types';
import { DashboardLayout } from '../layout/dashboard-layout';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentItem {
    id: number;
    patientId: string;
    patient: string;
    initials: string;
    email: string;
    contactNumber: string;
    age: number;
    gender: string;
    service: string;
    date: string;
    rawDate: string;
    time: string;
    patientStatus: string;
    coverage: string;
    hmo: string | null;
    status: string;
    additionalInfo: string | null;
    isToday: boolean;
    isTomorrow: boolean;
}

interface Stats {
    pending: number;
    confirmed: number;
    today: number;
}

interface PageData extends PageProps {
    appointments: AppointmentItem[];
    stats: Stats;
}

// ── Local toast ───────────────────────────────────────────────────────────────

interface ToastState {
    message: string;
    type: 'success' | 'error';
    key: number;
}

function LocalToast({
    toast,
    onDismiss,
}: {
    toast: ToastState;
    onDismiss: () => void;
}): ReactElement {
    useEffect(() => {
        const t = setTimeout(onDismiss, 4000);

        return () => clearTimeout(t);
    }, [toast.key]);

    const isSuccess = toast.type === 'success';

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 'var(--space-6)',
                right: 'var(--space-6)',
                zIndex: 9999,
                padding: '14px 20px',
                borderRadius: '14px',
                background: isSuccess ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
                color: isSuccess ? '#15803d' : '#b91c1c',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                boxShadow: '0 10px 40px -4px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                maxWidth: 360,
                animation: 'slideUp 0.2s ease',
            }}
        >
            {isSuccess ? (
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            ) : (
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            )}
            {toast.message}
            <button
                onClick={onDismiss}
                style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    padding: 0,
                    fontSize: '16px',
                    lineHeight: 1,
                }}
            >
                ×
            </button>
        </div>
    );
}

function useToast() {
    const [toast, setToast] = useState<ToastState | null>(null);
    const show = useCallback(
        (message: string, type: 'success' | 'error' = 'success') => {
            setToast({ message, type, key: Date.now() });
        },
        [],
    );
    const dismiss = useCallback(() => setToast(null), []);

    return { toast, show, dismiss };
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): ReactElement {
    const config: Record<string, { label: string; bg: string; color: string }> =
        {
            requested: { label: 'Pending', bg: '#fef9c3', color: '#a16207' },
            confirmed: { label: 'Confirmed', bg: '#dcfce7', color: '#15803d' },
            checked_in: {
                label: 'Checked In',
                bg: '#dbeafe',
                color: '#1d4ed8',
            },
        };
    const c = config[status] ?? {
        label: status,
        bg: 'var(--wc-gray-100)',
        color: 'var(--wc-gray-500)',
    };

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 12px',
                borderRadius: '100px',
                background: c.bg,
                color: c.color,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
            }}
        >
            {c.label}
        </span>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
    value,
    label,
    color,
}: {
    value: number;
    label: string;
    color: string;
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
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-xl)',
                    background: `${color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 800,
                        color,
                        fontFamily: 'var(--font-display)',
                    }}
                >
                    {value}
                </span>
            </div>
            <p
                style={{
                    margin: 0,
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--wc-gray-500)',
                }}
            >
                {label}
            </p>
        </div>
    );
}

// ── Cancel modal ──────────────────────────────────────────────────────────────

function CancelModal({
    appointment,
    onClose,
    onSuccess,
    onError,
}: {
    appointment: AppointmentItem;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}): ReactElement {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    function submit(): void {
        setBusy(true);
        router.post(
            `/doctor/appointments/${appointment.id}/cancel`,
            { reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    onSuccess(
                        `Appointment for ${appointment.patient} has been cancelled.`,
                    );
                },
                onError: () => {
                    setBusy(false);
                    onError('Failed to cancel appointment. Please try again.');
                },
                onFinish: () => setBusy(false),
            },
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15,23,42,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    width: '100%',
                    maxWidth: 440,
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: 'var(--shadow-2xl)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    style={{
                        margin: '0 0 6px',
                        fontSize: 'var(--text-lg)',
                        fontWeight: 800,
                        color: 'var(--wc-dark)',
                    }}
                >
                    Cancel Appointment
                </h3>
                <p
                    style={{
                        margin: '0 0 20px',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    This will notify <strong>{appointment.patient}</strong> via
                    email.
                </p>
                <textarea
                    className="wc-input wc-textarea"
                    rows={3}
                    placeholder="Reason for cancellation (optional)…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ marginBottom: 'var(--space-5)' }}
                />
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-3)',
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            height: 40,
                            padding: '0 20px',
                            borderRadius: '10px',
                            border: '1px solid var(--wc-gray-200)',
                            background: 'transparent',
                            fontWeight: 600,
                            fontSize: 'var(--text-sm)',
                            cursor: 'pointer',
                            color: 'var(--wc-gray-600)',
                        }}
                    >
                        Keep
                    </button>
                    <button
                        onClick={submit}
                        disabled={busy}
                        className="wc-btn wc-btn-danger wc-btn-md wc-btn-pill"
                        style={{ opacity: busy ? 0.6 : 1 }}
                    >
                        {busy ? 'Cancelling…' : 'Cancel Appointment'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Appointment row ───────────────────────────────────────────────────────────

function AppointmentRow({
    appt,
    onCancel,
    onConfirmSuccess,
    onConfirmError,
}: {
    appt: AppointmentItem;
    onCancel: (a: AppointmentItem) => void;
    onConfirmSuccess: (msg: string) => void;
    onConfirmError: (msg: string) => void;
}): ReactElement {
    const [confirming, setConfirming] = useState(false);

    function handleConfirm(): void {
        setConfirming(true);
        router.post(
            `/doctor/appointments/${appt.id}/confirm`,
            {},
            {
                preserveScroll: true,
                onSuccess: () =>
                    onConfirmSuccess(
                        `Appointment confirmed. Confirmation email sent to ${appt.email}.`,
                    ),
                onError: () =>
                    onConfirmError(
                        'Failed to confirm appointment. Please try again.',
                    ),
                onFinish: () => setConfirming(false),
            },
        );
    }

    const dateLabel = appt.isToday
        ? 'Today'
        : appt.isTomorrow
          ? 'Tomorrow'
          : appt.date;

    return (
        <tr
            style={{
                borderBottom: '1px solid var(--wc-gray-100)',
                transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background =
                    'var(--wc-gray-50)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background =
                    'transparent';
            }}
        >
            {/* Patient */}
            <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
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
                        {appt.initials}
                    </div>
                    <div>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-sm)',
                                fontWeight: 700,
                                color: 'var(--wc-dark)',
                            }}
                        >
                            {appt.patient}
                        </p>
                        <p
                            style={{
                                margin: '1px 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-gray-400)',
                            }}
                        >
                            {appt.age} yrs ·{' '}
                            <span style={{ textTransform: 'capitalize' }}>
                                {appt.gender}
                            </span>{' '}
                            ·{' '}
                            {appt.patientStatus === 'new' ? 'New' : 'Returning'}
                        </p>
                    </div>
                </div>
            </td>

            {/* Service */}
            <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--wc-dark)',
                    }}
                >
                    {appt.service}
                </p>
                <p
                    style={{
                        margin: '1px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-400)',
                        textTransform: 'capitalize',
                    }}
                >
                    {appt.coverage}
                    {appt.hmo ? ` · ${appt.hmo}` : ''}
                </p>
            </td>

            {/* Date / Time */}
            <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: appt.isToday
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
                    {appt.time}
                </p>
            </td>

            {/* Status */}
            <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                <StatusBadge status={appt.status} />
            </td>

            {/* Actions */}
            <td
                style={{
                    padding: 'var(--space-4) var(--space-5)',
                    textAlign: 'right',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-2)',
                    }}
                >
                    {appt.status === 'requested' && (
                        <button
                            onClick={handleConfirm}
                            disabled={confirming}
                            style={{
                                height: 34,
                                padding: '0 16px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--wc-blue-600)',
                                color: '#fff',
                                border: 'none',
                                cursor: confirming ? 'not-allowed' : 'pointer',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                opacity: confirming ? 0.6 : 1,
                                transition: 'opacity 0.15s',
                            }}
                        >
                            {confirming ? 'Confirming…' : '✓ Confirm'}
                        </button>
                    )}
                    {['requested', 'confirmed'].includes(appt.status) && (
                        <button
                            onClick={() => onCancel(appt)}
                            style={{
                                height: 34,
                                padding: '0 14px',
                                borderRadius: 'var(--radius-full)',
                                background: 'transparent',
                                color: 'var(--wc-error)',
                                border: '1px solid var(--wc-error)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                            }}
                        >
                            Cancel
                        </button>
                    )}
                    {appt.status === 'confirmed' && (
                        <span
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-gray-400)',
                                fontWeight: 500,
                            }}
                        >
                            Awaiting check-in
                        </span>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DoctorAppointmentsPage(): ReactElement {
    const { props } = usePage<PageData>();
    const [cancelTarget, setCancelTarget] = useState<AppointmentItem | null>(
        null,
    );
    const [search, setSearch] = useState('');

    const { toast, show: showToast, dismiss: dismissToast } = useToast();

    const filterAppts = (list: AppointmentItem[]) =>
        search.trim()
            ? list.filter(
                  (a) =>
                      a.patient.toLowerCase().includes(search.toLowerCase()) ||
                      a.service.toLowerCase().includes(search.toLowerCase()) ||
                      a.date.toLowerCase().includes(search.toLowerCase()),
              )
            : list;

    const today = filterAppts(props.appointments.filter((a) => a.isToday));
    const upcoming = filterAppts(props.appointments.filter((a) => !a.isToday));

    return (
        <DashboardLayout activeId="appointments">
            {/* ── Header ── */}
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
                            lineHeight: 1.15,
                            color: 'var(--wc-dark)',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        Appointments
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            color: 'var(--wc-gray-500)',
                            fontSize: 'var(--text-base)',
                        }}
                    >
                        Review and confirm upcoming patient appointments
                    </p>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)',
                }}
            >
                <StatCard
                    value={props.stats.pending}
                    label="Awaiting Confirmation"
                    color="#ca8a04"
                />
                <StatCard
                    value={props.stats.confirmed}
                    label="Confirmed"
                    color="#16a34a"
                />
                <StatCard
                    value={props.stats.today}
                    label="Today's Schedule"
                    color="var(--wc-blue-600)"
                />
            </div>

            {/* ── Search bar ── */}
            <div
                style={{ position: 'relative', marginBottom: 'var(--space-6)' }}
            >
                <span
                    style={{
                        position: 'absolute',
                        left: 'var(--space-4)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--wc-gray-400)',
                        display: 'flex',
                        pointerEvents: 'none',
                    }}
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </span>
                <input
                    type="search"
                    className="wc-input"
                    placeholder="Search by patient name, service or date…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        paddingLeft: 'calc(var(--space-4) + 22px)',
                        fontSize: 'var(--text-sm)',
                        width: '100%',
                        maxWidth: 480,
                    }}
                />
            </div>

            {/* ── Today section ── */}
            {today.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--wc-blue-600)',
                                flexShrink: 0,
                                display: 'inline-block',
                            }}
                        />
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-base)',
                                fontWeight: 700,
                                color: 'var(--wc-dark)',
                            }}
                        >
                            Today
                        </h2>
                    </div>
                    <div className="wc-card" style={{ overflow: 'hidden' }}>
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                            }}
                        >
                            <thead>
                                <tr>
                                    {[
                                        'Patient',
                                        'Service',
                                        'Time',
                                        'Status',
                                        'Actions',
                                    ].map((col) => (
                                        <th
                                            key={col}
                                            style={{
                                                padding: '10px var(--space-5)',
                                                textAlign:
                                                    col === 'Actions'
                                                        ? 'right'
                                                        : 'left',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                color: 'var(--wc-gray-400)',
                                                letterSpacing: '0.07em',
                                                textTransform: 'uppercase',
                                                borderBottom:
                                                    '1px solid var(--wc-gray-100)',
                                            }}
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {today.map((a) => (
                                    <AppointmentRow
                                        key={a.id}
                                        appt={a}
                                        onCancel={setCancelTarget}
                                        onConfirmSuccess={(msg) =>
                                            showToast(msg)
                                        }
                                        onConfirmError={(msg) =>
                                            showToast(msg, 'error')
                                        }
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Upcoming section ── */}
            <div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--wc-gray-300)',
                            flexShrink: 0,
                            display: 'inline-block',
                        }}
                    />
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        Upcoming
                    </h2>
                </div>
                <div className="wc-card" style={{ overflow: 'hidden' }}>
                    <table
                        style={{ width: '100%', borderCollapse: 'collapse' }}
                    >
                        <thead>
                            <tr>
                                {[
                                    'Patient',
                                    'Service',
                                    'Date / Time',
                                    'Status',
                                    'Actions',
                                ].map((col) => (
                                    <th
                                        key={col}
                                        style={{
                                            padding: '10px var(--space-5)',
                                            textAlign:
                                                col === 'Actions'
                                                    ? 'right'
                                                    : 'left',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            color: 'var(--wc-gray-400)',
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            borderBottom:
                                                '1px solid var(--wc-gray-100)',
                                        }}
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {upcoming.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        style={{
                                            padding: '48px',
                                            textAlign: 'center',
                                            color: 'var(--wc-gray-400)',
                                            fontSize: 'var(--text-sm)',
                                        }}
                                    >
                                        No upcoming appointments.
                                    </td>
                                </tr>
                            ) : (
                                upcoming.map((a) => (
                                    <AppointmentRow
                                        key={a.id}
                                        appt={a}
                                        onCancel={setCancelTarget}
                                        onConfirmSuccess={(msg) =>
                                            showToast(msg)
                                        }
                                        onConfirmError={(msg) =>
                                            showToast(msg, 'error')
                                        }
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Cancel modal ── */}
            {cancelTarget && (
                <CancelModal
                    appointment={cancelTarget}
                    onClose={() => setCancelTarget(null)}
                    onSuccess={(msg) => showToast(msg)}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {/* ── Local toast ── */}
            {toast && <LocalToast toast={toast} onDismiss={dismissToast} />}
        </DashboardLayout>
    );
}
