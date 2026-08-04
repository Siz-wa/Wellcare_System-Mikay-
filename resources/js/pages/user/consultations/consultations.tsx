import { Link, usePage, usePoll } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { consultationRoomMeta } from '@/components/consultation-room/consultation-room-data';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';

/**
 * The patient's list of consultation rooms they may join right now.
 *
 * Only live rooms appear — this page is a door, not a history. Past visits and
 * their notes already live on the dashboard and in the records portal.
 */

/**
 * How often this page asks whether a room has opened.
 *
 * The doctor opens the room and then waits. Nothing pushes that to a patient
 * sitting on this page: the notification lands in the database, but the bell is
 * shared on the *next* Inertia request, so an idle page never sees it. This was
 * a page that stayed empty while a doctor waited on the other side of it.
 *
 * 15s is well inside a waiting room's patience and is one small JSON request.
 * Inertia stops polling entirely while the tab is hidden.
 */
const POLL_MS = 15000;

interface ConsultationItem {
    id: number;
    service: string;
    date: string;
    time: string;
    doctor: string | null;
    status: 'waiting' | 'active';
    startedAt: string | null;
}

interface PageProps {
    consultations: ConsultationItem[];
    [key: string]: unknown;
}

export default function PatientConsultations(): ReactElement {
    const { consultations } = usePage<PageProps>().props;

    // `only` keeps this to the one prop that changes. Without it every poll
    // re-sends the shared notification payload and the whole auth block.
    usePoll(POLL_MS, { only: ['consultations'] });

    return (
        <PatientDashboardLayout activeId="consultations">
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                    {consultationRoomMeta.listTitle}
                </h1>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 14,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {consultationRoomMeta.listSubtitle}
                </p>
            </header>

            {consultations.length === 0 ? (
                <div
                    style={{
                        background: 'var(--wc-white)',
                        border: '1px solid var(--wc-gray-200)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--space-8)',
                        textAlign: 'center',
                    }}
                >
                    <strong style={{ display: 'block', marginBottom: 6 }}>
                        {consultationRoomMeta.emptyTitle}
                    </strong>
                    <span style={{ fontSize: 14, color: 'var(--wc-gray-500)' }}>
                        {consultationRoomMeta.emptyBody}
                    </span>
                </div>
            ) : (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-3)',
                    }}
                >
                    {consultations.map((c) => (
                        <div
                            key={c.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 'var(--space-4)',
                                background: 'var(--wc-white)',
                                border: '1px solid var(--wc-gray-200)',
                                borderRadius: 'var(--radius-xl)',
                                padding: 'var(--space-5)',
                            }}
                        >
                            <div>
                                <strong style={{ display: 'block' }}>
                                    {c.service}
                                </strong>
                                <span
                                    style={{
                                        fontSize: 13,
                                        color: 'var(--wc-gray-500)',
                                    }}
                                >
                                    {c.date} {c.time}
                                    {c.doctor ? ` · ${c.doctor}` : ''}
                                </span>
                            </div>

                            <Link
                                href={`/user/consultations/${c.id}`}
                                className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                            >
                                {c.status === 'active'
                                    ? 'Rejoin Call'
                                    : 'Join Call'}
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </PatientDashboardLayout>
    );
}
