import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { consultationRoomMeta } from './consultation-room-data';

/**
 * The confirmation between "I pressed End Call" and the call actually ending.
 *
 * End Call used to fire immediately, and the two roles have very different
 * consequences behind that one button: a patient's tap is recoverable — the room
 * stays open and they rejoin — while a doctor's closes the consultation for both
 * parties. On a phone, held one-handed, next to a face, that button is easy to
 * hit by accident.
 *
 * The doctor's version offers Finalize as a first-class choice rather than a
 * separate trip to another control. Ending a visit whose note is still a draft
 * is the normal way an unsigned consultation is left behind, and nothing else in
 * the app asks about it at the moment it matters.
 */
interface LeaveCallDialogProps {
    open: boolean;
    role: 'doctor' | 'patient';
    /** Leave without signing anything. */
    onConfirm: () => void;
    /** Doctor only — sign the note and complete the visit on the way out. */
    onFinalize?: () => void;
    onCancel: () => void;
    /** A save is in flight; the buttons must not be pressed twice. */
    busy?: boolean;
}

export function LeaveCallDialog({
    open,
    role,
    onConfirm,
    onFinalize,
    onCancel,
    busy = false,
}: LeaveCallDialogProps): ReactElement | null {
    // Escape cancels. Bound on the document rather than the dialog because the
    // focus may still be on the End Call button that opened it.
    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [open, onCancel]);

    if (!open) {
        return null;
    }

    const copy = consultationRoomMeta.leaveConfirm[role];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            onClick={onCancel}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-4)',
                background: 'rgba(15,23,42,0.55)',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: 'var(--wc-white)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-6)',
                    boxShadow: 'var(--shadow-2xl)',
                }}
            >
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                    {copy.title}
                </h2>

                <p
                    style={{
                        margin: 'var(--space-3) 0 0',
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {copy.body}
                </p>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-5)',
                    }}
                >
                    {/* Finalize sits first and is the primary action: for a
                        doctor who is genuinely done, it is the correct ending
                        and the one that closes the clinical record. */}
                    {role === 'doctor' && onFinalize && (
                        <button
                            type="button"
                            className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                            disabled={busy}
                            onClick={onFinalize}
                        >
                            {consultationRoomMeta.leaveConfirm.doctor.finalize}
                        </button>
                    )}

                    <button
                        type="button"
                        className="wc-btn wc-btn-md wc-btn-pill"
                        disabled={busy}
                        onClick={onConfirm}
                        style={{
                            background: 'var(--wc-error)',
                            color: '#fff',
                            border: 'none',
                        }}
                    >
                        {copy.confirm}
                    </button>

                    <button
                        type="button"
                        className="wc-btn wc-btn-md wc-btn-pill"
                        disabled={busy}
                        onClick={onCancel}
                    >
                        {consultationRoomMeta.leaveConfirm.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
}
