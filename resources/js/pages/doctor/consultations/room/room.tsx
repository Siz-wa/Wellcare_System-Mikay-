import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { consultationRoomMeta } from '@/components/consultation-room/consultation-room-data';
import { LeaveCallDialog } from '@/components/consultation-room/leave-call-dialog';
import { VideoStage } from '@/components/consultation-room/video-stage';
import { ConfirmDialog, Select } from '@/design-system';
import { useWebRtc } from '@/hooks/use-web-rtc';
import type { ReverbConfig } from '@/lib/echo';
import type { VitalsSource } from '@/lib/vitals';
import { DashboardLayout } from '../../layout/dashboard-layout';
import type {
    AllergyConflict,
    LabOrder,
    Medication,
    RecordedAllergy,
} from '../consultations-data';
import { AllergyPanel } from '../session-editor/allergy-panel';
import { LabOrders } from '../session-editor/lab-orders';
import { Prescription } from '../session-editor/prescription';

/**
 * The doctor's video console — video on the left, SOAP and vitals on the right.
 *
 * A dedicated page rather than a tab inside the existing session-editor modal:
 * that modal unmounts on Escape, which would tear down the RTCPeerConnection
 * and drop the call every time the doctor hit the key. It also gives the notes
 * and the patient's face room to coexist, which a tabbed modal cannot.
 */

interface RoomPageProps {
    appointment: {
        id: number;
        patient: string;
        service: string;
        date: string;
        time: string;
        age: number;
        gender: string;
        patientRecordId: number | null;
    };
    room: { id: string; status: string; startedAt: string | null };
    soap: Record<'subjective' | 'objective' | 'assessment' | 'plan', string>;
    vitals: Record<string, string> & { source: VitalsSource };
    /** value -> label, straight from ConsultationSession::VITALS_SOURCE_LABELS. */
    vitalsSources: Record<VitalsSource, string>;
    isInitiator: boolean;
    selfUserId: number;
    iceServers: RTCIceServer[];
    reverb: ReverbConfig;
    csrfToken: string;
    /** Prescribing and lab orders, so a video visit can do both. */
    prescriptions: { id: string; name: string; instructions: string }[];
    allergies: RecordedAllergy[];
    labs: LabOrder[];
    flash?: { allergyConflicts?: AllergyConflict[] };
    [key: string]: unknown;
}

/** Every measurement blanked — see `notObtained` in the component. */
const BLANK_MEASUREMENTS = {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
} as const;

/** Long enough not to post on every keystroke, short enough to lose nothing. */
const AUTOSAVE_IDLE_MS = 4000;

const SOAP_FIELDS = [
    { key: 'subjective', label: 'Subjective' },
    { key: 'objective', label: 'Objective' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'plan', label: 'Plan' },
] as const;

/**
 * The six measurements — and not one of them can be taken by a doctor looking
 * at a screen. Every number entered here during a video call is one the patient
 * read off their own cuff, thermometer, scale or oximeter, which is ordinary
 * telehealth practice on one condition: the record has to say so. That is what
 * the source control below the grid is for, and why it is not optional here.
 */
const VITAL_FIELDS = [
    { key: 'bloodPressure', label: 'BP', unit: 'mmHg' },
    { key: 'heartRate', label: 'HR', unit: 'bpm' },
    { key: 'temperature', label: 'Temp', unit: '°C' },
    { key: 'oxygenSaturation', label: 'SpO2', unit: '%' },
    { key: 'weight', label: 'Weight', unit: 'kg' },
    { key: 'height', label: 'Height', unit: 'cm' },
] as const;

