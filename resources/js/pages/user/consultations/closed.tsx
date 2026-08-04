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
    [key: string]: unknown;
}

export default function PatientConsultationClosed(): ReactElement {
    const { appointment, reason } = usePage<PageProps>().props;
    const copy = consultationRoomMeta.closedReasons[reason];

    // Only while the room could still come back. A finalized note is terminal —
    // polling it would be a request every eight seconds, forever, for an answer
    // that can never change.
    usePoll(POLL_MS, {}, { autoStart: reason !== 'finalized' });

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
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                    {copy.title}
                </h1>

                <p
                    style={{
                        margin: 'var(--space-3) 0 0',
                        fontSize: 14,
                        color: 'var(--wc-gray-500)',
                        lineHeight: 1.6,
                    }}
                >
                    {copy.body}
                </p>

                <p
                    style={{
                        margin: 'var(--space-4) 0 0',
                        fontSize: 13,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {appointment.service} · {appointment.date}{' '}
                    {appointment.time}
                    {appointment.doctor ? ` · ${appointment.doctor}` : ''}
                </p>

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
