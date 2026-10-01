// resources/js/pages/admin/components/admin-modal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A plain centred dialog for the admin forms.
//
// Deliberately not the shadcn Dialog primitive: every other surface in this
// module is styled with the design-system tokens and inline styles (see
// HRDashboardLayout, the LOA pages), and mixing a Radix-portalled dialog into
// that would be the only one of its kind in the app.

import { X } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

interface AdminModalProps {
    title: string;
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}

export function AdminModal({
    title,
    open,
    onClose,
    children,
}: AdminModalProps): ReactElement | null {
    // Escape closes. Registered only while open so a closed modal does not
    // swallow Escape from whatever else is on the page.
    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                // The scale from tokens.css, never a literal. This was 9998 —
                // a number picked to clear the nav, which also cleared the
                // popover layer, so a <Select> inside an admin form portalled
                // its panel to <body> at --z-popover and painted *behind* this
                // backdrop. The options were there and invisible.
                zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
                background: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: 'var(--space-6)',
                overflowY: 'auto',
            }}
        >
            <div
                // Without this the backdrop's onClick fires for every click
                // inside the form and the dialog closes mid-edit.
                onClick={(event) => event.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: 18,
                    width: '100%',
                    maxWidth: 640,
                    marginTop: '5vh',
                    marginBottom: '5vh',
                    boxShadow: '0 24px 60px -12px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-5) var(--space-6)',
                        borderBottom: '1px solid #f1f5f9',
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-lg)',
                            fontWeight: 700,
                            color: 'var(--wc-text-primary)',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        {title}
                    </h2>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            padding: 4,
                        }}
                    >
                        <X size={18} strokeWidth={2.2} />
                    </button>
                </div>

                <div style={{ padding: 'var(--space-6)' }}>{children}</div>
            </div>
        </div>
    );
}