export default function DoctorConsultationRoom(): ReactElement {
    const {
        appointment,
        room,
        soap,
        vitals,
        vitalsSources,
        isInitiator,
        selfUserId,
        iceServers,
        reverb,
        csrfToken,
    } = usePage<RoomPageProps>().props;
    const pageProps = usePage<RoomPageProps>().props;

    const [soapState, setSoapState] = useState(soap);
    const [medications, setMedications] = useState<Medication[]>(() =>
        (pageProps.prescriptions ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            instructions: p.instructions,
        })),
    );
    const [draftMed, setDraftMed] = useState({ name: '', instructions: '' });
    const [overrideReason, setOverrideReason] = useState('');
    const allergyConflicts = pageProps.flash?.allergyConflicts ?? [];
    const [vitalsState, setVitalsState] = useState(vitals);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    /** Field-level reasons the last save was refused, e.g. an out-of-range vital. */
    const [saveErrors, setSaveErrors] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    /** Finalize ends the call and signs the note, so it is confirmed first. */
    const [confirmFinalize, setConfirmFinalize] = useState(false);
    /** Disarms the navigation guard for an exit the doctor deliberately chose. */
    const [leaving, setLeaving] = useState(false);

    const call = useWebRtc({
        roomId: room.id,
        isInitiator,
        selfUserId,
        iceServers,
        reverb,
        csrfToken,
        // Null on purpose: the visit is not documented until the doctor
        // finalizes, so ending the call must not navigate away from unsaved
        // SOAP notes. They leave via the action below when they are ready.
        exitHref: null,
    });

    const callIsLive = call.phase !== 'ended' && call.phase !== 'failed';

    /**
     * "Nothing was obtained" and six numbers cannot both be true, so choosing it
     * clears the grid and closes it. The record then reads as one coherent
     * clinical statement instead of a contradiction. The server enforces the
     * same rule — this endpoint is reachable without this page.
     */
    const notObtained = vitalsState.source === 'not_obtained';

    /**
     * @param finalize Sign the note and close the visit.
     * @param silent   An autosave — do not report it as a user action.
     */
    const save = (finalize: boolean, silent = false) => {
        if (!silent) {
            setSaving(true);
        }

        setDirty(false);

        router.post(
            `/doctor/consultations/${appointment.id}/save`,
            {
                'soap[subjective]': soapState.subjective,
                'soap[objective]': soapState.objective,
                'soap[assessment]': soapState.assessment,
                'soap[plan]': soapState.plan,
                'vitals[bloodPressure]': vitalsState.bloodPressure,
                'vitals[heartRate]': vitalsState.heartRate,
                'vitals[temperature]': vitalsState.temperature,
                'vitals[oxygenSaturation]': vitalsState.oxygenSaturation,
                'vitals[weight]': vitalsState.weight,
                'vitals[height]': vitalsState.height,
                'vitals[source]': vitalsState.source,
                medications: [
                    ...medications,
                    ...(draftMed.name.trim() ? [draftMed] : []),
                ].map((m) => ({
                    name: m.name.trim(),
                    instructions: m.instructions.trim(),
                })),
                ...(overrideReason.trim()
                    ? { allergyOverrideReason: overrideReason.trim() }
                    : {}),
                finalize: finalize ? '1' : '0',
            },
            {
                // preserveState keeps this page instance mounted, so the call
                // is NOT torn down by a save. It is Inertia's default for
                // router.post; stating it here because autosave depends on it
                // and a future change to `false` would drop the call on every
                // keystroke pause.
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onError: (errors) => {
                    setDirty(true);
                    setSaveStatus(consultationRoomMeta.saveFailed);
                    setSaveErrors(Object.values(errors));
                },
                // Finalizing ends the call server-side and completes the visit,
                // so there is nothing left on this page to come back to.
                onSuccess: () => {
                    setSaveErrors([]);

                    if (finalize) {
                        router.visit('/doctor/consultations');

                        return;
                    }

                    setSaveStatus(
                        silent
                            ? consultationRoomMeta.autosaved
                            : consultationRoomMeta.saved,
                    );
                },
            },
        );
    };

    // Autosave.
    //
    // Everything typed here was previously held in React state and written only
    // when the doctor pressed a button. A crash, a closed tab or a stray
    // navigation lost the entire clinical note, and nothing warned them. The
    // /save route is already idempotent and already refuses to reopen a
    // finalized note, so this needs no new endpoint.
    useEffect(() => {
        if (!dirty) {
            return;
        }

        const id = setTimeout(() => save(false, true), AUTOSAVE_IDLE_MS);

        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dirty, soapState, vitalsState]);

    // A last line of defence for the case autosave cannot cover: the tab going
    // away between the last keystroke and the next autosave tick. Also fires for
    // a live call, which is the more consequential loss of the two.
    useEffect(() => {
        if (!dirty && !callIsLive) {
            return;
        }

        const warn = (e: BeforeUnloadEvent): void => {
            e.preventDefault();
        };

        window.addEventListener('beforeunload', warn);

        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty, callIsLive]);

    /**
     * The ways out of a live call that are not the End Call button.
     *
     * Clicking anything in the sidebar is an Inertia navigation: it unmounts
     * this page and drops the consultation with no warning, which is the
     * commonest way a call gets abandoned by accident. Inertia's `before` event
     * is the only interception point and it is synchronous, so this has to be
     * the browser's own confirm rather than the styled dialog — a promise cannot
     * be awaited here.
     *
     * Two exemptions, both load-bearing:
     *
     *  - **Non-GET visits pass through.** Autosave is a `router.post` to this
     *    same page and would otherwise raise a confirm dialog every four seconds
     *    while the doctor typed, which is worse than the problem being solved.
     *  - **`leaving` disarms it.** The dialog's own actions navigate on purpose;
     *    asking a doctor to confirm the exit they just chose is its own bug, and
     *    finalize's redirect can outrun the `bye` that ends the call.
     */
    useEffect(() => {
        if (!callIsLive || leaving) {
            return;
        }

        return router.on('before', (event) => {
            if (event.detail.visit.method !== 'get') {
                return true;
            }

            return window.confirm(consultationRoomMeta.navigateAwayWarning);
        });
    }, [callIsLive, leaving]);

    const panel: React.CSSProperties = {
        background: 'var(--wc-white)',
        border: '1px solid var(--wc-gray-200)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-5)',
    };

    return (
        <DashboardLayout activeId="consultations">
            {/*
                The console fills the viewport instead of growing past it.
                Previously the grid was unbounded and `alignItems: 'start'`, so
                the right rail — SOAP's four textareas, then Vitals, then the
                buttons — ran to roughly 850px and pushed Vitals about 750px down
                the page. On a 1366x768 clinic PC that put Vitals below the fold
                and the Save/Finalize buttons further still, so recording a blood
                pressure meant scrolling the patient's face off screen. Meanwhile
                the video column ended after ~440px and sat on 400px of nothing.

                Now: only SOAP scrolls. Vitals and the actions are pinned to the
                bottom of a viewport-height layout and cannot leave the screen.
            */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                    height: '100%',
                    minHeight: 0,
                }}
            >
                <header style={{ flexShrink: 0 }}>
                    <h1
                        style={{
                            fontSize: 'var(--text-xl)',
                            fontWeight: 700,
                            margin: 0,
                        }}
                    >
                        {consultationRoomMeta.doctorTitle}
                    </h1>
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {appointment.patient} · {appointment.service} ·{' '}
                        {appointment.date} {appointment.time} ·{' '}
                        {appointment.age}
                        {appointment.gender ? `/${appointment.gender}` : ''}
                    </p>
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {consultationRoomMeta.doctorSubtitle}
                    </p>
                </header>

                {/* getUserMedia is undefined outside a secure context and the
                    browser gives no useful error. The patient page has warned
                    about this since day one; the doctor page showed the generic
                    failure card and left them guessing. */}
                {typeof window !== 'undefined' && !window.isSecureContext && (
                    <div
                        style={{
                            flexShrink: 0,
                            padding: 'var(--space-4)',
                            borderRadius: 'var(--radius-lg)',
                            background: 'rgba(185,28,28,.10)',
                            fontSize: 'var(--text-sm)',
                        }}
                    >
                        {consultationRoomMeta.secureContextWarning}
                    </div>
                )}

                <div
                    style={{
                        display: 'grid',
                        // auto-fit rather than a fixed two-column track: below about
                        // 740px this collapses to one column with no media query,
                        // which inline styles cannot express.
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(340px, 1fr))',
                        gap: 'var(--space-5)',
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <div style={{ ...panel, minHeight: 0, overflowY: 'auto' }}>
                        <VideoStage
                            {...call}
                            remoteLabel={appointment.patient}
                            onToggleMic={call.toggleMic}
                            onToggleCamera={call.toggleCamera}
                            onToggleSpeaker={call.toggleSpeaker}
                            onResumeAudio={call.resumeAudio}
                            onHangUp={() => setConfirmLeave(true)}
                            endedAction={
                                <Link
                                    href="/doctor/consultations"
                                    className="wc-btn wc-btn-md wc-btn-pill"
                                >
                                    {consultationRoomMeta.doctorBackToList}
                                </Link>
                            }
                        />
                    </div>

                    {/* The only thing that scrolls. */}
                    <div style={{ ...panel, minHeight: 0, overflowY: 'auto' }}>
                        <div>
                            <h2
                                style={{
                                    fontSize: 'var(--text-sm)',
                                    margin: '0 0 var(--space-3)',
                                }}
                            >
                                SOAP Notes
                            </h2>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-3)',
                                }}
                            >
                                {SOAP_FIELDS.map((f) => (
                                    <label
                                        key={f.key}
                                        style={{ display: 'block' }}
                                    >
                                        <span
                                            className="wc-label"
                                            style={{
                                                display: 'block',
                                                marginBottom: 4,
                                            }}
                                        >
                                            {f.label}
                                        </span>
                                        <textarea
                                            className="wc-input"
                                            rows={3}
                                            value={soapState[f.key]}
                                            onChange={(e) => {
                                                setDirty(true);
                                                setSoapState((s) => ({
                                                    ...s,
                                                    [f.key]: e.target.value,
                                                }));
                                            }}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: 'var(--space-5)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-4)',
                            }}
                        >
                            <h2
                                style={{
                                    fontSize: 'var(--text-sm)',
                                    margin: 0,
                                }}
                            >
                                Prescriptions &amp; lab orders
                            </h2>
                            {appointment.patientRecordId && (
                                <a
                                    href={`/doctor/patient-records/${appointment.patientRecordId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: 'var(--text-sm)' }}
                                >
                                    Record a diagnosis or allergy on the
                                    patient&apos;s chart (opens in a new tab,
                                    the call stays up)
                                </a>
                            )}
                            <AllergyPanel
                                allergies={pageProps.allergies ?? []}
                                conflicts={allergyConflicts}
                                reason={overrideReason}
                                onReasonChange={setOverrideReason}
                            />
                            <Prescription
                                medications={medications}
                                draft={draftMed}
                                onDraftChange={(d) => {
                                    setDraftMed(d);
                                    setDirty(true);
                                }}
                                onAdd={(med) => {
                                    setMedications((prev) => [...prev, med]);
                                    setDirty(true);
                                }}
                                onRemove={(id) => {
                                    setMedications((prev) =>
                                        prev.filter((m) => m.id !== id),
                                    );
                                    setDirty(true);
                                }}
                            />
                            <LabOrders
                                appointmentId={appointment.id}
                                orders={pageProps.labs ?? []}
                                preserveState
                            />
                        </div>
                    </div>
                </div>

                {/* Vitals: a full-width strip across the bottom, pinned. Six short
                numeric fields captured early in a visit have no business being
                the last thing on a scrolling page. auto-fit also gives free
                reflow on a narrow window. */}
                <div style={{ ...panel, flexShrink: 0 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'var(--space-3)',
                            flexWrap: 'wrap',
                            marginBottom: 'var(--space-2)',
                        }}
                    >
                        <h2 style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                            {consultationRoomMeta.vitalsTitle}
                        </h2>

                        {/* The provenance control sits IN the panel header, not
                            after the six inputs. It qualifies every number in
                            the grid, so it has to be read before them — and a
                            doctor who scrolls past it has recorded an unlabelled
                            measurement, which is the whole failure being fixed. */}
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <span
                                className="wc-label"
                                style={{
                                    marginBottom: 0,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {consultationRoomMeta.vitalsSourceLabel}
                            </span>
                            <Select
                                aria-label="Vitals source"
                                style={{ width: 'auto', minWidth: '12rem' }}
                                value={vitalsState.source}
                                onChange={(value) => {
                                    const source = value as VitalsSource;

                                    setDirty(true);
                                    setVitalsState((v) => ({
                                        ...v,
                                        ...(source === 'not_obtained'
                                            ? BLANK_MEASUREMENTS
                                            : null),
                                        source,
                                    }));
                                }}
                                options={Object.entries(vitalsSources).map(
                                    ([value, label]) => ({ value, label }),
                                )}
                            />
                        </label>
                    </div>

                    <p
                        style={{
                            margin: '0 0 var(--space-3)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {notObtained
                            ? consultationRoomMeta.vitalsNotObtainedNote
                            : consultationRoomMeta.vitalsVirtualNote}
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: 'var(--space-3)',
                            // Closed, not hidden: the doctor can still see which
                            // six readings the visit went without.
                            opacity: notObtained ? 0.5 : 1,
                        }}
                    >
                        {VITAL_FIELDS.map((f) => (
                            <label key={f.key}>
                                <span
                                    className="wc-label"
                                    style={{
                                        display: 'block',
                                        marginBottom: 4,
                                    }}
                                >
                                    {f.label} ({f.unit})
                                </span>
                                <input
                                    className="wc-input"
                                    type="text"
                                    disabled={notObtained}
                                    value={vitalsState[f.key] ?? ''}
                                    onChange={(e) => {
                                        setDirty(true);
                                        setVitalsState((v) => ({
                                            ...v,
                                            [f.key]: e.target.value,
                                        }));
                                    }}
                                />
                            </label>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-2)',
                        alignItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    <button
                        type="button"
                        className="wc-btn wc-btn-outline wc-btn-md wc-btn-pill"
                        disabled={saving}
                        onClick={() => save(false)}
                    >
                        Save Draft
                    </button>
                    <button
                        type="button"
                        className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                        disabled={saving}
                        onClick={() => setConfirmFinalize(true)}
                    >
                        Finalize Consultation
                    </button>
                    <span
                        aria-live="polite"
                        style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-muted)',
                        }}
                    >
                        {saveStatus}
                    </span>
                    {saveErrors.length > 0 && (
                        <ul
                            role="alert"
                            style={{
                                margin: 0,
                                paddingLeft: 18,
                                fontSize: 'var(--text-sm)',
                                color: '#b91c1c',
                                flexBasis: '100%',
                            }}
                        >
                            {saveErrors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={confirmFinalize}
                onOpenChange={setConfirmFinalize}
                title="Finalize and end the call?"
                description="Finalizing signs the note, completes the visit and ends the video call for both of you. It cannot be reopened for editing afterwards."
                confirmLabel="Finalize and end call"
                cancelLabel="Keep the call open"
                destructive={false}
                processing={saving}
                onConfirm={() => {
                    setConfirmFinalize(false);
                    save(true);
                }}
            />

            <LeaveCallDialog
                open={confirmLeave}
                role="doctor"
                busy={saving}
                onCancel={() => setConfirmLeave(false)}
                onConfirm={() => {
                    setConfirmLeave(false);
                    setLeaving(true);

                    // Flush the note before dropping the call. Autosave runs on
                    // a 4s idle timer, so a doctor who types a last line and
                    // immediately ends the call would otherwise lose it — and
                    // after this the room is closed, which makes the loss
                    // permanent.
                    if (dirty) {
                        save(false, true);
                    }

                    call.hangUp();
                }}
                onFinalize={() => {
                    setConfirmLeave(false);
                    setLeaving(true);
                    // finalize() signs the note, completes the visit, and ends
                    // the call server-side — including the `bye` that tells the
                    // patient. No separate hangUp needed, and issuing one would
                    // race the redirect.
                    save(true);
                }}
            />
        </DashboardLayout>
    );
}
