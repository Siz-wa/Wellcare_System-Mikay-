// resources/js/pages/doctor/dashboard/consultations/session-editor/session-editor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TOAST CHANGES:
//   - Added `onSaveSuccess` callback — fires after Save Draft succeeds so the
//     parent page can show a toast (editor stays open, flash won't render).
//   - Added `onFinalizeSuccess` callback — fires after Finalize succeeds so the
//     parent page can show a toast before/after closing the editor.
//   - Added local inline feedback label under the save indicator so the doctor
//     sees "Saved" confirmation even without a full toast.

import { router, usePage } from '@inertiajs/react';
import { FlaskConical, Pill } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import { ConfirmDialog } from '@/design-system';
import type { VitalsSource } from '@/lib/vitals';
import { IconX, IconSoap, IconVitals, IconHistory } from '@/pages/doctor/icons';
import {
    consultationsMeta,
    sessionTabs,
    emptySoap,
    defaultVitals,
} from '../consultations-data';
import type {
    SessionTab,
    SoapFields,
    VitalsFields,
    ConsultationRecord,
    Medication,
    AllergyConflict,
} from '../consultations-data';
import { AllergyPanel } from './allergy-panel';
import { LabOrders } from './lab-orders';
import { PatientVitals } from './patient-vitals';
import { Prescription } from './prescription';
import { SoapNotes } from './soap-notes';

function TabIcon({
    iconKey,
}: {
    iconKey: 'soap' | 'vitals' | 'labs' | 'meds';
}): ReactElement {
    if (iconKey === 'soap') {
        return <IconSoap />;
    }

    if (iconKey === 'labs') {
        return <FlaskConical size={16} strokeWidth={1.9} />;
    }

    if (iconKey === 'meds') {
        return <Pill size={16} strokeWidth={1.9} />;
    }

    return <IconVitals />;
}

/** The saved draft's SOAP fields, or blanks for a session never saved. */
function soapFrom(consultation: ConsultationRecord): SoapFields {
    return {
        ...emptySoap,
        subjective: consultation.soap?.subjective ?? '',
        objective: consultation.soap?.objective ?? '',
        assessment: consultation.soap?.assessment ?? '',
        plan: consultation.soap?.plan ?? '',
    };
}

/** The saved draft's vitals, defaulting provenance the way the server does. */
function vitalsFrom(consultation: ConsultationRecord): VitalsFields {
    return {
        ...defaultVitals,
        bloodPressure: consultation.vitals?.bloodPressure ?? '',
        heartRate: consultation.vitals?.heartRate ?? '',
        temperature: consultation.vitals?.temperature ?? '',
        oxygenSaturation: consultation.vitals?.oxygenSaturation ?? '',
        weight: consultation.vitals?.weight ?? '',
        height: consultation.vitals?.height ?? '',
        // Falls back to the mode-appropriate default the server already
        // applied, so an unopened session does not present the doctor with
        // a blank provenance they can silently save past.
        source: consultation.vitals?.source ?? 'clinic_measured',
    };
}

/** The saved draft's prescriptions. */
function medicationsFrom(consultation: ConsultationRecord): Medication[] {
    return (consultation.prescriptions ?? []).map((p, i) => ({
        id: p.id ?? `med-existing-${i}`,
        name: p.name,
        instructions: p.instructions,
    }));
}

/** Which tab holds the field a server error was raised against. */
function tabForError(key: string): SessionTab | null {
    if (key.startsWith('soap')) {
        return 'soap';
    }

    if (key.startsWith('vitals')) {
        return 'vitals';
    }

    if (key.startsWith('medications') || key === 'allergyOverrideReason') {
        return 'meds';
    }

    return null;
}

interface SessionEditorProps {
    /**
     * Never null. The editor documents a booked visit the patient checked in
     * for — it was previously openable with nothing behind it, which produced a
     * complete clinical form whose Save and Finalize buttons were both disabled.
     * See the `sessionOriginNote` comment in consultations-data.ts.
     */
    consultation: ConsultationRecord;
    onClose: () => void;
    onSaveSuccess?: () => void; // called after Save Draft succeeds
    onFinalizeSuccess?: () => void; // called after Finalize succeeds
    /** Called after a lab test is successfully ordered, with its name. */
    onLabOrdered?: (testName: string) => void;
}

