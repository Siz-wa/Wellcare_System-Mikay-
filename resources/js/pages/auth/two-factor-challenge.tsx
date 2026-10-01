import { Form, Head } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { WellcareLogo } from '@/design-system/components/navbar';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import LoginBrandPanel from '@/pages/auth/login/sections/login-brand-panel';
import { store } from '@/routes/two-factor/login';

/**
 * The second sign-in step, in the clinic's own visual language.
 *
 * Every staff account passes through this screen on every sign-in, so it is one
 * of the most-seen pages in the application — and it was rendering through the
 * starter kit's AuthLayout, with none of the branding of the sign-in page
 * immediately before it. Switching to the same split layout removes the seam.
 *
 * The recovery-code path keeps its own copy rather than sharing the
 * authenticator wording. Somebody reaching for a recovery code has usually lost
 * their phone, and telling them to "open your authenticator app" at that moment
 * is the one instruction they cannot follow.
 */
export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const content = useMemo(() => {
        if (showRecoveryInput) {
            return {
                pill: 'Recovery',
                brandHeading: { line1: 'Lost your', line2: 'phone?' },
                brandDesc:
                    'Recovery codes are the way back in. Each one works once, so cross it off after you use it.',
                title: 'Enter a recovery code',
                description:
                    'Use one of the emergency codes you saved when you turned on two-factor authentication.',
                toggleText: 'use an authenticator code instead',
                icon: <KeyRound size={22} />,
            };
        }

        return {
            pill: 'Security check',
            brandHeading: { line1: 'Two steps', line2: 'to your records.' },
            brandDesc:
                'A code from your authenticator app confirms it is you — so a stolen password alone cannot reach patient records.',
            title: 'Enter your code',
            description:
                'Open your authenticator app and type the six digits it is showing now.',
            toggleText: 'use a recovery code instead',
            icon: <ShieldCheck size={22} />,
        };
    }, [showRecoveryInput]);

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Two-factor authentication" />

            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
                <LoginBrandPanel
                    pill={content.pill}
                    heading={content.brandHeading}
                    desc={content.brandDesc}
                />

                <div
                    className="flex flex-col justify-center px-6 py-12 md:px-16 lg:px-20"
                    style={{ background: 'var(--wc-white)' }}
                >
                    <div className="mb-10 lg:hidden">
                        <WellcareLogo />
                    </div>

                    <div className="mx-auto w-full max-w-[400px]">
                        <span
                            className="wc-icon-tile wc-icon-tile-primary mb-5"
                            style={{ width: 48, height: 48 }}
                        >
                            {content.icon}
                        </span>

                        <h1
                            className="mb-2 text-[clamp(1.5rem,3vw,2rem)]"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {content.title}
                        </h1>
                        <p
                            className="mb-8 text-sm leading-relaxed"
                            style={{ color: 'var(--wc-text-muted)' }}
                        >
                            {content.description}
                        </p>

                        <Form
                            {...store.form()}
                            resetOnError
                            resetOnSuccess={!showRecoveryInput}
                            className="flex flex-col gap-5"
                        >
                            {({ errors, processing, clearErrors }) => (
                                <>
                                    {showRecoveryInput ? (
                                        <div className="wc-field">
                                            <label
                                                className="wc-label-text"
                                                htmlFor="recovery_code"
                                            >
                                                Recovery code
                                            </label>
                                            <input
                                                id="recovery_code"
                                                name="recovery_code"
                                                type="text"
                                                placeholder="xxxxxxxx-xxxxxxxx"
                                                autoFocus
                                                required
                                                className="wc-input"
                                                style={{
                                                    fontFamily:
                                                        'var(--font-mono)',
                                                }}
                                            />
                                            <InputError
                                                message={errors.recovery_code}
                                            />
                                            <p className="wc-field-hint">
                                                Each recovery code can be used
                                                once.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <InputOTP
                                                name="code"
                                                maxLength={OTP_MAX_LENGTH}
                                                value={code}
                                                onChange={setCode}
                                                disabled={processing}
                                                pattern={REGEXP_ONLY_DIGITS}
                                                autoFocus
                                            >
                                                <InputOTPGroup>
                                                    {Array.from(
                                                        {
                                                            length: OTP_MAX_LENGTH,
                                                        },
                                                        (_, index) => (
                                                            <InputOTPSlot
                                                                key={index}
                                                                index={index}
                                                            />
                                                        ),
                                                    )}
                                                </InputOTPGroup>
                                            </InputOTP>
                                            <InputError message={errors.code} />
                                            <p className="wc-field-hint text-center">
                                                The code changes every 30
                                                seconds.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill w-full justify-center"
                                    >
                                        {processing ? 'Verifying…' : 'Continue'}
                                    </button>

                                    <p
                                        className="text-center text-sm"
                                        style={{
                                            color: 'var(--wc-text-muted)',
                                        }}
                                    >
                                        Can't do that?{' '}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleRecoveryMode(clearErrors)
                                            }
                                            className="wc-link"
                                            style={{ fontWeight: 700 }}
                                        >
                                            {content.toggleText}
                                        </button>
                                    </p>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </>
    );
}
