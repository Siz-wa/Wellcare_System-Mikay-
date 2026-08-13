import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { CallPhase } from '@/hooks/use-web-rtc';
import { consultationRoomMeta, PHASE_COPY } from './consultation-room-data';

/**
 * The video surface and call controls, shared by the doctor console and the
 * patient join page. One component so the two roles cannot drift into
 * different mute behaviour or different reconnection copy.
 *
 * Styling follows the doctor consultation pages: inline styles over CSS custom
 * properties, no Tailwind, no shadcn.
 */
interface VideoStageProps {
    phase: CallPhase;
    error: string | null;
    micEnabled: boolean;
    cameraEnabled: boolean;
    heldSeconds: number;
    connectionDetail: string | null;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteLabel: string;
    audioOnly: boolean;
    speakerMuted: boolean;
    needsAudioGesture: boolean;
    /**
     * What the other person has turned off, as reported by their own client.
     *
     * Without these a muted peer is indistinguishable from a broken call, and
     * both consultations we watched opened with twenty seconds of "hello? can
     * you hear me?" while one side sat muted.
     */
    peerMicEnabled: boolean;
    peerCameraEnabled: boolean;
    onHangUp: () => void;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleSpeaker: () => void;
    onResumeAudio: () => void;
    /**
     * What the user does once the call is over — supplied by the page, because
     * it differs by role. The doctor still has a visit to finalize; the patient
     * just needs a way back to their list. Without this the controls simply
     * greyed out and left the user on a dead page with no next action.
     */
    endedAction?: ReactNode;
}

