// resources/js/pages/generals/book-appointment/components/step-nav.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Back / Continue (or Submit) navigation bar rendered at the bottom of each step.

import type { ReactElement } from 'react';
import { IconArrowLeft, IconArrowRight } from './booking-icons';

interface StepNavProps {
    onBack?: () => void;
    onNext?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    isSubmit?: boolean;
    isProcessing?: boolean;
}

export function StepNav({
    onBack,
    onNext,
    nextLabel = 'Continue',
    nextDisabled = false,
    isSubmit = false,
    isProcessing = false,
}: StepNavProps): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: onBack ? 'space-between' : 'flex-end',
                alignItems: 'center',
                marginTop: 'var(--space-8)',
                paddingTop: 'var(--space-6)',
                borderTop: '1px solid var(--wc-gray-100)',
            }}
        >
            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="wc-btn wc-btn-ghost wc-btn-md wc-btn-pill"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                    }}
                >
                    <IconArrowLeft /> Back
                </button>
            )}

            <button
                type={isSubmit ? 'submit' : 'button'}
                onClick={isSubmit ? undefined : onNext}
                disabled={nextDisabled || isProcessing}
                className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill"
                aria-busy={isProcessing}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    opacity: nextDisabled ? 0.45 : 1,
                    minWidth: 180,
                    justifyContent: 'center',
                    transition: 'opacity var(--duration-base) var(--ease-out)',
                }}
            >
                {isProcessing ? 'Submitting…' : nextLabel}
                {!isSubmit && !isProcessing && <IconArrowRight />}
            </button>
        </div>
    );
}
