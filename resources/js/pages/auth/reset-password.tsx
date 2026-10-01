// resources/js/pages/auth/reset-password.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Rebuilt on the Wellcare auth card, matching forgot-password.tsx.
//
// This page used to render the stock starter-kit AuthLayout: no logo, no clinic
// name, a bare centred form. Every other auth screen — login, register,
// forgot-password, the two-factor challenge, confirm-password, verify-email —
// carries the Wellcare identity, and this is the one a patient arrives at from
// an email link. Landing on a page that looks like a different site is the exact
// shape of a phishing warning, which is a bad thing to teach the people least
// able to tell the difference.

import { Form, Head, Link } from '@inertiajs/react';
import { WellcareLogo } from '@/design-system/components/navbar';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
};

const LockIcon = () => (
    <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
    </svg>
);

export default function ResetPassword({ token, email }: Props) {
    return (
        <>
            <Head title="Reset Password" />

            <div className="relative flex min-h-screen items-center justify-center bg-brand-accent px-6 py-12 font-sans">
                {/* Background blobs — decorative */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
                >
                    <div className="absolute -top-24 -right-24 h-[480px] w-[480px] rounded-full bg-brand-secondary/5" />
                    <div className="absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full bg-brand-primary/5" />
                </div>

                {/* Card */}
                <div className="wc-card w-full max-w-md rounded-3xl px-10 py-12 shadow-2xl">
                    <div className="mb-8 flex justify-center">
                        <WellcareLogo />
                    </div>

                    <div className="mb-6 flex justify-center">
                        <div className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary shadow-brand rounded-2xl">
                            <LockIcon />
                        </div>
                    </div>

                    <h1 className="mb-2 text-center font-display text-2xl font-extrabold tracking-tight">
                        Choose a new password
                    </h1>

                    <p className="mb-8 text-center text-sm leading-relaxed">
                        You are resetting the password for{' '}
                        <strong>{email}</strong>.
                    </p>

                    <hr className="wc-divider mb-6" />

                    <Form
                        {...update.form()}
                        transform={(data) => ({ ...data, token, email })}
                        resetOnSuccess={['password', 'password_confirmation']}
                        className="flex flex-col gap-5"
                    >
                        {({
                            processing,
                            errors,
                        }: {
                            processing: boolean;
                            errors: Record<string, string>;
                        }) => (
                            <>
                                {/* The address is fixed by the signed link, so it
                                    is shown rather than asked for — but it still
                                    posts, because Fortify validates the pair. */}
                                <div className="wc-field">
                                    <label
                                        htmlFor="email"
                                        className="wc-label-text"
                                    >
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        value={email}
                                        readOnly
                                        className="wc-input cursor-not-allowed opacity-70"
                                    />
                                    {errors.email && (
                                        <span
                                            className="mt-1 text-xs"
                                            style={{
                                                color: 'var(--wc-text-error)',
                                            }}
                                        >
                                            {errors.email}
                                        </span>
                                    )}
                                </div>

                                <div className="wc-field">
                                    <label
                                        htmlFor="password"
                                        className="wc-label-text"
                                    >
                                        New password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        name="password"
                                        autoComplete="new-password"
                                        autoFocus
                                        placeholder="Min. 8 chars, 1 uppercase, 1 number"
                                        className={cn(
                                            'wc-input',
                                            errors.password && 'wc-input-error',
                                        )}
                                    />
                                    {errors.password && (
                                        <span
                                            className="mt-1 text-xs"
                                            style={{
                                                color: 'var(--wc-text-error)',
                                            }}
                                        >
                                            {errors.password}
                                        </span>
                                    )}
                                </div>

                                <div className="wc-field">
                                    <label
                                        htmlFor="password_confirmation"
                                        className="wc-label-text"
                                    >
                                        Confirm new password
                                    </label>
                                    <input
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        placeholder="Repeat your new password"
                                        className={cn(
                                            'wc-input',
                                            errors.password_confirmation &&
                                                'wc-input-error',
                                        )}
                                    />
                                    {errors.password_confirmation && (
                                        <span
                                            className="mt-1 text-xs"
                                            style={{
                                                color: 'var(--wc-text-error)',
                                            }}
                                        >
                                            {errors.password_confirmation}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    aria-busy={processing}
                                    data-test="reset-password-button"
                                    className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {processing && (
                                        <div className="wc-spinner h-4 w-4" />
                                    )}
                                    {processing
                                        ? 'Resetting…'
                                        : 'Reset password'}
                                </button>
                            </>
                        )}
                    </Form>

                    <div className="mt-6 flex justify-center">
                        <Link
                            href={login.url()}
                            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                        >
                            <ArrowLeftIcon />
                            Back to log in
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
