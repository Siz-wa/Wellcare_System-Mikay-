import { Link, usePage, usePoll } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { consultationRoomMeta } from '@/components/consultation-room/consultation-room-data';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';

/**
 * The room the patient asked for is not open.
 *
 * A separate page rather than a branch inside `room.tsx`, because `room.tsx`
 * calls useWebRtc at the top of its body and hooks cannot be skipped — rendering
 * a "call ended" message from inside it would still turn the camera on to say
 * so.
 */

/**
 * How often this page re-asks whether the room came back.
 *
 * A patient who is dropped mid-consultation lands here, and the doctor's next
 * move is almost always to reopen the room. Nothing pushed that: the page was
 * static, so the patient sat on "This call has ended" while a reopened room
 * waited for them, and only a manual refresh revealed it.
 *
 * A full reload, deliberately — no `only`. When the session goes live again the
 * controller renders the *room* component for this same URL, and swapping the
 * page component is exactly what a partial reload cannot do.
 *
 * Faster than the list's 15s because someone is actively waiting on the far end.
 */
const POLL_MS = 8000;

type ClosedReason = keyof typeof consultationRoomMeta.closedReasons;

interface PageProps {
    appointment: {
        id: number;
        service: string;
        date: string;
        time: string;
        doctor: string | null;
    };
    reason: ClosedReason;
    /**
     * Only ever present on the `unpaid` branch. "You have not paid" with no
     * figure and no reference to quote at the counter is a dead end.
     */
    payment: {
        reference: string;
        amountDue: number;
        status: string;
        dueAt: string | null;
    } | null;
    [key: string]: unknown;
}

export default function PatientConsultationClosed(): ReactElement {
    const { appointment, reason, payment } = usePage<PageProps>().props;
    const copy = consultationRoomMeta.closedReasons[reason];

    // Only while the room could still come back. A finalized note is terminal —
    // polling it would be a request every eight seconds, forever, for an answer
    // that can never change. An unpaid visit is equally static from here: it
    // waits on the patient paying and a person checking, neither of which
    // happens in the next eight seconds.
    usePoll(
        POLL_MS,
        {},
        { autoStart: reason !== 'finalized' && reason !== 'unpaid' },
    );

    return (
        <PatientDashboardLayout activeId="consultations">
            <div
                style={{
                    maxWidth: 560,
                    margin: '0 auto',
                    background: 'var(--wc-white)',
                    border: '1px solid var(--wc-gray-200)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-8)',
                    textAlign: 'center',
                }}
            >
                <h1
                    style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        margin: 0,
                    }}
                >
                    {copy.title}
                </h1>

                <p
                    style={{
                        margin: 'var(--space-3) 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-muted)',
                        lineHeight: 1.6,
                    }}
                >
                    {copy.body}
                </p>

                <p
                    style={{
                        margin: 'var(--space-4) 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {appointment.service} · {appointment.date}{' '}
                    {appointment.time}
                    {appointment.doctor ? ` · ${appointment.doctor}` : ''}
                </p>

                {payment && (
                    <p
                        style={{
                            margin: 'var(--space-3) 0 0',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--wc-text-primary)',
                        }}
                    >
                        ₱
                        {payment.amountDue.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}{' '}
                        · {payment.reference}
                        {payment.dueAt ? ` · pay before ${payment.dueAt}` : ''}
                    </p>
                )}

                <div
                    style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginTop: 'var(--space-6)',
                    }}
                >
                    <Link
                        href="/user/consultations"
                        className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                    >
                        {consultationRoomMeta.closedBackToList}
                    </Link>

                    {/* The page that can actually settle it. Same rule as
                        the records link below: only offered when there is
                        something to do there. */}
                    {reason === 'unpaid' && (
                        <Link
                            href="/user/payments"
                            className="wc-btn wc-btn-md wc-btn-pill"
                        >
                            Go to Payments
                        </Link>
                    )}

                    {/* Only once there is something to read. Before the note is
                        signed the records page has nothing for this visit, and
                        sending them there would be a dead end dressed as help. */}
                    {reason === 'finalized' && (
                        <Link
                            href="/user/records"
                            className="wc-btn wc-btn-md wc-btn-pill"
                        >
                            {consultationRoomMeta.closedToRecords}
                        </Link>
                    )}
                </div>
            </div>
        </PatientDashboardLayout>
    );
}
