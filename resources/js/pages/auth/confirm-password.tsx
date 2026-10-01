import { Form, Head } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Spinner } from '@/components/ui/spinner';
import { WellcareLogo } from '@/design-system/components/navbar';
import LoginBrandPanel from '@/pages/auth/login/sections/login-brand-panel';
import { store } from '@/routes/password/confirm';

interface ConfirmPasswordProps {
    /**
     * Why the prompt appeared, when the person did not go looking for it.
     *
     * Null for somebody who deliberately opened Settings -> Security, where the
     * stock copy is already accurate. Set for staff who were bounced here by
     * the two-factor enrolment gate after clicking something else entirely.
     */
    reason?: string | null;
}

/**
 * Password confirmation, on the clinic's own furniture.
 *
 * This screen used to render through the starter kit's AuthLayout: a bare white
 * page, no logo, and a submit button styled like an empty text field. It is the
 * first thing a staff account sees after signing in — the two-factor gate sends
 * them straight here — so it was also the first thing that looked like a
 * different product.
 */
export default function ConfirmPassword({
    reason = null,
}: ConfirmPasswordProps) {
    return (
        <>
            <Head title="Confirm password" />

            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
                <LoginBrandPanel
                    pill="Secure area"
                    heading={{ line1: 'One more', line2: 'check.' }}
                    desc="Patient records sit behind this step. Confirming your password proves it is still you at the keyboard."
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
                            <Lock size={22} />
                        </span>

                        <h1
                            className="mb-2 text-[clamp(1.5rem,3vw,2rem)]"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            Confirm your password
                        </h1>
                        <p
                            className="mb-8 text-sm leading-relaxed"
                            style={{ color: 'var(--wc-text-muted)' }}
                        >
                            {reason ??
                                'This is a secure area of the application. Please confirm your password before continuing.'}
                        </p>

                        <Form {...store.form()} resetOnSuccess={['password']}>
                            {({ processing, errors }) => (
                                <div className="flex flex-col gap-5">
                                    <div className="wc-field">
                                        <label
                                            className="wc-label-text"
                                            htmlFor="password"
                                        >
                                            Password
                                        </label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            autoFocus
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        data-test="confirm-password-button"
                                        className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill mt-1 w-full justify-center"
                                    >
                                        {processing && <Spinner />}
                                        {processing
                                            ? 'Confirming…'
                                            : 'Confirm password'}
                                    </button>
                                </div>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </>
    );
}