export function SessionEditor({
    consultation,
    onClose,
    onSaveSuccess,
    onFinalizeSuccess,
    onLabOrdered,
}: SessionEditorProps): ReactElement {
    const meta = consultationsMeta;

    /**
     * The provenance vocabulary, served by DoctorConsultationController::index
     * so the select and the validator share one definition.
     */
    const { vitalsSources, flash } = usePage<{
        vitalsSources: Record<VitalsSource, string>;
        flash?: { allergyConflicts?: AllergyConflict[] };
    }>().props;

    const [activeTab, setActiveTab] = useState<SessionTab>('soap');
    // Seeded from the saved draft on mount. The editor unmounts when it is
    // closed, so starting from blanks here meant every reopen showed an empty
    // form, and the next Save or Finalize wrote those blanks over the notes.
    const [soap, setSoap] = useState<SoapFields>(() => soapFrom(consultation));
    const [vitals, setVitals] = useState<VitalsFields>(() =>
        vitalsFrom(consultation),
    );
    const [medications, setMedications] = useState<Medication[]>(() =>
        medicationsFrom(consultation),
    );

    /**
     * A medicine typed into the add row but not yet confirmed with "Add".
     * Held here so Save and Finalize include it instead of dropping it.
     */
    const [draftMed, setDraftMed] = useState({ name: '', instructions: '' });

    /** Field-level messages from the last refused save. */
    const [serverErrors, setServerErrors] = useState<Record<string, string>>(
        {},
    );

    /**
     * Conflicts the server refused the save over, and the acknowledgement the
     * doctor types to proceed. Held here rather than in the Prescription tab
     * because the refusal can arrive from a Finalize on any tab.
     */
    const [allergyConflicts, setAllergyConflicts] = useState<AllergyConflict[]>(
        [],
    );
    const [overrideReason, setOverrideReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveLabel, setSaveLabel] = useState<'idle' | 'saved' | 'error'>(
        'idle',
    );
    const [mountAnim, setMountAnim] = useState(false);
    /** Finalize is irreversible, so it is confirmed first. */
    const [confirmFinalize, setConfirmFinalize] = useState(false);

    /**
     * Read the refusal from the shared flash prop rather than from the save
     * visit's callbacks.
     *
     * The server answers a contraindication with BOTH `withErrors` and the
     * flash. A non-empty `props.errors` makes Inertia treat the response as a
     * failed visit, so it calls onError — and reading the conflicts in
     * onSuccess alone meant the panel never rendered: the save was refused and
     * the doctor was shown nothing at all, which is the one outcome a
     * drug-allergy check must never produce.
     *
     * Watching the prop covers both handlers, and any future caller that
     * refuses a save the same way.
     */
    const flashedConflicts = flash?.allergyConflicts;

    // Adjusted during render when the prop changes (React's recommended form
    // of "reset state on prop change"), rather than in an effect.
    const [seenConflicts, setSeenConflicts] = useState(flashedConflicts);

    if (flashedConflicts !== seenConflicts) {
        setSeenConflicts(flashedConflicts);

        if (flashedConflicts && flashedConflicts.length > 0) {
            setAllergyConflicts(flashedConflicts);
            setActiveTab('meds');
            setSaveLabel('error');
        }
    }

    /**
     * Pre-populate the editor when a *different* consultation is opened.
     *
     * Adjusted during render rather than from an effect, and keyed on the
     * consultation **id** rather than the object identity. The effect version
     * depended on `[consultation]`, which is a fresh object on every parent
     * re-render — so any unrelated re-render of the list while the editor was
     * open overwrote whatever the doctor had typed with the last saved values.
     * That is silent clinical-note loss, not just a wasted render.
     */
    const [loadedId, setLoadedId] = useState(consultation.id);

    if (consultation.id !== loadedId) {
        setLoadedId(consultation.id);

        setSoap(soapFrom(consultation));
        setVitals(vitalsFrom(consultation));
        setMedications(medicationsFrom(consultation));
        setDraftMed({ name: '', instructions: '' });
        setServerErrors({});

        // A different patient's conflicts must never carry over.
        setAllergyConflicts([]);
        setOverrideReason('');
    }

    useEffect(() => {
        const t = setTimeout(() => setMountAnim(true), 10);

        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        function handleKey(e: KeyboardEvent): void {
            if (e.key === 'Escape') {
                onClose();
            }
        }
        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleSoapChange = useCallback(
        (key: keyof SoapFields, value: string): void => {
            setSoap((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const handleVitalsChange = useCallback(
        (key: keyof VitalsFields, value: string): void => {
            setVitals((prev) => ({
                ...prev,
                // "Nothing was obtained" and six numbers cannot both be true,
                // so choosing it clears them. The server normalises the same
                // way for saves that never came through this form.
                ...(key === 'source' && value === 'not_obtained'
                    ? {
                          bloodPressure: '',
                          heartRate: '',
                          temperature: '',
                          oxygenSaturation: '',
                          weight: '',
                          height: '',
                      }
                    : null),
                [key]: value,
            }));
        },
        [],
    );

    // ── Submit ────────────────────────────────────────────────────────────────

    function handleSave(finalize: boolean): void {
        setSaving(true);
        setSaveLabel('idle');
        setServerErrors({});

        router.post(
            `/doctor/consultations/${consultation.id}/save`,
            {
                'soap[subjective]': soap.subjective,
                'soap[objective]': soap.objective,
                'soap[assessment]': soap.assessment,
                'soap[plan]': soap.plan,
                'vitals[bloodPressure]': vitals.bloodPressure,
                'vitals[heartRate]': vitals.heartRate,
                'vitals[temperature]': vitals.temperature,
                'vitals[oxygenSaturation]': vitals.oxygenSaturation,
                'vitals[weight]': vitals.weight,
                'vitals[height]': vitals.height,
                'vitals[source]': vitals.source,
                medications: [
                    ...medications,
                    ...(draftMed.name.trim()
                        ? [
                              {
                                  name: draftMed.name.trim(),
                                  instructions: draftMed.instructions.trim(),
                              },
                          ]
                        : []),
                ].map((m) => ({
                    name: m.name,
                    instructions: m.instructions,
                })),
                // Only sent once the doctor has acknowledged a warning. Absent
                // on a first attempt, which is what makes the server refuse.
                ...(overrideReason.trim()
                    ? { allergyOverrideReason: overrideReason.trim() }
                    : {}),
                finalize: finalize ? '1' : '0',
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => {
                    // A refusal never reaches here — the server sends it with
                    // `withErrors`, so Inertia routes it to onError. The
                    // conflicts are read from the shared flash prop by the
                    // effect above, which fires for either handler. Reaching
                    // this point means the save actually committed.
                    setAllergyConflicts([]);
                    setOverrideReason('');

                    // The pending row went up with this save; list it so it
                    // is not sent twice.
                    if (draftMed.name.trim()) {
                        setMedications((prev) => [
                            ...prev,
                            {
                                id: `med-${Date.now()}`,
                                name: draftMed.name.trim(),
                                instructions: draftMed.instructions.trim(),
                            },
                        ]);
                        setDraftMed({ name: '', instructions: '' });
                    }

                    setSaveLabel('saved');
                    // Reset "Saved" label back to idle after 3 s
                    setTimeout(() => setSaveLabel('idle'), 3000);

                    if (finalize) {
                        onFinalizeSuccess?.();
                        onClose();
                    } else {
                        onSaveSuccess?.();
                    }
                },
                onError: (errors) => {
                    setSaveLabel('error');
                    setServerErrors(errors);

                    // Take the doctor to the tab holding the first problem,
                    // unless the allergy panel has already claimed the view.
                    const firstTab = Object.keys(errors)
                        .map(tabForError)
                        .find((t): t is SessionTab => t !== null);

                    if (firstTab && !flashedConflicts?.length) {
                        setActiveTab(firstTab);
                    }
                },
            },
        );
    }

    const patientName = consultation.patient;

    // ── Save status indicator label ───────────────────────────────────────────
    const statusDot = saving
        ? '#ca8a04'
        : saveLabel === 'saved'
          ? '#16a34a'
          : saveLabel === 'error'
            ? '#b91c1c'
            : '#94a3b8';

    const statusText = saving
        ? 'Saving…'
        : saveLabel === 'saved'
          ? 'Saved'
          : saveLabel === 'error'
            ? 'Save failed'
            : meta.autoSaveLabel;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15,23,42,0.55)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
                    opacity: mountAnim ? 1 : 0,
                    transition: 'opacity var(--duration-slow) var(--ease-out)',
                }}
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={meta.editorTitle}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--space-8)',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: 860,
                        maxHeight: 'calc(100vh - var(--space-16))',
                        background: 'var(--wc-white)',
                        borderRadius: 'var(--radius-3xl)',
                        boxShadow: 'var(--shadow-2xl)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        pointerEvents: 'auto',
                        opacity: mountAnim ? 1 : 0,
                        transform: mountAnim
                            ? 'translateY(0) scale(1)'
                            : 'translateY(24px) scale(0.97)',
                        transition:
                            'opacity var(--duration-slow) var(--ease-out), transform var(--duration-slow) var(--ease-out)',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-5) var(--space-6)',
                            borderBottom: '1px solid var(--wc-gray-100)',
                            flexShrink: 0,
                        }}
                    >
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
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--wc-blue-50)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--wc-blue-600)',
                                    flexShrink: 0,
                                }}
                            >
                                <IconVitals />
                            </div>
                            <div>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-base)',
                                        fontWeight: 700,
                                        color: 'var(--wc-text-primary)',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {meta.editorTitle}
                                </p>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-text-muted)',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    {meta.editorPatientLabel}{' '}
                                    <span
                                        style={{
                                            color: 'var(--wc-blue-600)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {patientName}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 36,
                                height: 36,
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--wc-gray-200)',
                                background: 'var(--wc-white)',
                                color: 'var(--wc-text-muted)',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            <IconX />
                        </button>
                    </div>

                    {/* Body */}
                    <div
                        style={{
                            display: 'flex',
                            flex: 1,
                            overflow: 'hidden',
                            minHeight: 0,
                        }}
                    >
                        {/* Left tabs */}
                        <div
                            style={{
                                width: 180,
                                flexShrink: 0,
                                borderRight: '1px solid var(--wc-gray-100)',
                                padding: 'var(--space-4) var(--space-3)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-1)',
                                overflowY: 'auto',
                            }}
                        >
                            {sessionTabs.map((tab) => {
                                const isActive = tab.key === activeTab;

                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-3)',
                                            padding:
                                                'var(--space-3) var(--space-4)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: 'none',
                                            background: isActive
                                                ? 'var(--wc-blue-600)'
                                                : 'transparent',
                                            color: isActive
                                                ? '#ffffff'
                                                : 'var(--wc-gray-600)',
                                            fontSize: 'var(--text-sm)',
                                            fontWeight: isActive ? 700 : 500,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition:
                                                'all var(--duration-base) var(--ease-out)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                opacity: isActive ? 1 : 0.65,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <TabIcon iconKey={tab.iconKey} />
                                        </span>
                                        {tab.label}
                                    </button>
                                );
                            })}

                            <div
                                style={{
                                    marginTop: 'auto',
                                    paddingTop: 'var(--space-4)',
                                    borderTop: '1px solid var(--wc-gray-100)',
                                }}
                            >
                                <button
                                    type="button"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        padding:
                                            'var(--space-2) var(--space-4)',
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--wc-text-muted)',
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <IconHistory />
                                    {meta.pastHistoryLabel}
                                </button>
                            </div>
                        </div>

                        {/* Right content */}
                        <div
                            style={{
                                flex: 1,
                                padding: 'var(--space-5)',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                            }}
                        >
                            {activeTab === 'soap' && (
                                <SoapNotes
                                    values={soap}
                                    onChange={handleSoapChange}
                                />
                            )}
                            {activeTab === 'vitals' && (
                                <PatientVitals
                                    values={vitals}
                                    sources={vitalsSources}
                                    baseline={consultation.baseline}
                                    onChange={handleVitalsChange}
                                />
                            )}
                            {activeTab === 'meds' && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-4)',
                                        flex: 1,
                                    }}
                                >
                                    <AllergyPanel
                                        allergies={consultation.allergies ?? []}
                                        conflicts={allergyConflicts}
                                        reason={overrideReason}
                                        onReasonChange={setOverrideReason}
                                    />
                                    <Prescription
                                        medications={medications}
                                        draft={draftMed}
                                        onDraftChange={setDraftMed}
                                        onAdd={(med) => {
                                            setMedications((prev) => [
                                                ...prev,
                                                med,
                                            ]);
                                            // A changed list invalidates the
                                            // warning it was raised against.
                                            setAllergyConflicts([]);
                                        }}
                                        onRemove={(id) => {
                                            setMedications((prev) =>
                                                prev.filter((m) => m.id !== id),
                                            );
                                            setAllergyConflicts([]);
                                        }}
                                    />
                                </div>
                            )}
                            {activeTab === 'labs' && (
                                <LabOrders
                                    appointmentId={consultation.id}
                                    orders={consultation.labs ?? []}
                                    onOrdered={onLabOrdered}
                                />
                            )}
                        </div>
                    </div>

                    {Object.keys(serverErrors).length > 0 && (
                        <div
                            role="alert"
                            style={{
                                padding: 'var(--space-3) var(--space-6)',
                                borderTop: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#991b1b',
                                fontSize: 'var(--text-sm)',
                                flexShrink: 0,
                            }}
                        >
                            <p style={{ margin: 0, fontWeight: 700 }}>
                                {meta.saveRefusedTitle}
                            </p>
                            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                                {Object.entries(serverErrors).map(
                                    ([key, message]) => (
                                        <li key={key}>{message}</li>
                                    ),
                                )}
                            </ul>
                        </div>
                    )}

                    <ConfirmDialog
                        open={confirmFinalize}
                        onOpenChange={setConfirmFinalize}
                        title="Finalize this consultation?"
                        description={
                            'Finalizing signs the note and completes the visit. It cannot be reopened for editing afterwards.'
                        }
                        confirmLabel="Finalize and close the visit"
                        cancelLabel="Keep editing"
                        destructive={false}
                        processing={saving}
                        onConfirm={() => {
                            setConfirmFinalize(false);
                            handleSave(true);
                        }}
                    />

                    {/* Footer */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-4) var(--space-6)',
                            borderTop: '1px solid var(--wc-gray-100)',
                            flexShrink: 0,
                            background: 'var(--wc-white)',
                        }}
                    >
                        {/* Save status indicator */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 'var(--radius-full)',
                                    background: statusDot,
                                    flexShrink: 0,
                                    transition: 'background 0.3s ease',
                                }}
                            />
                            <span
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 500,
                                    color:
                                        saveLabel === 'error'
                                            ? '#b91c1c'
                                            : saveLabel === 'saved'
                                              ? '#16a34a'
                                              : 'var(--wc-gray-500)',
                                    transition: 'color 0.3s ease',
                                }}
                            >
                                {statusText}
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-3)',
                            }}
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: 'var(--space-3) var(--space-6)',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--wc-gray-200)',
                                    background: 'var(--wc-white)',
                                    color: 'var(--wc-text-secondary)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {meta.discardLabel}
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSave(false)}
                                style={{
                                    padding: 'var(--space-3) var(--space-6)',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--wc-blue-600)',
                                    background: 'transparent',
                                    color: 'var(--wc-blue-600)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 700,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.6 : 1,
                                }}
                            >
                                Save Draft
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setConfirmFinalize(true)}
                                className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    opacity: saving ? 0.6 : 1,
                                }}
                            >
                                <IconVitals />
                                {meta.finalizeLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
