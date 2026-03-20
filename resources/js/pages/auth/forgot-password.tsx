// resources/js/pages/auth/forgot-password.tsx

import { Head, Form } from '@inertiajs/react';
import { WellcareLogo } from '@/design-system/components/navbar';
import { login } from '@/routes';
import { email } from '@/routes/password';
import { Link } from '@inertiajs/react';

interface ForgotPasswordProps {
    status?: string;
}

const MailIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
    </svg>
);

export default function ForgotPassword({ status }: ForgotPasswordProps) {
    return (
        <>
            <Head title="Forgot Password — Wellcare" />

            <div className="relative min-h-screen flex items-center justify-center bg-brand-accent px-6 py-12 font-sans">

                {/* Background blobs — decorative */}
                <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
                    <div className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full bg-brand-secondary/5" />
                    <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-brand-primary/5" />
                </div>

                {/* Card */}
                <div className="wc-card w-full max-w-md px-10 py-12 shadow-2xl rounded-3xl">

                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <WellcareLogo />
                    </div>

                    {/* Icon tile */}
                    <div className="flex justify-center mb-6">
                        <div className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary rounded-2xl shadow-brand">
                            <MailIcon />
                        </div>
                    </div>

                    {/* Heading */}
                    <h1 className="font-display font-extrabold text-2xl tracking-tight text-center mb-2">
                        Forgot your password?
                    </h1>

                    <p className="text-sm leading-relaxed text-center mb-8">
                        No worries — enter your email address and we'll send you a reset link.
                    </p>

                    {/* Status alert */}
                    {status && (
                        <div className="wc-alert wc-alert-success flex items-center gap-2 mb-6 text-sm rounded-xl">
                            <CheckCircleIcon />
                            <span>{status}</span>
                        </div>
                    )}

                    <hr className="wc-divider mb-6" />

                    {/* Form */}
                    <Form {...email.form()} className="flex flex-col gap-5">
                        {({ processing, errors }: { processing: boolean; errors: Record<string, string> }) => (
                            <>
                                <div className="wc-field">
                                    <label htmlFor="email" className="wc-label-text">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        autoComplete="off"
                                        autoFocus
                                        placeholder="email@example.com"
                                        className={`wc-input${errors.email ? ' wc-input-error' : ''}`}
                                    />
                                    {errors.email && (
                                        <span className="text-xs mt-1" style={{ color: 'var(--wc-error)' }}>
                                            {errors.email}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    aria-busy={processing}
                                    className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {processing && <div className="wc-spinner w-4 h-4" />}
                                    {processing ? 'Sending…' : 'Email password reset link'}
                                </button>
                            </>
                        )}
                    </Form>

                    {/* Back to login */}
                    <div className="flex justify-center mt-6">
                        <Link
                            href={login.url()}
                            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md"
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