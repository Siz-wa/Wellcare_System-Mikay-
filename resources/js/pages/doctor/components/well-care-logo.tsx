// resources/js/pages/user/dashboard/components/WellcareLogo.tsx

import type { ReactElement } from 'react';

export function WellcareLogo(): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
            }}
        >
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--wc-blue-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
            </div>
            <div>
                <p
                    style={{
                        margin: 0,
                        fontFamily:
                            "var(--font-display, 'Bricolage Grotesque')",
                        fontWeight: 800,
                        fontSize: 'var(--text-base)',
                        color: 'var(--wc-dark)',
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                    }}
                >
                    WELLCARE
                </p>
                <p
                    style={{
                        margin: 0,
                        fontFamily:
                            "var(--font-display, 'Bricolage Grotesque')",
                        fontWeight: 800,
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-blue-600)',
                        lineHeight: 1,
                        letterSpacing: '0.08em',
                    }}
                >
                    CLINICS
                </p>
            </div>
        </div>
    );
}
