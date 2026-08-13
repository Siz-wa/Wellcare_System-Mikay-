import { usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { PageProps } from '@/types';

export function FlashToast(): ReactElement | null {
    const { props } = usePage<PageProps>();

    // Derived, not stored. `message` and `type` are pure functions of the flash
    // prop, and mirroring them into state meant three setState calls in an
    // effect body — a cascading render on every page visit that carried a flash.
    const success = props.flash?.success;
    const error = props.flash?.error;
    const message = success ?? error ?? '';

    // The only genuine state: which message has already had its four seconds.
    // Keyed by the message itself, so a new flash is visible again without
    // anything having to reset a boolean.
    const [expired, setExpired] = useState<string | null>(null);

    useEffect(() => {
        if (!message) {
            return;
        }

        // setState inside the timeout callback, which is the shape the rule
        // wants — the effect subscribes to something external (a timer) rather
        // than writing state as it runs.
        const t = setTimeout(() => setExpired(message), 4000);

        return () => clearTimeout(t);
    }, [message]);

    if (!message || expired === message) {
        return null;
    }

    const isSuccess = Boolean(success);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                padding: '14px 20px',
                borderRadius: '14px',
                background: isSuccess ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
                color: isSuccess ? '#15803d' : '#b91c1c',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: 280,
                maxWidth: 420,
            }}
        >
            {isSuccess ? (
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            ) : (
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            )}
            <span style={{ flex: 1 }}>{message}</span>
            <button
                onClick={() => setExpired(message)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    padding: 0,
                    fontSize: '18px',
                    lineHeight: 1,
                }}
            >
                ×
            </button>
        </div>
    );
}