function formatHeld(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoStage({
    phase,
    error,
    micEnabled,
    cameraEnabled,
    heldSeconds,
    connectionDetail,
    localVideoRef,
    remoteVideoRef,
    remoteLabel,
    audioOnly,
    speakerMuted,
    needsAudioGesture,
    peerMicEnabled,
    peerCameraEnabled,
    onHangUp,
    onToggleMic,
    onToggleCamera,
    onToggleSpeaker,
    onResumeAudio,
    endedAction,
}: VideoStageProps): ReactElement {
    const copy = PHASE_COPY[phase];
    const live = phase === 'connected';
    const over = phase === 'ended' || phase === 'failed';

    // Whether the remote element is actually painting frames.
    //
    // The overlay used to be gated on `phase === 'connected'` alone, so any
    // stale phase printed "Connecting / Negotiating a direct connection" across
    // the middle of a face that was already on screen. Video playing is a fact
    // about the picture, which is the right thing to gate a message about the
    // picture on.
    const [remotePlaying, setRemotePlaying] = useState(false);

    /**
     * ...but only while the picture is still telling the truth.
     *
     * A peer whose browser is force-quit sends nothing and stops delivering
     * media, yet the <video> element never fires `emptied` — the track is still
     * attached, just silent. `remotePlaying` therefore stays true and holds the
     * last decoded frame on screen forever.
     *
     * Gating purely on frames then suppressed the very message that mattered:
     * the connection had dropped, the phase said `reconnecting`, and the other
     * person saw a motionless face with no explanation and no timer. That is the
     * "it freezes" report, and it was an over-correction of the original bug —
     * frames are evidence of liveness only while we are still trying to
     * establish. Once a call has been up and lost, or is over, a frozen frame is
     * a lie and the message has to cover it.
     */
    const stalled =
        phase === 'reconnecting' || phase === 'waiting' || phase === 'failed';
    const showOverlay = !live && (!remotePlaying || stalled);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                height: '100%',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    background: '#0f172a',
                    aspectRatio: '16 / 10',
                    border: '1px solid var(--wc-gray-200)',
                }}
            >
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    aria-label={`Video of ${remoteLabel}`}
                    onPlaying={() => setRemotePlaying(true)}
                    onEmptied={() => setRemotePlaying(false)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />

                {showOverlay && (
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-2)',
                            color: '#f1f5f9',
                            textAlign: 'center',
                            padding: 'var(--space-6)',
                            // A scrim, because this now paints over a held video
                            // frame rather than only over the empty stage. White
                            // text on a brightly-lit face is close to unreadable,
                            // and the one time this message matters most is
                            // exactly when there is a face behind it.
                            background: 'rgba(15,23,42,0.62)',
                            // Never intercept clicks — it covers the whole
                            // video surface for hit-testing otherwise.
                            pointerEvents: 'none',
                        }}
                    >
                        <strong style={{ fontSize: 16 }}>{copy.title}</strong>
                        <span style={{ fontSize: 14, opacity: 0.9 }}>
                            {error ?? copy.body}
                        </span>
                    </div>
                )}

                {/* muted is mandatory — without it the local track feeds back
                    into the speakers the moment the call connects. */}
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        position: 'absolute',
                        right: 'var(--space-3)',
                        bottom: 'var(--space-3)',
                        // clamp, not a hard minWidth. At 120px minimum the
                        // self-view stopped scaling below a ~460px stage and
                        // covered the other person's face on a phone.
                        width: 'clamp(64px, 26%, 180px)',
                        aspectRatio: '4 / 3',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-lg)',
                        border: '2px solid rgba(255,255,255,0.35)',
                        background: '#000',
                        // Every consumer video product mirrors the self-view;
                        // its absence reads as "the app is broken".
                        transform: 'scaleX(-1)',
                    }}
                />

                {/* Autoplay was refused. This must be a real button: the
                    browser is waiting for a user gesture, and only a gesture
                    can start playback. */}
                {needsAudioGesture && !over && (
                    <button
                        type="button"
                        onClick={onResumeAudio}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-1)',
                            border: 'none',
                            background: 'rgba(15,23,42,0.55)',
                            color: '#fff',
                            cursor: 'pointer',
                            font: 'inherit',
                        }}
                    >
                        <strong style={{ fontSize: 16 }}>
                            {consultationRoomMeta.audioBlockedTitle}
                        </strong>
                        <span style={{ fontSize: 13, opacity: 0.85 }}>
                            {consultationRoomMeta.audioBlockedBody}
                        </span>
                    </button>
                )}

                {live && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 'var(--space-3)',
                            top: 'var(--space-3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: 'rgba(15,23,42,0.72)',
                            color: '#e2e8f0',
                            fontSize: 12,
                            fontFamily: 'ui-monospace, Consolas, monospace',
                        }}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: '#4ade80',
                            }}
                        />
                        {formatHeld(heldSeconds)}
                        {connectionDetail && (
                            <span style={{ opacity: 0.7 }}>
                                · {connectionDetail}
                            </span>
                        )}
                    </div>
                )}

                {/* The other person turned their camera off. Their last frame
                    stays painted otherwise, which reads as a frozen call — the
                    single most common reason someone refreshes and destroys a
                    session that was working perfectly. */}
                {live && !peerCameraEnabled && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#0f172a',
                            color: '#94a3b8',
                            fontSize: 15,
                            pointerEvents: 'none',
                        }}
                    >
                        {remoteLabel} · {consultationRoomMeta.peerCameraOff}
                    </div>
                )}

                {live && !peerMicEnabled && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 'var(--space-3)',
                            bottom: 'var(--space-3)',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: 'var(--wc-error)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            pointerEvents: 'none',
                        }}
                    >
                        {remoteLabel} · {consultationRoomMeta.peerMuted}
                    </div>
                )}
            </div>

            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                {/* Once the call is over the call controls are meaningless —
                    they used to just grey out, stranding the user on a dead
                    page. The page supplies what to do next instead. */}
                {over && (endedAction ?? null)}

                {!over && (
                    <button
                        type="button"
                        className="wc-btn wc-btn-md wc-btn-pill"
                        aria-pressed={!micEnabled}
                        onClick={onToggleMic}
                        style={{
                            background: micEnabled
                                ? 'var(--wc-gray-100)'
                                : 'var(--wc-error)',
                            color: micEnabled ? 'var(--wc-gray-700)' : '#fff',
                            border: 'none',
                        }}
                    >
                        {micEnabled ? 'Mute' : 'Unmute'}
                    </button>
                )}

                {!over && (
                    <button
                        type="button"
                        className="wc-btn wc-btn-md wc-btn-pill"
                        aria-pressed={!cameraEnabled}
                        onClick={onToggleCamera}
                        style={{
                            background: cameraEnabled
                                ? 'var(--wc-gray-100)'
                                : 'var(--wc-error)',
                            color: cameraEnabled
                                ? 'var(--wc-gray-700)'
                                : '#fff',
                            border: 'none',
                        }}
                    >
                        {cameraEnabled ? 'Stop Video' : 'Start Video'}
                    </button>
                )}

                {/* Silencing the other side is the instant cure for feedback
                    when two devices share a room, without leaving the call. */}
                {!over && (
                    <button
                        type="button"
                        className="wc-btn wc-btn-md wc-btn-pill"
                        aria-pressed={speakerMuted}
                        onClick={onToggleSpeaker}
                        style={{
                            background: speakerMuted
                                ? 'var(--wc-error)'
                                : 'var(--wc-gray-100)',
                            color: speakerMuted ? '#fff' : 'var(--wc-gray-700)',
                            border: 'none',
                        }}
                    >
                        {speakerMuted
                            ? consultationRoomMeta.speakerOff
                            : consultationRoomMeta.speakerOn}
                    </button>
                )}

                {!over && (
                    <button
                        type="button"
                        className="wc-btn wc-btn-md wc-btn-pill"
                        onClick={onHangUp}
                        style={{
                            background: 'var(--wc-error)',
                            color: '#fff',
                            border: 'none',
                        }}
                    >
                        End Call
                    </button>
                )}

                <span
                    style={{
                        marginLeft: 'var(--space-2)',
                        fontSize: 13,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {remoteLabel}
                </span>
            </div>

            {audioOnly && (
                <p
                    style={{
                        margin: 0,
                        textAlign: 'center',
                        fontSize: 13,
                        color: 'var(--wc-error)',
                    }}
                >
                    {consultationRoomMeta.audioOnlyNotice}
                </p>
            )}

            {/* The only real fix for the feedback howl. The loop runs through
                the air between the two devices, so echo cancellation — which
                only ever subtracts a device's own output — has no reference for
                it. The advice has to reach the person, not the code. */}
            {!over && (
                <p
                    style={{
                        margin: 0,
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {consultationRoomMeta.headphoneAdvisory}
                </p>
            )}
        </div>
    );
}
