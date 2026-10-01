// resources/js/hooks/use-confirm-dialog.tsx
//
// `await confirm({...})` with the house ConfirmDialog instead of the browser's
// window.confirm(), which draws an unstyled OS dialog, blocks the page and is
// silently suppressed in some embedded browsers (returning false, so the action
// never happens and nobody is told why).
//
// Render the returned `dialog` element once in the component's JSX.

import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ConfirmDialog } from '@/design-system';

export interface ConfirmOptions {
    title: string;
    description: ReactNode;
    /** Says what happens: "Restore patient", not "OK". */
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
}

interface Pending extends ConfirmOptions {
    resolve: (confirmed: boolean) => void;
}

export function useConfirmDialog(): {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    dialog: ReactElement | null;
} {
    const [pending, setPending] = useState<Pending | null>(null);

    const confirm = (options: ConfirmOptions): Promise<boolean> =>
        new Promise<boolean>((resolve) => setPending({ ...options, resolve }));

    const settle = (confirmed: boolean): void => {
        pending?.resolve(confirmed);
        setPending(null);
    };

    const dialog = pending ? (
        <ConfirmDialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    settle(false);
                }
            }}
            title={pending.title}
            description={pending.description}
            confirmLabel={pending.confirmLabel}
            cancelLabel={pending.cancelLabel}
            destructive={pending.destructive ?? true}
            onConfirm={() => settle(true)}
        />
    ) : null;

    return { confirm, dialog };
}
