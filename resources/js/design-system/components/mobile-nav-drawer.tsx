// resources/js/design-system/components/mobile-nav-drawer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The staff shells' phone navigation: a hamburger in the topbar that slides the
// role's own sidebar in from the left.
//
// A drawer here rather than the bottom tab bar the patient portal uses, and the
// difference is not an oversight. A tab bar is capped at five destinations and
// earns its space in an app opened on a phone by default — which describes the
// patient and nobody else in this product. Staff work at a workstation or a
// ward tablet, and their sidebars hold six (doctor), five (HR, nurse) and
// twelve (admin) destinations; the admin list alone cannot be expressed as five
// tabs without inventing an information architecture for someone else's job.
// A drawer scales to all four and keeps each role's existing grouping intact.
//
// The component owns both halves — the trigger and the panel — so a layout
// composes it in one place. Radix portals the panel to <body>, so rendering the
// trigger inside the topbar does not trap the panel in the topbar's box.

import { router } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

interface MobileNavDrawerProps {
    /** The role's sidebar. Rendered as-is, so each role keeps its own nav. */
    children: ReactNode;
    /** Names the drawer for screen readers, e.g. "Doctor navigation". */
    label: string;
}

export function MobileNavDrawer({
    children,
    label,
}: MobileNavDrawerProps): ReactElement {
    const [open, setOpen] = useState(false);

    // Close once a navigation completes, or tapping a nav item leaves the panel
    // hanging over the page it just opened. Subscribing to the router beats
    // reacting to `url` in an effect body: it is the same thing semantically and
    // does not trip react-hooks/set-state-in-effect.
    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                className="-ml-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-wc-gray-200 bg-white text-ink-secondary md:hidden"
                aria-label={`Open ${label}`}
            >
                <Menu size={20} strokeWidth={2} />
            </SheetTrigger>

            <SheetContent
                side="left"
                // The sidebars are a fixed 260px wide. `max-w-[85vw]` keeps the
                // panel on screen at 320px, where 260 plus the close button
                // would otherwise run past the edge.
                className="w-[272px] max-w-[85vw] gap-0 overflow-y-auto p-0"
            >
                {/* Radix requires an accessible title on every dialog; the
                    sidebar carries its own visible branding, so this one is for
                    screen readers only. */}
                <SheetTitle className="sr-only">{label}</SheetTitle>
                {children}
            </SheetContent>
        </Sheet>
    );
}
