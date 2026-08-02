// resources/js/pages/auth/verify-email.tsx

import { Form, Head } from '@inertiajs/react';
import { WellcareLogo } from '@/design-system/components/navbar';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

interface VerifyEmailProps {
    status?: string;
}

const MailIcon = () => (
    <svg
        width="32"
        height="32"
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

const LogOutIcon = () => (
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
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

export default function VerifyEmail({ status }: VerifyEmailProps) {
    const linkSent = status === 'verification-link-sent';

    return (
        <>
            <Head title="Verify Email — Wellcare" />

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
                <div className="wc-card w-full max-w-md rounded-3xl px-10 py-12 text-center shadow-2xl">
                    {/* Logo — imported from Navbar, dark prop so wordmark shows on white bg */}
                    <div className="mb-8 flex justify-center">
                        <WellcareLogo />
                    </div>

                    {/* Icon tile */}
                    <div className="mb-6 flex justify-center">
                        <div className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary shadow-brand rounded-2xl">
                            <MailIcon />
                        </div>
                    </div>

                    <h1 className="mb-3 font-display text-2xl font-extrabold tracking-tight">
                        Check your inbox
                    </h1>

                    <p className="mb-8 text-sm leading-relaxed">
                        We sent a verification link to your email address. Click
                        the link in that email to activate your account.
                    </p>

                    {linkSent && (
                        <div className="wc-alert wc-alert-success mb-6 flex items-center gap-2 rounded-xl text-sm">
                            <CheckCircleIcon />
                            <span>
                                A new verification link has been sent to your
                                email.
                            </span>
                        </div>
                    )}

                    <hr className="wc-divider mb-6" />

                    <Form {...send.form()} className="mb-4">
                        {({ processing }: { processing: boolean }) => (
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
                                    : 'Resend verification email'}
                            </button>
                        )}
                    </Form>

                    <Form {...logout.form()}>
                        {({ processing }: { processing: boolean }) => (
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-sm text-gray-500 transition-colors hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <LogOutIcon />
                                Log out
                            </button>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}
