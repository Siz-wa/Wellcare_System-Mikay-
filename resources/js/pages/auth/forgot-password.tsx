// resources/js/pages/auth/forgot-password.tsx

import { Head, Form } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { WellcareLogo } from '@/design-system/components/navbar';
import { login } from '@/routes';
import { email } from '@/routes/password';

interface ForgotPasswordProps {
    status?: string;
}

const MailIcon = () => (
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
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
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

export default function ForgotPassword({ status }: ForgotPasswordProps) {
    return (
        <>
            <Head title="Forgot Password — Wellcare" />

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
                    {/* Logo */}
                    <div className="mb-8 flex justify-center">
                        <WellcareLogo />
                    </div>

                    {/* Icon tile */}
                    <div className="mb-6 flex justify-center">
                        <div className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary shadow-brand rounded-2xl">
                            <MailIcon />
                        </div>
                    </div>

                    {/* Heading */}
                    <h1 className="mb-2 text-center font-display text-2xl font-extrabold tracking-tight">
                        Forgot your password?
                    </h1>

                    <p className="mb-8 text-center text-sm leading-relaxed">
                        No worries — enter your email address and we'll send you
                        a reset link.
                    </p>

                    {/* Status alert */}
                    {status && (
                        <div className="wc-alert wc-alert-success mb-6 flex items-center gap-2 rounded-xl text-sm">
                            <CheckCircleIcon />
                            <span>{status}</span>
                        </div>
                    )}

                    <hr className="wc-divider mb-6" />

                    {/* Form */}
                    <Form {...email.form()} className="flex flex-col gap-5">
                        {({
                            processing,
                            errors,
                        }: {
                            processing: boolean;
                            errors: Record<string, string>;
                        }) => (
                            <>
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
                                        autoComplete="off"
                                        autoFocus
                                        placeholder="email@example.com"
                                        className={`wc-input${errors.email ? 'wc-input-error' : ''}`}
                                    />
                                    {errors.email && (
                                        <span
                                            className="mt-1 text-xs"
                                            style={{ color: 'var(--wc-error)' }}
                                        >
                                            {errors.email}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    aria-busy={processing}
                                    className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {processing && (
                                        <div className="wc-spinner h-4 w-4" />
                                    )}
                                    {processing
                                        ? 'Sending…'
                                        : 'Email password reset link'}
                                </button>
                            </>
                        )}
                    </Form>

                    {/* Back to login */}
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
