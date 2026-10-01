// resources/js/design-system/components/confirm-dialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The house "are you sure?" — one component for every destructive action.
//
// Cancelling an appointment, archiving a patient and leaving a consultation
// room each used to call the browser's own `confirm()`. That draws the operating
// system's dialog: unstyled, untranslatable, unreachable by the design tokens,
// and — because it blocks the page thread — capable of freezing the tab until it
// is dismissed. It also sat oddly beside the Radix dialogs the app already uses
// for the Add-a-patient sheet and the consultation session editor.
//
// Built on the same Radix primitive as those, so focus trapping, Escape, the
// scroll lock and the overlay all behave the way the rest of the app does.

import type { ReactElement, ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogProps {
    /** Open state. The caller owns it, so one dialog can serve a whole list. */
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** What actually happens, in the user's terms. */
    description: ReactNode;
    /**
     * The button that performs the action. Says what it does — "Cancel
     * appointment", not "OK" — so it reads correctly next to "Keep it".
     */
    confirmLabel: string;
    /** Defaults to "Never mind", which cannot be mistaken for the action. */
    cancelLabel?: string;
    /** Red confirm button. On by default: this dialog exists for destructive work. */
    destructive?: boolean;
    /** Disables both buttons while the request is in flight. */
    processing?: boolean;
    onConfirm: () => void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Never mind',
    destructive = true,
    processing = false,
    onConfirm,
}: ConfirmDialogProps): ReactElement {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <button
                        type="button"
                        className="wc-btn wc-btn-ghost wc-btn-md"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`wc-btn wc-btn-md ${
                            destructive ? 'wc-btn-danger' : 'wc-btn-primary'
                        }`}
                        onClick={onConfirm}
                        disabled={processing}
                        aria-busy={processing}
                    >
                        {processing ? 'Working…' : confirmLabel}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
