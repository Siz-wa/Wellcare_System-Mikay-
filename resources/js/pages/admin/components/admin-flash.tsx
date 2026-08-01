// resources/js/pages/admin/components/admin-flash.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders the `flash.success` / `flash.error` props every admin controller
// returns via back()->with(...).
//
// The error channel matters more here than elsewhere: the account guards
// (self-deactivation, last-active-admin) are refusals, not validation errors,
// so they arrive as flash.error rather than session errors. If this component
// is missing from a page, those refusals happen silently.

import { usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { PageProps } from '@/types';

export function AdminFlash(): ReactElement | null {
    const { props } = usePage<PageProps>();
    const success = props.flash?.success;
    const error = props.flash?.error;
    const message = error ?? success;

    // Track WHICH message was dismissed rather than a boolean "dismissed".
    //
    // The boolean version needed an effect to reset itself whenever a new
    // flash arrived, which is a setState-in-effect cascade (and what the
    // react-hooks lint rightly rejects). Comparing the dismissed message to
    // the current one derives the same behaviour during render: a new message
    // is automatically not-yet-dismissed, with no reset step at all.
    const [dismissedMessage, setDismissedMessage] = useState<string | null>(
        null,
    );

    const dismissed = message !== undefined && message === dismissedMessage;

    // A refusal stays until dismissed — auto-hiding it would let a failed
    // deactivation read as a successful one. Only successes time out.
    useEffect(() => {
        if (!success || success === dismissedMessage) {
            return;
        }

        const timer = setTimeout(() => setDismissedMessage(success), 4000);

        return () => clearTimeout(timer);
    }, [success, dismissedMessage]);

    if (!message || dismissed) {
        return null;
    }

    const isError = Boolean(error);

    return (
        <div
            role="status"
            style={{
                position: 'fixed',
                bottom: 32,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                padding: '14px 20px',
                borderRadius: 14,
                background: isError ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
                color: isError ? '#b91c1c' : '#15803d',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                boxShadow: '0 10px 40px -4px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minWidth: 280,
                maxWidth: 480,
            }}
        >
            {isError ? (
                <AlertTriangle size={18} strokeWidth={2.2} />
            ) : (
                <CheckCircle2 size={18} strokeWidth={2.2} />
            )}
            <span style={{ flex: 1 }}>{message}</span>
            <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setDismissedMessage(message)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    display: 'flex',
                    padding: 0,
                }}
            >
                <X size={16} strokeWidth={2.4} />
            </button>
        </div>
    );
}
