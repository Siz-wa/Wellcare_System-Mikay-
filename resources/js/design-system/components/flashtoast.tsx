import { usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { PageProps } from '@/types';

export function FlashToast(): ReactElement | null {
    const { props } = usePage<PageProps>();
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        const success = props.flash?.success;
        const error = props.flash?.error;

        if (success || error) {
            setMessage(success ?? error ?? '');
            setType(success ? 'success' : 'error');
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 4000);

            return () => clearTimeout(t);
        }
    }, [props.flash]);

    if (!visible || !message) {
return null;
}

    const isSuccess = type === 'success';

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
                onClick={() => setVisible(false)}
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
