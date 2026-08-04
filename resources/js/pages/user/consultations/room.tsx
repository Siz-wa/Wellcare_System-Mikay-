import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { consultationRoomMeta } from '@/components/consultation-room/consultation-room-data';
import { LeaveCallDialog } from '@/components/consultation-room/leave-call-dialog';
import { VideoStage } from '@/components/consultation-room/video-stage';
import { useWebRtc } from '@/hooks/use-web-rtc';
import type { ReverbConfig } from '@/lib/echo';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';

/**
 * The patient's half of the video room.
 *
 * The patient always ANSWERS — `isInitiator` is false, fixed by the server.
 * With exactly one side ever offering, true glare cannot occur, which is what
 * lets useWebRtc skip full perfect-negotiation rather than half-implementing
 * it.
 *
 * No SOAP editor here by design: the clinical narrative is the doctor's, and
 * the patient sees it later through the record portal once it is finalized.
 */

interface PatientRoomProps {
    appointment: {
        id: number;
        service: string;
        date: string;
        time: string;
        doctor: string | null;
    };
    room: { id: string; status: string };
    isInitiator: boolean;
    selfUserId: number;
    iceServers: RTCIceServer[];
    reverb: ReverbConfig;
    csrfToken: string;
    [key: string]: unknown;
}

export default function PatientConsultationRoom(): ReactElement {
    const {
        appointment,
        room,
        isInitiator,
        selfUserId,
        iceServers,
        reverb,
        csrfToken,
    } = usePage<PatientRoomProps>().props;

    const call = useWebRtc({
        roomId: room.id,
        isInitiator,
        selfUserId,
        iceServers,
        reverb,
        csrfToken,
        // The patient has nothing left to do here once the call is over.
        exitHref: '/user/consultations',
    });

    const [confirmLeave, setConfirmLeave] = useState(false);
    const callIsLive = call.phase !== 'ended' && call.phase !== 'failed';

    /**
     * Catch the ways out that are not the End Call button.
     *
     * A tap on the sidebar is an Inertia navigation, which unmounts the room and
     * drops the call with no warning at all — the commonest way a live
     * consultation gets abandoned. Inertia's own `before` event is the only
     * place this can be intercepted, and it is synchronous, so it has to be the
     * browser's confirm rather than the styled dialog above.
     */
    useEffect(() => {
        if (!callIsLive) {
            return;
        }

        const stop = router.on('before', () =>
            window.confirm(consultationRoomMeta.navigateAwayWarning),
        );

        const onUnload = (e: BeforeUnloadEvent): void => {
            e.preventDefault();
        };

        window.addEventListener('beforeunload', onUnload);

        return () => {
            stop();
            window.removeEventListener('beforeunload', onUnload);
        };
    }, [callIsLive]);

    return (
        <PatientDashboardLayout activeId="consultations">
            <header style={{ marginBottom: 'var(--space-5)' }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                    {consultationRoomMeta.patientTitle}
                </h1>
                <p
                    style={{
                        margin: '4px 0 0',
                        fontSize: 14,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {appointment.service} · {appointment.date}{' '}
                    {appointment.time}
                    {appointment.doctor ? ` · ${appointment.doctor}` : ''}
                </p>
                <p
                    style={{
                        margin: '4px 0 0',
                        fontSize: 13,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {consultationRoomMeta.patientSubtitle}
                </p>
            </header>

            {/* getUserMedia is unavailable outside a secure context, and the
                browser gives no useful error — it is simply undefined. Say so
                rather than letting the patient stare at a black rectangle. */}
            {typeof window !== 'undefined' && !window.isSecureContext && (
                <div
                    style={{
                        marginBottom: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(185,28,28,.10)',
                        fontSize: 14,
                    }}
                >
                    {consultationRoomMeta.secureContextWarning}
                </div>
            )}

            <div
                style={{
                    background: 'var(--wc-white)',
                    border: '1px solid var(--wc-gray-200)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-5)',
                    maxWidth: 900,
                }}
            >
                <VideoStage
                    {...call}
                    remoteLabel={appointment.doctor ?? 'Your doctor'}
                    onHangUp={() => setConfirmLeave(true)}
                    onToggleMic={call.toggleMic}
                    onToggleCamera={call.toggleCamera}
                    onToggleSpeaker={call.toggleSpeaker}
                    onResumeAudio={call.resumeAudio}
                    endedAction={
                        <Link
                            href="/user/consultations"
                            className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                        >
                            {consultationRoomMeta.patientBackToList}
                        </Link>
                    }
                />
            </div>

            <LeaveCallDialog
                open={confirmLeave}
                role="patient"
                onCancel={() => setConfirmLeave(false)}
                onConfirm={() => {
                    setConfirmLeave(false);
                    call.hangUp();
                }}
            />
        </PatientDashboardLayout>
    );
}
