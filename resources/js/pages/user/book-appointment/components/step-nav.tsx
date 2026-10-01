// resources/js/pages/user/book-appointment/components/step-nav.tsx
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
        // `flex-col-reverse` on phones: Continue is written second but has to
        // sit on top, because it is the action the patient wants and the thumb
        // rests at the bottom of the screen. Side by side these two overflowed
        // outright — Continue alone carried `min-width: 180px`, and 180 + Back
        // does not fit the 358px a 390px handset actually has.
        <div
            className={`mt-8 flex flex-col-reverse gap-3 border-t border-t-[var(--wc-gray-100)] pt-6 sm:flex-row sm:items-center sm:gap-0 ${
                onBack ? 'sm:justify-between' : 'sm:justify-end'
            }`}
        >
            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="wc-btn wc-btn-ghost wc-btn-md wc-btn-pill flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                    <IconArrowLeft /> Back
                </button>
            )}

            <button
                type={isSubmit ? 'submit' : 'button'}
                onClick={isSubmit ? undefined : onNext}
                disabled={nextDisabled || isProcessing}
                className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill flex w-full items-center justify-center gap-2 sm:w-auto sm:min-w-[180px]"
                aria-busy={isProcessing}
                style={{
                    opacity: nextDisabled ? 0.45 : 1,
                    transition: 'opacity var(--duration-base) var(--ease-out)',
                }}
            >
                {isProcessing ? 'Submitting…' : nextLabel}
                {!isSubmit && !isProcessing && <IconArrowRight />}
            </button>
        </div>
    );
}
