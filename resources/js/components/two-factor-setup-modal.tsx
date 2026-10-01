import { Form } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, Copy, ShieldCheck, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { useClipboard } from '@/hooks/use-clipboard';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { confirm } from '@/routes/two-factor';

/**
 * Two-factor enrolment, in the clinic's own visual language.
 *
 * The dialog shell stays shadcn — it carries the focus trap, the Escape
 * handler and the ARIA wiring, none of which is worth re-implementing. What
 * changed is everything inside it: the starter-kit greys, the unlabelled
 * buttons and the silent second step have been replaced with `wc-` components
 * so this reads as part of WellCare rather than as scaffolding left in place.
 *
 * The substantive UX change is the step indicator. Enrolment is two steps —
 * scan, then verify — and the old modal disclosed that only by changing under
 * you when you pressed Continue. Staff enrolling on a shared clinic machine
 * were being asked to commit to a flow whose length they could not see.
 */

/** Where the person is in enrolment. Drives the indicator and the copy. */
type SetupStep = 'scan' | 'verify';

function StepIndicator({ step }: { step: SetupStep }): React.ReactElement {
    const steps: Array<{ key: SetupStep; label: string }> = [
        { key: 'scan', label: 'Scan' },
        { key: 'verify', label: 'Verify' },
    ];
    const activeIndex = steps.findIndex((s) => s.key === step);

    return (
        <div className="wc-steps justify-center">
            {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                    <span
                        className="wc-steps-label"
                        style={{
                            color:
                                i <= activeIndex
                                    ? 'var(--wc-blue-600)'
                                    : 'var(--wc-gray-400)',
                        }}
                    >
                        {i + 1}. {s.label}
                    </span>
                    {i < steps.length - 1 && (
                        <span className="wc-steps-track">
                            <span
                                className="wc-steps-dot"
                                style={{
                                    background:
                                        activeIndex > i
                                            ? 'var(--wc-blue-600)'
                                            : 'var(--wc-gray-200)',
                                }}
                            />
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

function TwoFactorSetupStep({
    qrCodeSvg,
    manualSetupKey,
    buttonText,
    onNextStep,
    errors,
    alreadyEnabled = false,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    buttonText: string;
    onNextStep: () => void;
    errors: string[];
    /** Shown after enrolment, to add the account to another device. */
    alreadyEnabled?: boolean;
}) {
    const [copiedText, copy] = useClipboard();
    const copied = copiedText === manualSetupKey && manualSetupKey !== null;

    if (errors?.length) {
        return <AlertError errors={errors} />;
    }

    return (
        <div className="flex w-full flex-col gap-5">
            <div
                className="flex items-start gap-3 rounded-[var(--radius-2xl)] p-4"
                style={{ background: 'var(--wc-blue-50)' }}
            >
                <Smartphone
                    size={18}
                    style={{ color: 'var(--wc-blue-600)', flexShrink: 0 }}
                />
                <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--wc-blue-800)' }}
                >
                    {alreadyEnabled
                        ? 'Two-factor authentication is active. Scan this code only to add the account to another phone or authenticator app.'
                        : 'Open your authenticator app and scan this code. Keep the app open — you will need a code from it on the next step.'}
                </p>
            </div>

            {/* Two tracks side by side: scan it, or type it. They are
                alternatives rather than steps, so they sit next to each other
                instead of stacking one under the other — which also stops the
                dialog growing taller than the viewport. */}
            <div className="grid gap-5 sm:grid-cols-[14rem_1fr] sm:items-start">
                {/* QR — framed rather than floating, so it reads as a scannable
                    object and not as a loading image. */}
                <div
                    className="mx-auto flex aspect-square w-60 items-center justify-center rounded-[var(--radius-2xl)] p-4 sm:mx-0 sm:w-full"
                    style={{
                        background: 'var(--wc-white)',
                        border: '1.5px solid var(--wc-gray-200)',
                        boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    {qrCodeSvg ? (
                        <div
                            className="aspect-square w-full [&_svg]:size-full"
                            dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                        />
                    ) : (
                        <span className="wc-spinner wc-spinner-lg" />
                    )}
                </div>

                {/* Manual key. Shown in a real field rather than as grey text,
                    because on a desktop with no camera this is the only way in. */}
                <div className="wc-field">
                    <span className="wc-label-text">Can’t scan it?</span>
                    <p
                        className="mb-2 text-sm leading-relaxed"
                        style={{ color: 'var(--wc-text-muted)' }}
                    >
                        Enter this key in your authenticator app by hand.
                    </p>

                    {!manualSetupKey ? (
                        <div
                            className="flex items-center justify-center rounded-[var(--radius-xl)] p-3"
                            style={{ background: 'var(--wc-gray-50)' }}
                        >
                            <span className="wc-spinner wc-spinner-sm" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-stretch gap-2">
                            <input
                                type="text"
                                readOnly
                                value={manualSetupKey}
                                aria-label="Setup key"
                                className="wc-input min-w-0 flex-1"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    letterSpacing: '0.08em',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => copy(manualSetupKey)}
                                className="wc-btn wc-btn-outline wc-btn-md"
                                aria-label={
                                    copied ? 'Key copied' : 'Copy setup key'
                                }
                            >
                                {copied ? (
                                    <Check size={16} />
                                ) : (
                                    <Copy size={16} />
                                )}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    )}
                    <p className="wc-field-hint mt-2">
                        Treat this key like a password. Anyone who has it can
                        generate your sign-in codes.
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onNextStep}
                disabled={!manualSetupKey}
                className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill w-full justify-center"
            >
                {buttonText}
            </button>
        </div>
    );
}

function TwoFactorVerificationStep({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack: () => void;
}) {
    const [code, setCode] = useState<string>('');
    const pinInputContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeout(() => {
            pinInputContainerRef.current?.querySelector('input')?.focus();
        }, 0);
    }, []);

    return (
        <Form
            {...confirm.form()}
            onSuccess={() => onClose()}
            resetOnError
            resetOnSuccess
        >
            {({
                processing,
                errors,
            }: {
                processing: boolean;
                errors?: { confirmTwoFactorAuthentication?: { code?: string } };
            }) => (
                <div
                    ref={pinInputContainerRef}
                    className="wc-settings-stack-sm w-full"
                >
                    <div className="flex w-full flex-col items-center gap-3 py-1">
                        <InputOTP
                            id="otp"
                            name="code"
                            maxLength={OTP_MAX_LENGTH}
                            onChange={setCode}
                            disabled={processing}
                            pattern={REGEXP_ONLY_DIGITS}
                        >
                            <InputOTPGroup>
                                {Array.from(
                                    { length: OTP_MAX_LENGTH },
                                    (_, index) => (
                                        <InputOTPSlot
                                            key={index}
                                            index={index}
                                        />
                                    ),
                                )}
                            </InputOTPGroup>
                        </InputOTP>
                        <InputError
                            message={
                                errors?.confirmTwoFactorAuthentication?.code
                            }
                        />
                        <p className="wc-field-hint text-center">
                            The code changes every 30 seconds. If it is
                            rejected, wait for the next one and try again.
                        </p>
                    </div>

                    <div className="flex w-full gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={processing}
                            className="wc-btn wc-btn-outline wc-btn-lg wc-btn-pill flex-1 justify-center"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={
                                processing || code.length < OTP_MAX_LENGTH
                            }
                            className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill flex-1 justify-center"
                        >
                            {processing ? 'Verifying…' : 'Turn on'}
                        </button>
                    </div>
                </div>
            )}
        </Form>
    );
}

type Props = {
    isOpen: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    clearSetupData: () => void;
    fetchSetupData: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    qrCodeSvg,
    manualSetupKey,
    clearSetupData,
    fetchSetupData,
    errors,
}: Props) {
    const [showVerificationStep, setShowVerificationStep] =
        useState<boolean>(false);

    const modalConfig = useMemo<{
        title: string;
        description: string;
        buttonText: string;
    }>(() => {
        if (twoFactorEnabled) {
            return {
                title: 'Two-factor authentication is on',
                description:
                    'Scan the code or enter the key in your authenticator app to add this account.',
                buttonText: 'Done',
            };
        }

        if (showVerificationStep) {
            return {
                title: 'Enter your code',
                description:
                    'Type the six digits currently shown in your authenticator app.',
                buttonText: 'Continue',
            };
        }

        return {
            title: 'Set up two-factor authentication',
            description:
                'A second step at sign-in, so a stolen password is not enough to reach patient records.',
            buttonText: 'Continue',
        };
    }, [twoFactorEnabled, showVerificationStep]);

    const handleModalNextStep = useCallback(() => {
        if (requiresConfirmation) {
            setShowVerificationStep(true);

            return;
        }

        clearSetupData();
        onClose();
    }, [requiresConfirmation, clearSetupData, onClose]);

    const resetModalState = useCallback(() => {
        setShowVerificationStep(false);

        if (twoFactorEnabled) {
            clearSetupData();
        }
    }, [twoFactorEnabled, clearSetupData]);

    useEffect(() => {
        if (isOpen && !qrCodeSvg) {
            fetchSetupData();
        }
    }, [isOpen, qrCodeSvg, fetchSetupData]);

    const handleClose = useCallback(() => {
        resetModalState();
        onClose();
    }, [onClose, resetModalState]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            {/*
                Width follows the step. Scanning needs room for the QR and the
                manual key side by side; entering six digits does not, and a
                wide dialog around a short form reads as an empty one.

                The height cap is not cosmetic: DialogContent is centred with a
                -50% translate and sets no max-height, so content taller than
                the viewport hangs off both ends and the primary button becomes
                unreachable — which is exactly what happened at the narrower
                width.

                Explicit rem values rather than max-w-md / max-w-3xl. This
                project redefines Tailwind's container scale in tokens.css to
                breakpoint widths (--container-md is 768px, not the stock
                448px), so the named max-w-* utilities do not mean here what
                they mean elsewhere — `max-w-md` silently rendered the compact
                verify step at full width.
            */}
            <DialogContent
                className={`max-h-[92vh] overflow-y-auto p-7 ${
                    showVerificationStep || twoFactorEnabled
                        ? 'sm:max-w-[27rem]'
                        : 'sm:max-w-[48rem]'
                }`}
            >
                <DialogHeader className="flex flex-col items-center gap-2">
                    <span
                        className="wc-icon-tile wc-icon-tile-primary wc-icon-tile-lg"
                        style={{ width: 52, height: 52 }}
                    >
                        <ShieldCheck size={24} />
                    </span>
                    <DialogTitle
                        className="text-center"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {modalConfig.title}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {modalConfig.description}
                    </DialogDescription>

                    {!twoFactorEnabled && requiresConfirmation && (
                        <StepIndicator
                            step={showVerificationStep ? 'verify' : 'scan'}
                        />
                    )}
                </DialogHeader>

                <div className="flex flex-col items-center gap-4">
                    {showVerificationStep ? (
                        <TwoFactorVerificationStep
                            onClose={handleClose}
                            onBack={() => setShowVerificationStep(false)}
                        />
                    ) : (
                        <TwoFactorSetupStep
                            qrCodeSvg={qrCodeSvg}
                            manualSetupKey={manualSetupKey}
                            buttonText={modalConfig.buttonText}
                            onNextStep={handleModalNextStep}
                            errors={errors}
                            alreadyEnabled={twoFactorEnabled}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
