// resources/js/pages/auth/login/loginData.ts
// All static text and data for the login page.
// Update copy here without touching layout or form components.

import type { ReactElement } from 'react';

// ─── Trust item type ──────────────────────────────────────────────────────────
export interface TrustItem {
    icon: ReactElement;
    text: string;
}

// ─── Left panel content ───────────────────────────────────────────────────────
export const loginBrandData = {
    pill: 'Wellcare Portal',
    heading: { line1: 'Your Health,', line2: 'In Your Hands.' },
    desc: 'Access your appointments, laboratory results, and specialist consultations — all in one secure place.',
    copyright: '© 2026 Wellcare Clinics & Laboratories, Inc.',
};

// ─── Trust badges ─────────────────────────────────────────────────────────────
export const trustItems: TrustItem[] = [
    {
        icon: (
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
        text: 'ISO-certified laboratory',
    },
    {
        icon: (
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        text: '50+ board-certified specialists',
    },
    {
        icon: (
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
        text: 'Results within 24 hours',
    },
];

// ─── Right panel content ──────────────────────────────────────────────────────
export const loginFormData = {
    heading: 'Welcome back',
    subheading: 'Log in to your Wellcare account',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    forgotPasswordLabel: 'Forgot password?',
    rememberLabel: 'Remember me for 30 days',
    submitLabel: 'Log In',
    submittingLabel: 'Logging in…',
    registerPrompt: "Don't have an account?",
    registerLabel: 'Sign up',
    backLabel: '← Back to Wellcare Clinics',
};
