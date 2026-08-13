import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
    MEDIA_ERROR_COPY,
    SIGNALLING_UNREACHABLE,
} from '@/components/consultation-room/consultation-room-data';
import { getEcho, teardownEcho } from '@/lib/echo';
import type { ReverbConfig } from '@/lib/echo';

/**
 * Native WebRTC for the consultation room. No peer library — the spike proved
 * RTCPeerConnection directly and the plan keeps it that way.
 *
 * Three constraints this codebase imposes, each of which has a specific failure
 * mode if ignored:
 *
 *  - **React Compiler is on.** `rtc.current` is never read or written during
 *    render, and the setup effect depends on `[roomId]` alone. `iceServers`,
 *    `reverb` and `endpoints` are fresh objects from `usePage()` on every
 *    render, so depending on them directly would tear down and rebuild a live
 *    call whenever the parent re-rendered.
 *  - **StrictMode is on.** Effects run twice in dev. Everything mutable lives
 *    in one ref bag so teardown is provably total, and `getUserMedia` resolving
 *    after cleanup is handled explicitly.
 *  - **SSR entry exists.** Echo is imported lazily through `@/lib/echo` and
 *    only ever touched inside effects.
 *
 * Signalling is a symmetric `hello` handshake rather than "doctor offers
 * immediately". With fire-and-forget broadcast there is no offer store: if the
 * doctor offered before the patient had subscribed, the offer would vanish and
 * the call would never connect, with no error anywhere. Both peers announce
 * themselves on subscribe; the initiator answers a `hello` with an offer. Order
 * of arrival stops mattering.
 */

export type CallPhase =
    | 'idle'
    | 'requesting-media'
    | 'waiting'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'ended'
    | 'failed';

export interface UseWebRtcOptions {
    roomId: string;
    /** Exactly one peer offers. The doctor. */
    isInitiator: boolean;
    selfUserId: number;
    iceServers: RTCIceServer[];
    reverb: ReverbConfig;
    /**
     * From the page props, never from `meta[name="csrf-token"]`.
     *
     * Inertia re-renders props on every visit but never re-renders <head>, and
     * logging in regenerates the session token. Reading the meta tag here made
     * every signalling POST 419 from the first client-side navigation onward —
     * silently, because Laravel does not log a 419. See the docblock on
     * DoctorConsultationController::room().
     */
    csrfToken: string;
    /**
     * Where to send the user once the call is over, or null to stay put.
     *
     * Role-dependent on purpose. The patient has nothing left to do in the room,
     * so they are returned to their consultations list rather than left staring
     * at a dead video panel. The doctor stays: the visit is not documented until
     * they finalize, and navigating away from unsaved SOAP notes would throw the
     * clinical record away.
     */
    exitHref: string | null;
}

export interface UseWebRtcResult {
    phase: CallPhase;
    error: string | null;
    micEnabled: boolean;
    cameraEnabled: boolean;
    /** Seconds the call has been up — the §12 risk 7 number, made visible. */
    heldSeconds: number;
    /** e.g. "srflx ⇄ srflx (udp)" once the pair is selected. */
    connectionDetail: string | null;
    localVideoRef: RefObject<HTMLVideoElement | null>;
    remoteVideoRef: RefObject<HTMLVideoElement | null>;
    /** The camera was unavailable and the call fell back to audio only. */
    audioOnly: boolean;
    /**
     * What the other person has turned off, from their own `state` broadcast.
     *
     * Optimistic defaults: a peer that has not announced itself is assumed to be
     * fully on. The alternative — assume off until told otherwise — puts a
     * "Muted" badge on every call for the second or two before the first state
     * message lands, which is worse than the problem it solves.
     */
    peerMicEnabled: boolean;
    peerCameraEnabled: boolean;
    /** The remote speaker is silenced locally — the fastest cure for feedback. */
    speakerMuted: boolean;
    /** Autoplay was blocked; the user must interact before audio can start. */
    needsAudioGesture: boolean;
    hangUp: () => void;
    toggleMic: () => void;
    toggleCamera: () => void;
    toggleSpeaker: () => void;
    resumeAudio: () => void;
}

/** ICE often self-heals. Restarting instantly throws away a recovering call. */
const DISCONNECT_GRACE_MS = 3000;

/** Unbounded restarts against a dead network hide the real fault. */
const MAX_ICE_RESTARTS = 3;

/**
 * How long an unanswered offer stays authoritative.
 *
 * Long enough that the two hellos of a simultaneous join cannot produce two
 * competing offers; short enough that a peer who reloads gets a fresh one.
 */
const OFFER_RETRY_AFTER_MS = 3000;

/** Long enough to read "Call ended" before the page changes under you. */
const EXIT_REDIRECT_MS = 1200;

/**
 * Ordering used to keep the reported phase monotonic.
 *
 * Phase is written from two independent sources — the ICE/connection state
 * handlers and the signalling path — and the signalling path writes *after* an
 * awaited network round trip. On a fast reconnect ICE reaches `connected` in
 * milliseconds, well before the POST that follows `setLocalDescription`
 * resolves, so the later `connecting` write would land last and pin a perfectly
 * healthy call to "Connecting" forever. The answering peer is the ICE-controlled
 * agent and never transitions again, so nothing would ever correct it.
 *
 * That is the exact defect behind "the video appears but it still says
 * connecting". Ranking the phases and refusing to regress fixes it at the root
 * rather than at each call site.
 */
const PHASE_RANK: Record<CallPhase, number> = {
    idle: 0,
    'requesting-media': 1,
    waiting: 2,
    connecting: 3,
    reconnecting: 4,
    connected: 5,
    ended: 6,
    failed: 6,
};

/** Terminal phases win from anywhere and are never left. */
const TERMINAL_PHASES: readonly CallPhase[] = ['ended', 'failed'];

