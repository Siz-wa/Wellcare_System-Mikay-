// resources/js/pages/auth/login/sections/LoginFormPanel.tsx
import { Form } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { WellcareLogo } from '@/design-system/components/navbar';
import { errorBorder } from '@/pages/auth/register/components/register-ui'; // ← same helper as register
import { register, home } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { loginFormData } from './login-data';

// ─── Props ────────────────────────────────────────────────────────────────────
interface LoginFormPanelProps {
    status?: string;
    /**
     * Why the app ended a session — an idle timeout (GV-8) or a deactivation.
     *
     * Its own prop rather than a member of the `errors` bag: this page reads
     * `errors` from the Inertia `<Form>` render-prop below, which only ever
     * carries that form's own submission errors, so a bag flashed by a redirect
     * never rendered. T-13 of the 2026-09-11 walkthrough is that bug.
     */
    notice?: string | null;
    canResetPassword: boolean;
    canRegister: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginFormPanel({
    status,
    notice,
    canResetPassword,
    canRegister,
}: LoginFormPanelProps) {
    const d = loginFormData;

    return (
        <div
            className="flex flex-col justify-center px-6 py-12 md:px-16 lg:px-20"
            style={{ background: 'var(--wc-white)' }}
        >
            {/* Mobile logo — only visible on small screens */}
            <div className="mb-10 lg:hidden">
                <WellcareLogo />
            </div>

            <div className="mx-auto w-full max-w-[400px]">
                {/* Heading */}
                <div className="mb-8">
                    <h1
                        className="mb-2 text-[clamp(1.5rem,3vw,2rem)]"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            color: 'var(--wc-text-primary)',
                        }}
                    >
                        {d.heading}
                    </h1>
                    <p
                        className="text-sm"
                        style={{ color: 'var(--wc-text-muted)' }}
                    >
                        {d.subheading}
                    </p>
                </div>

                {/* Status message */}
                {status && (
                    <div className="wc-alert wc-alert-success mb-6">
                        <svg
                            className="wc-alert-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>{status}</span>
                    </div>
                )}

                {/* Sits above the form, not beside a field: nothing is wrong
                    with what the person typed — they have not typed anything
                    yet. It explains a page they did not ask to be on. */}
                {notice && (
                    <div
                        className="wc-alert wc-alert-warning mb-6"
                        role="status"
                        data-test="login-notice"
                    >
                        <svg
                            className="wc-alert-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4" />
                            <path d="M12 16h.01" />
                        </svg>
                        <span>{notice}</span>
                    </div>
                )}

                {/* Form */}
                <Form
                    {...store.form()}
                    resetOnSuccess={['password']}
                    className="flex flex-col gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            {/* Email */}
                            <div className="wc-field">
                                <label
                                    className="wc-label-text"
                                    htmlFor="email"
                                >
                                    {d.emailLabel}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder={d.emailPlaceholder}
                                    className="wc-input"
                                    style={errorBorder(errors.email)} // ← red border when error
                                />
                                <InputError message={errors.email} />
                            </div>

                            {/* Password */}
                            <div className="wc-field">
                                <div className="mb-2 flex items-center justify-between">
                                    <label
                                        className="wc-label-text"
                                        htmlFor="password"
                                    >
                                        {d.passwordLabel}
                                    </label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-semibold"
                                            tabIndex={5}
                                            style={{
                                                color: 'var(--wc-blue-600)',
                                            }}
                                        >
                                            {d.forgotPasswordLabel}
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder={d.passwordPlaceholder}
                                    className="wc-input"
                                    style={errorBorder(errors.password)} // ← red border when error
                                />
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer text-sm"
                                    style={{
                                        color: 'var(--wc-text-secondary)',
                                    }}
                                >
                                    {d.rememberLabel}
                                </Label>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                tabIndex={4}
                                disabled={processing}
                                className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill mt-2 w-full justify-center"
                                aria-busy={processing}
                            >
                                {processing && <Spinner />}
                                {processing ? d.submittingLabel : d.submitLabel}
                            </button>

                            {/* Register link */}
                            {canRegister && (
                                <p
                                    className="mt-2 text-center text-sm"
                                    style={{ color: 'var(--wc-text-muted)' }}
                                >
                                    {d.registerPrompt}{' '}
                                    <TextLink
                                        href={register()}
                                        tabIndex={6}
                                        className="font-semibold"
                                        style={{ color: 'var(--wc-blue-600)' }}
                                    >
                                        {d.registerLabel}
                                    </TextLink>
                                </p>
                            )}

                            {/* Back to site */}
                            <div className="pt-2 text-center">
                                <Link
                                    href={home.url()}
                                    className="text-xs"
                                    style={{ color: 'var(--wc-text-muted)' }}
                                >
                                    {d.backLabel}
                                </Link>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </div>
    );
}
