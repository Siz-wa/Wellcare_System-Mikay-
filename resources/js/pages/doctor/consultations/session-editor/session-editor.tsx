// resources/js/pages/doctor/dashboard/consultations/session-editor/session-editor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TOAST CHANGES:
//   - Added `onSaveSuccess` callback — fires after Save Draft succeeds so the
//     parent page can show a toast (editor stays open, flash won't render).
//   - Added `onFinalizeSuccess` callback — fires after Finalize succeeds so the
//     parent page can show a toast before/after closing the editor.
//   - Added local inline feedback label under the save indicator so the doctor
//     sees "Saved" confirmation even without a full toast.

import { router } from '@inertiajs/react';
import { FlaskConical } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
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
} from '../consultations-data';
import { LabOrders } from './lab-orders';
import { PatientVitals } from './patient-vitals';
import { SoapNotes } from './soap-notes';

function TabIcon({
    iconKey,
}: {
    iconKey: 'soap' | 'vitals' | 'labs';
}): ReactElement {
    if (iconKey === 'soap') {
        return <IconSoap />;
    }

    if (iconKey === 'labs') {
        return <FlaskConical size={16} strokeWidth={1.9} />;
    }

    return <IconVitals />;
}

interface SessionEditorProps {
    consultation: ConsultationRecord | null;
    onClose: () => void;
    onSaveSuccess?: () => void; // called after Save Draft succeeds
    onFinalizeSuccess?: () => void; // called after Finalize succeeds
}

export function SessionEditor({
    consultation,
    onClose,
    onSaveSuccess,
    onFinalizeSuccess,
}: SessionEditorProps): ReactElement {
    const meta = consultationsMeta;

    const [activeTab, setActiveTab] = useState<SessionTab>('soap');
    const [soap, setSoap] = useState<SoapFields>({ ...emptySoap });
    const [vitals, setVitals] = useState<VitalsFields>({ ...defaultVitals });
    const [saving, setSaving] = useState(false);
    const [saveLabel, setSaveLabel] = useState<'idle' | 'saved' | 'error'>(
        'idle',
    );
    const [mountAnim, setMountAnim] = useState(false);

    // Pre-populate from existing session data
    useEffect(() => {
        if (consultation?.soap) {
            setSoap({
                subjective: consultation.soap.subjective ?? '',
                objective: consultation.soap.objective ?? '',
                assessment: consultation.soap.assessment ?? '',
                plan: consultation.soap.plan ?? '',
            });
        }

        if (consultation?.vitals) {
            setVitals({
                bloodPressure: consultation.vitals.bloodPressure ?? '',
                heartRate: consultation.vitals.heartRate ?? '',
                temperature: consultation.vitals.temperature ?? '',
                oxygenSaturation: consultation.vitals.oxygenSaturation ?? '',
                weight: consultation.vitals.weight ?? '',
                height: consultation.vitals.height ?? '',
            });
        }
    }, [consultation]);

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
            setVitals((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    // ── Submit ────────────────────────────────────────────────────────────────

    function handleSave(finalize: boolean): void {
        if (!consultation) {
            return;
        }

        setSaving(true);
        setSaveLabel('idle');

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
                finalize: finalize ? '1' : '0',
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => {
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
                onError: () => {
                    setSaveLabel('error');
                    setTimeout(() => setSaveLabel('idle'), 4000);
                },
            },
        );
    }

    const patientName = consultation?.patient ?? meta.editorPatientEmpty;

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
                                        color: 'var(--wc-dark)',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {meta.editorTitle}
                                </p>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-gray-400)',
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
                                color: 'var(--wc-gray-500)',
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
                                        color: 'var(--wc-gray-500)',
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
                                    onChange={handleVitalsChange}
                                />
                            )}
                            {activeTab === 'labs' && (
                                <LabOrders
                                    appointmentId={consultation?.id ?? null}
                                    orders={consultation?.labs ?? []}
                                />
                            )}
                        </div>
                    </div>

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
                                    color: 'var(--wc-gray-600)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {meta.discardLabel}
                            </button>
                            <button
                                type="button"
                                disabled={saving || !consultation}
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
                                disabled={saving || !consultation}
                                onClick={() => handleSave(true)}
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