/**
 * Ask for the DSP explicitly rather than trusting the platform default.
 *
 * Chrome and Firefox enable all three by default; Safari, iOS and several
 * Windows audio drivers do not do so reliably. `autoGainControl` left to the
 * driver is the classic amplifier in a feedback loop — it hears the howl and
 * turns the gain up.
 *
 * This narrows the problem; it does not solve it. Two devices in one room feed
 * back through the air, which no constraint can cancel. See
 * `consultationRoomMeta.headphoneAdvisory`.
 */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    // OFF, deliberately, and this is a reversal of the previous setting.
    //
    // AGC exists to lift a quiet, distant voice. On a headset boom mic sitting
    // a centimetre from the mouth there is nothing to lift — but there IS a
    // faint leak from the earcups, and AGC cannot tell the two apart. It hears
    // the leak during a pause, decides the input is too quiet, and raises the
    // gain. That is a positive feedback loop with a microphone in it, and it
    // ends in the screech. Whatever echo cancellation is managing to remove,
    // AGC is busy putting back.
    autoGainControl: { ideal: false },
};

/** Bare `video: true` lets the UA pick, often 640x480 on a 720p-capable device. */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
};

/** Map a getUserMedia rejection to advice the user can actually act on. */
function mediaErrorCopy(err: unknown): string {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return MEDIA_ERROR_COPY.insecure;
    }

    switch (err instanceof Error ? err.name : '') {
        case 'NotAllowedError':
        case 'SecurityError':
            return MEDIA_ERROR_COPY.denied;
        case 'NotFoundError':
        case 'OverconstrainedError':
            return MEDIA_ERROR_COPY.missing;
        case 'NotReadableError':
        case 'AbortError':
            return MEDIA_ERROR_COPY.busy;
        default:
            return MEDIA_ERROR_COPY.unknown;
    }
}

type SignalType =
    | 'hello'
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'bye'
    /**
     * The other peer's page is going away, but the room is not closing.
     *
     * Sent by the server when a patient hangs up (the room drops back to
     * `waiting` rather than ending), and by a client's own `pagehide` beacon on
     * a refresh or tab close. Both mean the same thing to the receiver: the
     * connection you hold is dead, throw it away and wait for them to come back.
     */
    | 'peer-left'
    /** Mic and camera on/off, so the other side is never guessed at. */
    | 'state';

interface SignalMessage {
    type: SignalType;
    payload: Record<string, unknown>;
    fromUserId: number;
}

/**
 * One member of the presence channel, exactly as routes/channels.php returns it.
 *
 * `id` is typed loosely because it makes the round trip through JSON and the
 * Pusher protocol, which stringifies member keys — every comparison against
 * `selfUserId` goes through Number() rather than trusting it.
 */
interface PresenceMember {
    id: number | string;
    name?: string;
}

