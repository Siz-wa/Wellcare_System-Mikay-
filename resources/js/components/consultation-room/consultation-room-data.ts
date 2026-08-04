import type { CallPhase } from '@/hooks/use-web-rtc';

/**
 * All copy for the consultation room. Static text lives here, never inline in
 * JSX — same rule the rest of the app follows.
 *
 * `reconnecting` is not decoration. The 2026-08-03 two-device spike held 4m 5s
 * and then dropped, so mid-call recovery is expected rather than exceptional. A
 * silent freeze reads as a crash and the doctor refreshes, which destroys the
 * session — so the reconnect says what is happening and asks them to wait.
 */
export const PHASE_COPY: Record<CallPhase, { title: string; body: string }> = {
    idle: {
        title: 'Getting ready',
        body: 'Setting up your camera and microphone.',
    },
    'requesting-media': {
        title: 'Allow camera and microphone',
        body: 'Your browser will ask for permission. The call cannot start without it.',
    },
    waiting: {
        title: 'Waiting for the other person',
        body: 'They will appear here as soon as they join. This room stays open — if they drop out they can rejoin without you starting over.',
    },
    connecting: {
        title: 'Connecting',
        body: 'Negotiating a direct connection.',
    },
    connected: {
        title: 'Connected',
        body: '',
    },
    reconnecting: {
        title: 'Reconnecting',
        body: 'The connection dropped and is being restored. Please stay on this page.',
    },
    ended: {
        title: 'Call ended',
        body: 'Your camera and microphone have been turned off.',
    },
    failed: {
        title: 'Could not connect',
        body: 'Check your internet connection and try rejoining.',
    },
};

/**
 * What went wrong getting a camera and microphone, in words the user can act on.
 *
 * The old code printed the raw DOMException — "NotAllowedError: Permission
 * denied" — over a body that advised checking your internet connection, which is
 * wrong for every one of these. Each of these failures has a different remedy
 * and only the user can apply it.
 */
export const MEDIA_ERROR_COPY = {
    denied: 'Camera and microphone access was blocked. Click the camera icon in your browser address bar, allow access, then rejoin.',
    missing:
        'No camera or microphone was found. Connect one and rejoin — or continue with audio only.',
    busy: 'Another app is using your camera. Close Zoom, Teams or any other video app, then rejoin.',
    insecure:
        'The browser will not allow camera access on an insecure connection. Open this site over https and rejoin.',
    unknown: 'Your camera and microphone could not be started.',
};

/**
 * The realtime server is unreachable.
 *
 * Worth its own message because the failure is otherwise indistinguishable from
 * "the other person has not joined yet" — the socket never connects, the room
 * never announces itself, and both people sit on "Waiting for the other person"
 * indefinitely while everything else looks healthy.
 */
export const SIGNALLING_UNREACHABLE =
    'Cannot reach the consultation server, so the two of you cannot be connected. If you are running this locally, check that `composer dev` is running — it starts the realtime server alongside the site.';

export const consultationRoomMeta = {
    /**
     * The real mitigation for the reported "siren".
     *
     * Confirmed by the user on 2026-08-04: it is a loop between the two devices.
     * Device A's speaker is picked up by device B's microphone, sent back, played
     * by A, picked up again, and round it goes, gaining a little each lap until
     * it howls. Echo cancellation is structurally unable to stop it — AEC
     * subtracts a device's OWN output from its OWN microphone, and here the
     * offending sound is arriving through the air from a second device it has no
     * reference for.
     *
     * Nothing in the code can cancel it. Distance, headphones or Mute speaker
     * break the loop, so the advice has to reach the person. Every consumer
     * video product says the same thing for the same reason.
     */
    headphoneAdvisory:
        'Hearing a screech or echo? Both devices are in earshot of each other. Move them apart, use headphones, or press Mute speaker — the sound is looping between them, not coming from your microphone.',
    peerMuted: 'Muted',
    peerCameraOff: 'Camera off',
    audioOnlyNotice: 'Camera unavailable — you are on audio only.',
    audioBlockedTitle: 'Tap to turn on sound',
    audioBlockedBody:
        'Your browser blocked audio until you interact with the page.',
    speakerOn: 'Mute speaker',
    speakerOff: 'Unmute speaker',
    doctorTitle: 'Video Consultation',
    doctorSubtitle:
        'Notes save as a draft. Finalizing ends the call and closes the visit.',
    patientTitle: 'Your Video Consultation',
    patientSubtitle: 'Stay on this page for the whole visit.',
    listTitle: 'Video Consultations',
    listSubtitle:
        'Rooms your doctor has opened. Join from here when a session is ready.',
    emptyTitle: 'No consultation is waiting',
    emptyBody:
        'When your doctor starts a video consultation, it will appear here and you will get a notification.',
    /**
     * The room is not open, keyed by why.
     *
     * Each of these used to be a 404, reached by the most ordinary sequence
     * there is: the call ends, the patient presses back, and the visit has
     * simultaneously vanished from a list that only shows live rooms. Naming the
     * reason is the difference between "the visit is over" and "my phone is
     * broken" — and only one of those is worth a panicked call to the clinic.
     */
    closedReasons: {
        not_open: {
            title: 'This room has not opened yet',
            body: 'Your doctor opens the video room when they are ready for you. You will get a notification the moment it does — keep this page or your consultations list open.',
        },
        ended: {
            title: 'This call has ended',
            body: 'If you were disconnected by mistake, your doctor can reopen the room and it will appear in your consultations again.',
        },
        finalized: {
            title: 'This consultation is complete',
            body: 'Your doctor has signed the notes for this visit. You can read them in your medical records.',
        },
    },
    /**
     * Confirmation before a call ends, because ending one is not symmetric.
     *
     * A patient leaving is recoverable — the room stays open and they rejoin.
     * A doctor leaving closes the consultation for both, and if the note is
     * still a draft at that moment there is no prompt anywhere else in the app
     * that asks them to sign it. Finalizing is the actual end of the visit;
     * offering it here is offering the thing they came to do.
     */
    leaveConfirm: {
        patient: {
            title: 'Leave this call?',
            body: 'Your doctor stays in the room, so you can rejoin from your consultations list if you leave by mistake.',
            confirm: 'Leave call',
        },
        doctor: {
            title: 'End this consultation?',
            body: 'Ending closes the room for the patient too. If you are finished, finalizing signs the notes and completes the visit — a draft can still be edited later.',
            confirm: 'End call, keep draft',
            finalize: 'Finalize & end visit',
        },
        cancel: 'Stay in the call',
    },
    /** Used by the browser's own dialog, which cannot be styled. */
    navigateAwayWarning:
        'You are still in a video consultation. Leaving this page will drop the call.',
    closedBackToList: 'Back to my consultations',
    closedToRecords: 'View my records',
    saved: 'Draft saved.',
    autosaved: 'Saved automatically.',
    saveFailed: 'Could not save — your notes are still here. Try again.',
    patientBackToList: 'Back to my consultations',
    doctorBackToList: 'Back to consultations',
    secureContextWarning:
        'This page is not on a secure connection, so the browser will block camera access. Open the site over https.',
};
