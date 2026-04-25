// resources/js/pages/auth/verify-email.tsx


import { Form, Head } from '@inertiajs/react';
import { logout } from '@/routes';
import { send } from '@/routes/verification';
import { WellcareLogo } from '@/design-system/components/navbar';

interface VerifyEmailProps {
    status?: string;
}

const MailIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);p

const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const LogOutIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

            <div className="relative min-h-screen flex items-center justify-center bg-brand-accent px-6 py-12 font-sans">

                {/* Background blobs — decorative */}
                <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
                    <div className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full bg-brand-secondary/5" />
                    <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-brand-primary/5" />
                </div>

                {/* Card */}
                <div className="wc-card w-full max-w-md px-10 py-12 text-center shadow-2xl rounded-3xl">

                    {/* Logo — imported from Navbar, dark prop so wordmark shows on white bg */}
                    <div className="flex justify-center mb-8">
                        <WellcareLogo />
                    </div>

                    {/* Icon tile */}
                    <div className="flex justify-center mb-6">
                        <div className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary rounded-2xl shadow-brand">
                            <MailIcon />
                        </div>
                    </div>

                    <h1 className="font-display font-extrabold text-2xl tracking-tight mb-3">
                        Check your inbox
                    </h1>

                    <p className="text-sm leading-relaxed mb-8">
                        We sent a verification link to your email address.
                        Click the link in that email to activate your account.
                    </p>

                    {linkSent && (
                        <div className="wc-alert wc-alert-success flex items-center gap-2 mb-6 text-sm rounded-xl">
                            <CheckCircleIcon />
                            <span>A new verification link has been sent to your email.</span>
                        </div>
                    )}

                    <hr className="wc-divider mb-6" />

                    <Form {...send.form()} className="mb-4">
                        {({ processing }: { processing: boolean }) => (
                            <button
                                type="submit"
                                disabled={processing}
                                aria-busy={processing}
                                className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {processing && <div className="wc-spinner w-4 h-4" />}
                                {processing ? 'Sending…' : 'Resend verification email'}
                            </button>
                        )}
                    </Form>

                    <Form {...logout.form()}>
                        {({ processing }: { processing: boolean }) => (
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 text-sm bg-transparent border-0 cursor-pointer px-3 py-2 rounded-md text-gray-500 hover:text-brand-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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