export function useWebRtc(options: UseWebRtcOptions): UseWebRtcResult {
    const { roomId } = options;

    const [phase, setPhase] = useState<CallPhase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [heldSeconds, setHeldSeconds] = useState(0);
    const [audioOnly, setAudioOnly] = useState(false);
    const [peerMicEnabled, setPeerMicEnabled] = useState(true);
    const [peerCameraEnabled, setPeerCameraEnabled] = useState(true);
    const [speakerMuted, setSpeakerMuted] = useState(false);
    const [needsAudioGesture, setNeedsAudioGesture] = useState(false);
    const [connectionDetail, setConnectionDetail] = useState<string | null>(
        null,
    );

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    /**
     * The only way phase should ever be written.
     *
     * Uses the functional updater so a decision is never made against a stale
     * closure — several writers here fire from event handlers and from inside
     * awaits, where the `phase` captured at render time is routinely obsolete.
     */
    const advancePhase = (next: CallPhase): void => {
        setPhase((current) => {
            if (current === next || TERMINAL_PHASES.includes(current)) {
                return current;
            }

            if (TERMINAL_PHASES.includes(next)) {
                return next;
            }

            // Two legitimate steps back. `reconnecting` is a live call that
            // started recovering; `waiting` is the peer having left a room that
            // is still open, which is genuinely a return to waiting for them.
            if (next === 'reconnecting') {
                return current === 'connected' ? next : current;
            }

            if (
                next === 'waiting' &&
                PHASE_RANK[current] > PHASE_RANK.waiting
            ) {
                return next;
            }

            return PHASE_RANK[next] > PHASE_RANK[current] ? next : current;
        });
    };

    /**
     * Report what the browser ACTUALLY gave us, not what we asked for.
     *
     * Requesting `echoCancellation` is not the same as getting it — only
     * `getSettings()` says what is in force, and several Windows drivers and
     * every iOS build have their own opinion. This is the only way to tell a
     * constraint that was applied from one that was quietly ignored, and it is
     * what ruled the browser out as the source of the reported screech: on the
     * machine that howled, AEC was on, AGC was off, and the loop was still there
     * — because it was running through the air between two devices, which no
     * constraint can reach.
     *
     * Logged rather than shown: the Boost browser logger ships console output to
     * the server, so this is readable for a phone as easily as for the PC.
     */
    const inspectAudio = (stream: MediaStream): void => {
        const track = stream.getAudioTracks()[0];

        if (!track) {
            return;
        }

        console.info('consultation audio', {
            device: track.label,
            applied: track.getSettings(),
            supported: navigator.mediaDevices.getSupportedConstraints(),
        });
    };

    // Options change identity every render. Mirrored into a ref so the setup
    // effect can depend on roomId alone and still read current values.
    const opts = useRef(options);
    useEffect(() => {
        opts.current = options;
    });

    // One bag, not eight refs: teardown has a single place to be complete.
    const rtc = useRef<{
        pc: RTCPeerConnection | null;
        localStream: MediaStream | null;
        channelName: string | null;
        pendingCandidates: RTCIceCandidateInit[];
        remoteDescriptionSet: boolean;
        disposed: boolean;
        restarts: number;
        graceTimer: ReturnType<typeof setTimeout> | null;
        lastOfferAt: number;
        remoteStream: MediaStream | null;
        /** Set once, on the first connect, so the clock survives a reconnect. */
        callStartedAt: number;
        joinPosted: boolean;
        /** Whether the presence roster currently shows the other participant. */
        peerPresent: boolean;
        /**
         * Whether the other peer has already been told we are leaving.
         *
         * One call can exit by End Call, by `pagehide`, and by the effect
         * cleanup — and a refresh fires two of those. Announcing twice makes the
         * peer rebuild its connection a second time, mid-rebuild.
         */
        departureAnnounced: boolean;
        /**
         * The single complete teardown, published here so `hangUp` and the
         * `bye` handler can reach the same code the effect cleanup runs.
         */
        teardown: (() => void) | null;
        /**
         * The signalling sender, published for the same reason.
         *
         * `toggleMic` and `toggleCamera` live outside the setup effect — they
         * are returned to the component — so without this they have no way to
         * tell the other peer what just happened.
         */
        send:
            | ((type: SignalType, payload?: Record<string, unknown>) => void)
            | null;
    }>({
        pc: null,
        localStream: null,
        channelName: null,
        pendingCandidates: [],
        remoteDescriptionSet: false,
        disposed: false,
        restarts: 0,
        graceTimer: null,
        lastOfferAt: 0,
        remoteStream: null,
        callStartedAt: 0,
        joinPosted: false,
        peerPresent: false,
        departureAnnounced: false,
        teardown: null,
        send: null,
    });

    useEffect(() => {
        const bag = rtc.current;
        bag.disposed = false;
        bag.restarts = 0;
        bag.lastOfferAt = 0;
        bag.callStartedAt = 0;
        bag.joinPosted = false;
        bag.peerPresent = false;
        bag.departureAnnounced = false;
        bag.remoteStream = null;
        let cancelled = false;

        // Note on phase and roomId: there is deliberately no phase reset here.
        // Terminal phases are sticky by design, so a room change would need one
        // — but Inertia re-keys the page component on navigation, so arriving at
        // a different room remounts this hook and `phase` starts at 'idle'
        // anyway. Resetting here would be a setState in an effect body, which
        // cascades a render and is what react-hooks/set-state-in-effect forbids.

        /**
         * @param  fatal  Whether losing this particular message kills the call.
         * @returns whether the message actually reached the server.
         */
        const post = async (
            path: string,
            body: unknown,
            fatal: boolean,
        ): Promise<boolean> => {
            let response: Response;

            try {
                response = await fetch(
                    `/consultations/rooms/${roomId}/${path}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-CSRF-TOKEN': opts.current.csrfToken,
                        },
                        credentials: 'same-origin',
                        body: body ? JSON.stringify(body) : undefined,
                    },
                );
            } catch {
                // fetch rejects on a network blip. Unwrapped, a `void`ed
                // candidate send became an unhandled rejection, and an awaited
                // one escaped into a catch that failed the entire call.
                if (fatal && !bag.disposed) {
                    advancePhase('failed');
                    setError(
                        'Lost contact with the server. Check your connection and rejoin.',
                    );
                }

                return false;
            }

            if (response.ok || bag.disposed) {
                return response.ok;
            }

            if (!fatal) {
                // A dropped ICE candidate is survivable — ICE goes on trying
                // every other pair it has. Failing the call over one of the
                // dozen candidates that trickle out mid-conversation would turn
                // a working consultation into "please rejoin" for nothing.
                console.warn(
                    `consultation: ${path} responded ${response.status}`,
                );

                return false;
            }

            // Never swallow the rest. Signalling is fire-and-forget — a rejected
            // offer is not retried and the call simply never connects, on a
            // screen that looks like it is still trying. Silence here is what
            // turned a CSRF rejection into an unexplained hang: the server
            // answered 419 twelve times and the UI said "Connecting".
            advancePhase('failed');
            setError(
                `Signalling failed (HTTP ${response.status}). The call cannot connect — please rejoin.`,
            );

            return false;
        };

        const send = (
            type: SignalType,
            payload: Record<string, unknown> = {},
        ): Promise<boolean> =>
            // Only the handshake is load-bearing. Candidates are individually
            // expendable by design, and `state` is a nicety — failing a live
            // consultation because a mute badge did not send would be absurd.
            post(
                'signal',
                { type, payload },
                type !== 'ice-candidate' && type !== 'state',
            );

        bag.send = (type, payload) => void send(type, payload);

        /**
         * Tell the other peer we are going away. Exactly once, by any exit.
         *
         * There are three ways to leave a live call and they fire completely
         * different things:
         *
         *  1. **End Call** — POSTs `/leave`, and the server broadcasts. Handled.
         *  2. **Refresh / close tab** — `pagehide` fires; React runs no effect
         *     cleanup at all on unload.
         *  3. **Clicking a link in the app** — an Inertia client-side
         *     navigation. The document is never unloaded, so `pagehide` does NOT
         *     fire; only the effect cleanup runs.
         *
         * The first version of this handled 1 and 2 and missed 3 entirely — and
         * 3 is the ordinary case, because tapping something in the sidebar is
         * how a person actually wanders out of a call. The other party was left
         * on a frozen frame with a running timer for the ~30 seconds it takes ICE
         * consent to expire.
         *
         * @param viaBeacon The document is being destroyed, so `fetch` would die
         *   with it and only `sendBeacon` survives. An Inertia navigation keeps
         *   the document, so a normal (keepalive) fetch is both available and
         *   better — it reports failures.
         */
        const announceDeparture = (viaBeacon: boolean): void => {
            if (bag.departureAnnounced || !bag.pc) {
                return;
            }

            bag.departureAnnounced = true;

            const url = `/consultations/rooms/${roomId}/signal`;
            // The token rides in the body as `_token` because a beacon cannot
            // set headers, and Laravel's CSRF middleware reads
            // `$request->input('_token')` — which for a JSON content type reads
            // the decoded body. Same body both ways, so there is one shape to
            // get right rather than two.
            const body = JSON.stringify({
                _token: opts.current.csrfToken,
                type: 'peer-left',
                payload: {},
            });

            if (viaBeacon) {
                navigator.sendBeacon?.(
                    url,
                    new Blob([body], { type: 'application/json' }),
                );

                return;
            }

            void fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': opts.current.csrfToken,
                },
                credentials: 'same-origin',
                // The component is unmounting as this fires. Without keepalive
                // the browser is free to cancel it on the way out.
                keepalive: true,
                body,
            }).catch(() => {
                // Nothing useful to do — we are leaving either way.
            });
        };

        const onPageHide = (event: PageTransitionEvent): void => {
            // `persisted` means the page went into the bfcache and can be
            // restored *as it is*, peer connection and all. Announcing a
            // departure we may instantly undo would leave the other side having
            // rebuilt its connection while this one kept the old — a deadlock in
            // which each waits for a handshake the other has already had.
            if (event.persisted) {
                return;
            }

            announceDeparture(true);
        };

        window.addEventListener('pagehide', onPageHide);

        /**
         * Release everything this call holds. Idempotent.
         *
         * This is the effect cleanup, but it is published on the ref bag so
         * `hangUp` and the `bye` handler run *exactly* this and cannot drift
         * from it. Previously it lived only in the cleanup return, which needs
         * an unmount — so pressing End Call stopped nothing: the camera stayed
         * lit, the peer connection stayed open, and both parties went on
         * streaming audio and video to each other underneath a "Call ended"
         * overlay. In a consultation that is a privacy failure, not a cosmetic
         * one.
         */
        const teardown = (): void => {
            // BEFORE anything is released, and before `disposed` is set: this is
            // the only notice the other peer gets when the user navigates away
            // inside the app rather than closing the tab. A deliberate hang-up
            // has already announced itself through /leave and a received `bye`
            // means the call is over for both — both set `departureAnnounced`,
            // so this is a no-op on those paths.
            announceDeparture(false);

            cancelled = true;
            bag.disposed = true;
            bag.send = null;

            // Leaving this bound would fire a second departure on the navigation
            // *away* from an ended call.
            window.removeEventListener('pagehide', onPageHide);

            if (bag.graceTimer) {
                clearTimeout(bag.graceTimer);
                bag.graceTimer = null;
            }

            // Order matters: stop tracks BEFORE closing the connection, or a
            // sender can hold a device handle past pc.close() and the camera
            // light stays on.
            bag.localStream?.getTracks().forEach((t) => t.stop());
            bag.localStream = null;

            bag.pc?.close();
            bag.pc = null;

            // Detach the media elements too. `pc.close()` stops delivery but
            // leaves the last decoded frame painted, which reads as a call that
            // is still up but frozen.
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }

            bag.remoteStream = null;

            // `leave`, not `stopListening`. A dangling subscription survives
            // the StrictMode remount and the next mount processes every signal
            // twice — the offer gets applied twice and the handshake dies with
            // InvalidStateError.
            if (bag.channelName) {
                getEcho(opts.current.reverb, opts.current.csrfToken).leave(
                    bag.channelName,
                );
                bag.channelName = null;
            }

            bag.pendingCandidates = [];
            bag.remoteDescriptionSet = false;
            teardownEcho();
        };

        bag.teardown = teardown;

        /**
         * Read the selected candidate pair — the honest answer to "did this
         * call need a relay". The spike surfaced the same field, and it is what
         * turns a working call into evidence about NAT traversal.
         *
         * Typed locally: the browser's stats dictionaries are only partially
         * covered by lib.dom, and `RTCIceCandidateStats` is not declared at all
         * in this TypeScript version.
         */
        const reportPair = async (pc: RTCPeerConnection): Promise<void> => {
            interface StatsEntry {
                id: string;
                type: string;
                state?: string;
                localCandidateId?: string;
                remoteCandidateId?: string;
                candidateType?: string;
                protocol?: string;
            }

            const report = await pc.getStats();
            const byId = new Map<string, StatsEntry>();
            let pair: StatsEntry | null = null;

            report.forEach((raw) => {
                const entry = raw as StatsEntry;
                byId.set(entry.id, entry);

                if (
                    entry.type === 'candidate-pair' &&
                    entry.state === 'succeeded' &&
                    pair === null
                ) {
                    pair = entry;
                }
            });

            if (pair === null || bag.disposed) {
                return;
            }

            const selected: StatsEntry = pair;
            const local = byId.get(selected.localCandidateId ?? '');
            const remote = byId.get(selected.remoteCandidateId ?? '');

            if (local?.candidateType && remote?.candidateType) {
                setConnectionDetail(
                    `${local.candidateType} ⇄ ${remote.candidateType}` +
                        (local.protocol ? ` (${local.protocol})` : ''),
                );
            }
        };

        /**
         * Recover a dropped call in place.
         *
         * The 2026-08-03 two-device run held 4m 5s and then dropped; a real
         * consultation runs longer than that. Only the initiator restarts —
         * both sides restarting is glare, and a fixed initiator is what lets
         * this hook skip full perfect-negotiation.
         */
        /**
         * Recovery, from whichever side noticed.
         *
         * Only the initiator may restart ICE — both sides restarting is glare,
         * and a fixed initiator is what lets this hook skip full
         * perfect-negotiation. But "only the initiator recovers" was previously
         * implemented as "the other side does nothing at all": the patient sat
         * on a frozen frame at phase `connected`, with a green dot and a ticking
         * clock, indefinitely, believing the call was live. So the non-initiator
         * now says what is happening and asks the initiator to re-offer.
         */
        const attemptRecovery = async (): Promise<void> => {
            if (bag.disposed || !bag.pc) {
                return;
            }

            // Presence is authoritative about whether there is anyone to
            // reconnect *to*. Without this check a peer who closed their browser
            // sent the other side through three ICE restarts against nobody,
            // showing "Reconnecting — please stay on this page" for about half a
            // minute before finally admitting failure. Waiting is the honest
            // state, and it is reached immediately.
            if (!bag.peerPresent) {
                advancePhase('waiting');

                return;
            }

            if (opts.current.isInitiator) {
                await attemptIceRestart();

                return;
            }

            if (bag.restarts >= MAX_ICE_RESTARTS) {
                advancePhase('failed');
                setError(
                    'The connection could not be re-established. Check your internet and rejoin.',
                );

                return;
            }

            bag.restarts += 1;
            advancePhase('reconnecting');

            // The initiator's hello handler re-offers, and it now uses
            // iceRestart when the connection is unhealthy — which it is here.
            await send('hello');
        };

        /**
         * Re-check after the grace period, and keep re-checking.
         *
         * ICE stops emitting state changes once it settles on `disconnected`, so
         * a single one-shot timer was the only chance either side ever got. If
         * that attempt did not take, nothing fired again and the call was stuck
         * on a frozen frame with no further recovery and no failure either.
         */
        const scheduleRecovery = (): void => {
            if (bag.graceTimer || bag.disposed) {
                return;
            }

            bag.graceTimer = setTimeout(() => {
                bag.graceTimer = null;

                const pc = bag.pc;

                if (bag.disposed || !pc) {
                    return;
                }

                if (
                    pc.iceConnectionState === 'connected' ||
                    pc.iceConnectionState === 'completed'
                ) {
                    return;
                }

                void attemptRecovery().finally(() => {
                    if (!bag.disposed && bag.restarts < MAX_ICE_RESTARTS) {
                        scheduleRecovery();
                    }
                });
            }, DISCONNECT_GRACE_MS);
        };

        const attemptIceRestart = async (): Promise<void> => {
            const pc = bag.pc;

            if (!pc || bag.disposed || !opts.current.isInitiator) {
                return;
            }

            if (bag.restarts >= MAX_ICE_RESTARTS) {
                advancePhase('failed');
                setError(
                    'The connection could not be re-established. Check your internet and rejoin.',
                );

                return;
            }

            bag.restarts += 1;
            bag.lastOfferAt = Date.now();
            advancePhase('reconnecting');

            pc.restartIce();
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            await send('offer', { sdp: offer.sdp, type: offer.type });
        };

        const buildPeerConnection = (): RTCPeerConnection => {
            const pc = new RTCPeerConnection({
                iceServers: opts.current.iceServers,
            });

            bag.localStream
                ?.getTracks()
                .forEach((t) => pc.addTrack(t, bag.localStream!));

            pc.ontrack = (e) => {
                // Fires once per transceiver — audio and video. Reassigning
                // srcObject re-runs the media element load algorithm, which is
                // a visible black flash and an audio blip at the exact moment
                // the call connects, so only assign when it actually changed.
                const stream = e.streams[0] ?? new MediaStream([e.track]);

                bag.remoteStream = stream;

                if (
                    remoteVideoRef.current &&
                    remoteVideoRef.current.srcObject !== stream
                ) {
                    remoteVideoRef.current.srcObject = stream;
                }

                // Remote media arriving is the most trustworthy evidence a call
                // is up — more so than any negotiation state, because it is the
                // thing the user can actually see.
                advancePhase('connected');

                // The remote element is deliberately unmuted, and unmuted
                // autoplay needs a prior user gesture in Chrome and Safari. A
                // page refresh is not a gesture, so after one the element is
                // simply never started — silently, with no console error and no
                // UI. The doctor sees a dark rectangle that looks intentional.
                void remoteVideoRef.current
                    ?.play()
                    .then(() => setNeedsAudioGesture(false))
                    .catch(() => setNeedsAudioGesture(true));
            };

            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    void send('ice-candidate', {
                        candidate: e.candidate.toJSON(),
                    });
                }
            };

            const markConnected = (): void => {
                if (bag.graceTimer) {
                    clearTimeout(bag.graceTimer);
                    bag.graceTimer = null;
                }

                bag.restarts = 0;
                advancePhase('connected');
                void reportPair(pc);

                // Announce our own mute/camera state on every connect and
                // reconnect. A peer that joins after we muted has no other way
                // to learn it — signalling is fire-and-forget with no store, so
                // a toggle broadcast before they subscribed is simply gone.
                const stream = bag.localStream;

                if (stream) {
                    void send('state', {
                        mic: stream.getAudioTracks()[0]?.enabled ?? false,
                        camera: stream.getVideoTracks()[0]?.enabled ?? false,
                    });
                }

                // Once per call, not once per ICE settle. This fires on both
                // `connected` and `completed`, from both peers, and again after
                // every reconnect — and markActive() throws on a session that is
                // no longer live, so a late settle after a hang-up would 500 and
                // fail an already-ended call.
                if (!bag.joinPosted) {
                    bag.joinPosted = true;
                    // Bookkeeping, not signalling — the media path does not
                    // depend on it, so a failure must not fail the call.
                    void post('join', undefined, false);
                }
            };

            // `connectionState` aggregates ICE *and* DTLS, so it is the honest
            // "is this call usable" signal. `oniceconnectionstatechange` is kept
            // below because it is the one that reports `disconnected` promptly.
            pc.onconnectionstatechange = () => {
                if (bag.disposed) {
                    return;
                }

                if (pc.connectionState === 'connected') {
                    markConnected();
                }

                if (pc.connectionState === 'failed') {
                    void attemptIceRestart();
                }
            };

            pc.oniceconnectionstatechange = () => {
                if (bag.disposed) {
                    return;
                }

                const state = pc.iceConnectionState;

                if (state === 'connected' || state === 'completed') {
                    markConnected();
                }

                if (state === 'disconnected') {
                    // Grace period first — ICE frequently recovers on its own,
                    // and restarting instantly throws away a connection that was
                    // about to come back.
                    scheduleRecovery();
                }

                if (state === 'failed') {
                    void attemptRecovery();
                }
            };

            return pc;
        };

        /**
         * Throw away the peer connection and start a clean one, keeping the
         * local camera and microphone exactly as they are.
         *
         * Re-acquiring the local stream here would be visible (a camera flash)
         * and can fail outright with NotReadableError, so the tracks are moved
         * across rather than requested again.
         */
        const rebuildConnection = (): void => {
            if (bag.disposed) {
                return;
            }

            bag.pc?.close();
            bag.pendingCandidates = [];
            bag.remoteDescriptionSet = false;
            bag.lastOfferAt = 0;
            bag.joinPosted = false;
            bag.remoteStream = null;

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }

            bag.pc = buildPeerConnection();
        };

        /**
         * The other person is gone, but the room is not closed.
         *
         * Reached two ways that mean the same thing: a `peer-left` relay (their
         * client said so on the way out) and the presence channel's `leaving`
         * (Reverb saw their socket drop, which is the only one that catches a
         * force-quit browser).
         *
         * The connection is rebuilt rather than reused because it holds ICE
         * credentials and a remote description belonging to a browser session
         * that no longer exists — renegotiating on top of that is how a rejoin
         * ends up never connecting.
         */
        const handlePeerGone = (): void => {
            if (bag.disposed) {
                return;
            }

            // Whatever they had turned off left with them. Holding the last
            // badge would put "Muted" over a fresh session that is not.
            setPeerMicEnabled(true);
            setPeerCameraEnabled(true);

            rebuildConnection();

            // `waiting`, never `reconnecting`. Nothing is being restored — they
            // left. Telling a doctor the connection is "being restored, please
            // stay on this page" about a patient who has closed their browser is
            // worse than saying nothing: it invites them to sit and wait.
            advancePhase('waiting');
        };

        const drainCandidates = async (
            pc: RTCPeerConnection,
        ): Promise<void> => {
            const queued = bag.pendingCandidates;

            // Clear first: a throw below must not leave the queue to be applied
            // a second time against a newer description.
            bag.pendingCandidates = [];

            for (const candidate of queued) {
                try {
                    await pc.addIceCandidate(candidate);
                } catch (err) {
                    // Per-candidate, because stale ones are guaranteed rather
                    // than exceptional: after a peer refreshes, candidates from
                    // their previous session are still in flight and reject
                    // against the new description. Aborting the loop on the
                    // first of those dropped every remaining candidate and
                    // failed a call that had everything it needed.
                    console.warn('consultation: rejected ICE candidate', err);
                }
            }
        };

        const handleSignal = async (message: SignalMessage): Promise<void> => {
            // Replaces `->toOthers()`, which would be a silent no-op here: the
            // Echo axios interceptor that supplies X-Socket-Id only registers
            // when window.axios is set, and this app never sets it.
            if (
                message.fromUserId === opts.current.selfUserId ||
                bag.disposed
            ) {
                return;
            }

            const pc = bag.pc;

            if (!pc) {
                return;
            }

            if (message.type === 'hello') {
                if (!opts.current.isInitiator) {
                    // Answer a hello with a hello.
                    //
                    // Required for the case where the PATIENT subscribes first:
                    // their announcing hello is then broadcast to a channel the
                    // doctor has not joined yet and is lost, and the doctor's
                    // own hello — which arrives here — is the only remaining
                    // signal that anyone is waiting. Without this reply the
                    // doctor never learns to offer and both sides wait forever.
                    //
                    // This cannot ping-pong: only the non-initiator replies to
                    // a hello, and the initiator replies with an offer.
                    await send('hello');

                    return;
                }

                // Ignore a redundant hello while an offer is already in flight.
                // Both peers announce themselves, so the initiator can receive
                // two hellos in quick succession; re-offering would replace the
                // local description while the first answer was still travelling
                // and the two would no longer describe the same session.
                //
                // The staleness escape hatch matters: if an earlier offer was
                // never answered this connection sits in `have-local-offer`
                // forever, and a patient who reloads must still be able to get
                // a fresh offer.
                if (
                    pc.signalingState !== 'stable' &&
                    Date.now() - bag.lastOfferAt < OFFER_RETRY_AFTER_MS
                ) {
                    return;
                }

                bag.lastOfferAt = Date.now();

                // If this hello is the far side asking for help (see
                // attemptRecovery), a plain renegotiation reuses the same ICE
                // credentials and would rebuild nothing. Restart ICE whenever
                // the connection is not healthy.
                const unhealthy =
                    pc.connectionState === 'disconnected' ||
                    pc.connectionState === 'failed' ||
                    pc.iceConnectionState === 'disconnected' ||
                    pc.iceConnectionState === 'failed';

                const offer = await pc.createOffer(
                    unhealthy ? { iceRestart: true } : undefined,
                );
                await pc.setLocalDescription(offer);

                // Announce 'connecting' BEFORE the round trip, never after.
                // setLocalDescription starts ICE immediately, so on a fast
                // reconnect the connection can be up before this POST resolves —
                // and a 'connecting' written afterwards would overwrite it.
                // advancePhase refuses to regress, so this is now safe twice
                // over, but the ordering is the part that actually matters.
                advancePhase('connecting');
                await send('offer', { sdp: offer.sdp, type: offer.type });

                return;
            }

            if (message.type === 'offer') {
                // Glare guard. The initiator re-offers by design (its staleness
                // escape hatch), so an offer can arrive while we hold one of our
                // own — and setRemoteDescription in `have-local-offer` throws
                // InvalidStateError, failing a call that was working. Rolling
                // back yields to the incoming offer, which is the correct
                // resolution for the impolite peer.
                if (pc.signalingState !== 'stable') {
                    await pc.setLocalDescription({
                        type: 'rollback',
                    } as RTCLocalSessionDescriptionInit);
                }

                // A new negotiation cycle: candidates buffered against the
                // previous remote description are no longer applicable.
                bag.remoteDescriptionSet = false;
                bag.pendingCandidates = [];

                await pc.setRemoteDescription(
                    message.payload as unknown as RTCSessionDescriptionInit,
                );
                bag.remoteDescriptionSet = true;
                await drainCandidates(pc);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // The answerer is where this bites hardest: it already holds the
                // remote description, so ICE routinely completes in milliseconds
                // while this POST is still in flight.
                advancePhase('connecting');
                await send('answer', { sdp: answer.sdp, type: answer.type });

                return;
            }

            if (message.type === 'answer') {
                // Only apply an answer we actually have an outstanding offer
                // for. Applying one in `stable` throws InvalidStateError, which
                // would reject inside this handler and surface as nothing at
                // all.
                if (pc.signalingState !== 'have-local-offer') {
                    return;
                }

                await pc.setRemoteDescription(
                    message.payload as unknown as RTCSessionDescriptionInit,
                );
                bag.remoteDescriptionSet = true;
                await drainCandidates(pc);

                return;
            }

            if (message.type === 'ice-candidate') {
                const candidate = message.payload
                    .candidate as unknown as RTCIceCandidateInit;

                if (!candidate) {
                    return;
                }

                // Required, not defensive: addIceCandidate before
                // setRemoteDescription throws InvalidStateError, and with
                // real-time signalling candidates routinely beat the SDP. The
                // spike never hit this because it was non-trickle.
                if (bag.remoteDescriptionSet) {
                    await pc.addIceCandidate(candidate);
                } else {
                    bag.pendingCandidates.push(candidate);
                }

                return;
            }

            if (message.type === 'state') {
                // Explicit !== false, not a truthiness test: an absent key must
                // read as "on", matching the optimistic default.
                setPeerMicEnabled(message.payload.mic !== false);
                setPeerCameraEnabled(message.payload.camera !== false);

                return;
            }

            if (message.type === 'peer-left') {
                handlePeerGone();

                return;
            }

            if (message.type === 'bye') {
                // The call is over for both of us, so there is nobody left to
                // tell we are leaving. Set before teardown, which would
                // otherwise announce a departure into a closed room.
                bag.departureAnnounced = true;

                // The peer hung up. Release our own devices too — previously
                // this only flipped a label, so the camera stayed lit and the
                // connection stayed open on a call that was already over.
                teardown();
                advancePhase('ended');
            }
        };

        void (async () => {
            try {
                advancePhase('requesting-media');

                // Ladder, not a single attempt. A camera that is missing,
                // disabled or — overwhelmingly the common case — still held by
                // Zoom, Teams or OBS used to fail the whole consultation, even
                // though the microphone was available the entire time. A
                // consultation on audio alone is a consultation; no call is not.
                let stream: MediaStream;

                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: VIDEO_CONSTRAINTS,
                        audio: AUDIO_CONSTRAINTS,
                    });
                } catch (cameraErr) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: AUDIO_CONSTRAINTS,
                    });

                    console.warn('consultation: audio only', cameraErr);
                    setAudioOnly(true);
                    setCameraEnabled(false);
                }

                // StrictMode can tear this effect down while getUserMedia is
                // still pending. Without this the stream is orphaned: the
                // camera light stays on and the second mount can fail with
                // NotReadableError because the device is still held.
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());

                    return;
                }

                bag.localStream = stream;

                // Device labels are blank until permission is granted, so this
                // has to run after getUserMedia, not before it.
                inspectAudio(stream);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                bag.pc = buildPeerConnection();
                advancePhase('waiting');

                const echo = getEcho(
                    opts.current.reverb,
                    opts.current.csrfToken,
                );

                // Say so when the realtime server is simply not there.
                //
                // `.error()` below only fires for `pusher:subscription_error`,
                // which needs a live connection to be reported over — so a
                // server that is down produces no channel error at all. The
                // socket quietly fails to connect, `.subscribed()` never fires,
                // the announcing hello is never sent, and both people sit on
                // "Waiting for the other person" forever with nothing logged
                // anywhere. That is exactly how this presented, and it cost a
                // round of testing to identify.
                const connection = (
                    echo.connector as unknown as {
                        pusher?: {
                            connection?: {
                                bind: (
                                    event: string,
                                    cb: (payload: { current?: string }) => void,
                                ) => void;
                            };
                        };
                    }
                ).pusher?.connection;

                connection?.bind('state_change', ({ current }) => {
                    if (bag.disposed || !current) {
                        return;
                    }

                    if (current === 'unavailable' || current === 'failed') {
                        advancePhase('failed');
                        setError(SIGNALLING_UNREACHABLE);
                    }
                });
                const channelName = `consultation.${roomId}`;
                bag.channelName = channelName;

                // `join`, not `private` — a PRESENCE channel.
                //
                // Must match WebRtcSignal::broadcastOn() and the return type in
                // routes/channels.php exactly. Laravel resolves both
                // `private-consultation.X` and `presence-consultation.X` to the
                // same authorization callback, so a half-converted state
                // authorizes fine and then delivers nothing, silently.
                echo.join(channelName)
                    /**
                     * Who is already here when we arrive.
                     *
                     * Replaces `.subscribed()` — it fires at the same moment and
                     * additionally carries the roster, so "waiting for the other
                     * person" becomes a fact rather than an assumption.
                     */
                    .here((members: PresenceMember[]) => {
                        if (bag.disposed) {
                            return;
                        }

                        bag.peerPresent = members.some(
                            (m) => Number(m.id) !== opts.current.selfUserId,
                        );

                        // The announcing hello still goes out here, not after
                        // `.listen()`. `.listen()` only registers a callback; the
                        // subscribe is an async /broadcasting/auth round trip
                        // plus a socket frame, and announcing before it lands
                        // invites a reply into a channel this client has not
                        // joined — fire-and-forget, so that reply is gone for
                        // good. That is exactly how the first two-device run
                        // failed.
                        void send('hello');
                    })
                    .joining((member: PresenceMember) => {
                        if (
                            bag.disposed ||
                            Number(member.id) === opts.current.selfUserId
                        ) {
                            return;
                        }

                        bag.peerPresent = true;
                        // They are provably subscribed now, so a hello cannot be
                        // lost. The initiator answers this with an offer.
                        void send('hello');
                    })
                    /**
                     * **The reason this stage exists.**
                     *
                     * A force-quit browser, a killed tab, a phone that loses its
                     * connection — none of them run JavaScript on the way out, so
                     * none can send a goodbye. Before presence, the remaining
                     * peer sat in front of a frozen frame for the ~30 seconds ICE
                     * takes to give up, and was then told the connection was
                     * being "restored" — for someone who had gone.
                     *
                     * Reverb sees the socket close in under a second, and this is
                     * the only signal that does not depend on the departing
                     * client's cooperation.
                     */
                    .leaving((member: PresenceMember) => {
                        if (
                            bag.disposed ||
                            Number(member.id) === opts.current.selfUserId
                        ) {
                            return;
                        }

                        bag.peerPresent = false;
                        handlePeerGone();
                    })
                    .listen(
                        // Leading dot: broadcastAs() renames the event, and
                        // without it Echo prepends the app namespace and the
                        // listener never fires — silently, with nothing logged
                        // anywhere.
                        '.webrtc.signal',
                        (message: SignalMessage) =>
                            void handleSignal(message).catch((err: unknown) => {
                                if (bag.disposed) {
                                    return;
                                }

                                // handleSignal is fired from an event
                                // listener, so a rejection here has no
                                // caller to land in — it becomes an
                                // unhandled rejection that reaches the
                                // console and nothing else. A failed
                                // setRemoteDescription is fatal to the
                                // call, so say so on the screen of the peer
                                // it actually happened to.
                                advancePhase('failed');
                                setError(
                                    err instanceof Error
                                        ? `${err.name}: ${err.message}`
                                        : 'The connection could not be negotiated.',
                                );
                            }),
                    )
                    .error((err: unknown) => {
                        if (bag.disposed) {
                            return;
                        }

                        // Almost always mayJoinRoom() refusing the subscribe.
                        // Without this the socket just never delivers anything
                        // and the room looks like a network problem.
                        advancePhase('failed');
                        setError(
                            'Could not join the consultation channel. The room may have been closed — return to your consultations and open it again.',
                        );
                        console.error('consultation channel refused', err);
                    });
            } catch (err) {
                if (cancelled) {
                    return;
                }

                advancePhase('failed');
                // Never the raw DOMException. "NotAllowedError: Permission
                // denied" told the user nothing, and the copy underneath it
                // advised checking their internet connection — wrong advice for
                // every media failure there is.
                setError(mediaErrorCopy(err));
            }
        })();

        return teardown;
    }, [roomId]);

    // Held-duration clock. Driven by an interval writing state, never derived
    // from Date.now() during render — that is the ref-read the compiler
    // forbids, and it would simply never update.
    //
    // The start time is taken ONCE, from the bag, and kept across reconnects.
    // Restarting it on every entry into `connected` made a 22-minute
    // consultation that survived one ICE blip display 0:01 — destroying the very
    // number this readout exists to produce (§12 risk 7). It also keeps ticking
    // through `reconnecting`, so the elapsed time does not vanish at the moment
    // the doctor most wants to know how long they have been waiting.
    useEffect(() => {
        if (phase !== 'connected' && phase !== 'reconnecting') {
            return;
        }

        const bag = rtc.current;

        if (bag.callStartedAt === 0) {
            bag.callStartedAt = Date.now();
        }

        const started = bag.callStartedAt;
        const tick = (): void =>
            setHeldSeconds(Math.floor((Date.now() - started) / 1000));

        tick();

        const id = setInterval(tick, 1000);

        return () => clearInterval(id);
    }, [phase]);

    // Leaving the room once the call is over. Only the patient supplies an
    // exitHref — see the option's docblock.
    useEffect(() => {
        const href = options.exitHref;

        if (phase !== 'ended' || !href) {
            return;
        }

        const id = setTimeout(() => router.visit(href), EXIT_REDIRECT_MS);

        return () => clearTimeout(id);
    }, [phase, options.exitHref]);

    /**
     * End the call for real.
     *
     * Tell the server first — it is what broadcasts `bye` to the other peer and
     * decides, by role, whether the room closes or merely returns to `waiting`.
     * Then release every local device. The teardown runs whether or not the POST
     * succeeded: leaving must never depend on the network, or a user on a
     * failing connection is trapped in a room with a live camera.
     */
    const hangUp = () => {
        advancePhase('ended');

        // /leave is the announcement — the server decides by role whether that
        // means `bye` (the room closes) or `peer-left` (it stays open for a
        // rejoin). Claiming it here stops the teardown below from sending a
        // second, weaker notice on top of it.
        rtc.current.departureAnnounced = true;

        void (async () => {
            try {
                await fetch(`/consultations/rooms/${roomId}/leave`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': options.csrfToken,
                    },
                    credentials: 'same-origin',
                });
            } catch {
                // Deliberately swallowed — see above.
            }

            rtc.current.teardown?.();
        })();
    };

    /**
     * Tell the other peer what we have on and off.
     *
     * Read back off the tracks rather than off React state: `setMicEnabled` has
     * not flushed yet at the point this is called, so the state values are one
     * toggle behind. The tracks are the truth.
     */
    const publishState = () => {
        const stream = rtc.current.localStream;

        if (!stream) {
            return;
        }

        rtc.current.send?.('state', {
            mic: stream.getAudioTracks()[0]?.enabled ?? false,
            camera: stream.getVideoTracks()[0]?.enabled ?? false,
        });
    };

    const toggleMic = () => {
        const track = rtc.current.localStream?.getAudioTracks()[0];

        if (!track) {
            return;
        }

        track.enabled = !track.enabled;
        setMicEnabled(track.enabled);
        publishState();
    };

    const toggleCamera = () => {
        const track = rtc.current.localStream?.getVideoTracks()[0];

        if (!track) {
            return;
        }

        track.enabled = !track.enabled;
        setCameraEnabled(track.enabled);
        publishState();
    };

    /**
     * Silence the other person locally.
     *
     * The one control that stops acoustic feedback instantly when two devices
     * are in the same room, without either party having to leave the call.
     */
    const toggleSpeaker = () => {
        const el = remoteVideoRef.current;

        if (!el) {
            return;
        }

        el.muted = !el.muted;
        setSpeakerMuted(el.muted);
    };

    /** Called from a real click, which is what the autoplay policy wants. */
    const resumeAudio = () => {
        void remoteVideoRef.current
            ?.play()
            .then(() => setNeedsAudioGesture(false))
            .catch(() => setNeedsAudioGesture(true));
    };

    return {
        phase,
        error,
        micEnabled,
        cameraEnabled,
        heldSeconds,
        connectionDetail,
        localVideoRef,
        remoteVideoRef,
        audioOnly,
        peerMicEnabled,
        peerCameraEnabled,
        speakerMuted,
        needsAudioGesture,
        hangUp,
        toggleMic,
        toggleCamera,
        toggleSpeaker,
        resumeAudio,
    };
}
