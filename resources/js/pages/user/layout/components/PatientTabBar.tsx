// resources/js/pages/user/layout/components/PatientTabBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The phone-only bottom tab bar for the patient portal.
//
// It replaces a hamburger drawer. That is the point of the component: a drawer
// hides every destination behind a tap and a read, and the patient portal is
// the one surface in this product used almost entirely on a handset, often by
// someone who opens it twice a year and has forgotten where anything is. A
// fixed tray keeps the five things they came for on screen at all times.
//
// Visibility is `md:hidden` — a CSS media query, deliberately, not the
// `useIsMobile()` hook the old layout used. That hook's server snapshot is
// `false`, so under SSR the desktop tree renders first and the phone layout
// only appears after hydration: a visible jump on exactly the devices this
// component exists for. CSS has the right answer before the first paint.

import { Link } from '@inertiajs/react';
import {
    CalendarCheck2,
    FolderOpen,
    LayoutDashboard,
    MoreHorizontal,
    Users,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    moreGroups,
    primaryTabs,
    tabIdForActiveId,
} from '@/pages/user/layout/patient-dashboard-data';
import type { TabItem } from '@/pages/user/layout/patient-dashboard-data';

const TAB_ICONS: Record<string, ReactElement> = {
    dashboard: <LayoutDashboard size={22} strokeWidth={1.9} />,
    records: <FolderOpen size={22} strokeWidth={1.9} />,
    schedule: <CalendarCheck2 size={24} strokeWidth={2} />,
    'my-patients': <Users size={22} strokeWidth={1.9} />,
    more: <MoreHorizontal size={22} strokeWidth={1.9} />,
};

/**
 * Shared geometry for one tab.
 *
 * `min-h-16` is 64px. WCAG 2.2 SC 2.5.8 only asks for 24×24, but that is a
 * floor for compliance rather than a size anyone can reliably hit — both Apple
 * (44pt) and Material (48dp) sit far above it, and targets under 44px measure
 * roughly three times the miss rate. A nav bar is the worst place to be
 * miss-tapped, so it gets the generous end of that range.
 */
const TAB_BASE =
    'flex min-h-16 flex-col items-center justify-center gap-1 px-1 ' +
    'text-xs font-semibold leading-none no-underline transition-colors ' +
    'focus-visible:outline-2 focus-visible:outline-offset-[-3px] ' +
    'focus-visible:outline-wc-blue-600';

/**
 * Tab colour, inline rather than as a `text-*` utility.
 *
 * base.css styles bare `a` with the link colour and it is UNLAYERED, so it
 * outranks every Tailwind utility — those live in `@layer utilities`. With the
 * colour as a class, all four link tabs painted link-blue whatever their state
 * and the bar stopped telling the patient where they were. The `More` tab is a
 * <button> and was the only one that looked right, which is what gave it away.
 */
function tabColor(active: boolean): string {
    return active ? 'var(--wc-blue-600)' : 'var(--wc-text-muted)';
}

function TabLabel({ children }: { children: string }): ReactElement {
    // `truncate` rather than a smaller size: the type scale is floored at 14px
    // on purpose and a five-column bar at 320px is the one place a label can
    // still overrun. Losing a character beats losing legibility.
    return <span className="w-full truncate text-center">{children}</span>;
}

function PrimaryTab({ tab }: { tab: TabItem }): ReactElement {
    return (
        <Link
            href={tab.href}
            className={TAB_BASE}
            style={{ color: tabColor(false) }}
            aria-label="Book an appointment"
        >
            <span className="-mt-5 flex size-13 items-center justify-center rounded-full bg-wc-blue-600 text-white shadow-[0_6px_16px_-4px_rgba(0,86,179,0.55)] ring-4 ring-white">
                {TAB_ICONS[tab.id]}
            </span>
            <TabLabel>{tab.label}</TabLabel>
        </Link>
    );
}

function StandardTab({
    tab,
    active,
}: {
    tab: TabItem;
    active: boolean;
}): ReactElement {
    return (
        <Link
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={TAB_BASE}
            style={{ color: tabColor(active) }}
        >
            <span
                className={`flex items-center justify-center rounded-full px-4 py-1 transition-colors ${
                    active ? 'bg-wc-blue-50' : 'bg-transparent'
                }`}
            >
                {TAB_ICONS[tab.id]}
            </span>
            <TabLabel>{tab.label}</TabLabel>
        </Link>
    );
}

interface PatientTabBarProps {
    activeId: string;
}

export function PatientTabBar({ activeId }: PatientTabBarProps): ReactElement {
    const [moreOpen, setMoreOpen] = useState(false);
    const activeTabId = tabIdForActiveId(activeId);

    return (
        <>
            <nav
                aria-label="Main"
                className="fixed inset-x-0 bottom-0 border-t border-wc-gray-200 bg-white shadow-[0_-4px_20px_-6px_rgba(15,23,42,0.14)] md:hidden"
                style={{
                    zIndex: 'var(--z-nav)',
                    // The iPhone home indicator overlaps the bottom ~34px. Without
                    // this the last row of the bar is under it and untappable.
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                {/* No <ul>/<li> here. Wrapping each tab in an <li> means either
                    `display: contents` — which drops the list semantics it was
                    added for in several engines — or a second box between the
                    grid and its cells. A <nav> with an accessible name already
                    carries the structure a screen reader announces. */}
                <div className="grid grid-cols-5 items-end">
                    {primaryTabs.map((tab) =>
                        tab.id === 'more' ? (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setMoreOpen(true)}
                                aria-expanded={moreOpen}
                                aria-haspopup="dialog"
                                className={`${TAB_BASE} cursor-pointer border-none bg-transparent`}
                                style={{
                                    color: tabColor(activeTabId === 'more'),
                                }}
                            >
                                <span
                                    className={`flex items-center justify-center rounded-full px-4 py-1 transition-colors ${
                                        activeTabId === 'more'
                                            ? 'bg-wc-blue-50'
                                            : 'bg-transparent'
                                    }`}
                                >
                                    {TAB_ICONS.more}
                                </span>
                                <TabLabel>{tab.label}</TabLabel>
                            </button>
                        ) : tab.primary ? (
                            <PrimaryTab key={tab.id} tab={tab} />
                        ) : (
                            <StandardTab
                                key={tab.id}
                                tab={tab}
                                active={activeTabId === tab.id}
                            />
                        ),
                    )}
                </div>
            </nav>

            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent
                    side="bottom"
                    className="max-h-[80vh] gap-0 overflow-y-auto rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom,0px)]"
                >
                    <SheetHeader className="px-5 pt-5 pb-2">
                        <SheetTitle>More</SheetTitle>
                    </SheetHeader>

                    {/* A real <nav>, not a <div>.
                        base.css styles bare `a` with the link colour and an
                        underline, and it is UNLAYERED — so it outranks every
                        Tailwind utility, which live in `@layer utilities`. The
                        tab bar above escapes that because base.css also carries
                        `nav a { text-decoration: none }`; this list is portalled
                        out of the bar by Radix and was rendering as underlined
                        blue body links. The element is correct semantically and
                        it is what the stylesheet already expects. */}
                    <nav
                        aria-label="More destinations"
                        className="flex flex-col gap-5 px-5 pt-2 pb-6"
                    >
                        {moreGroups.map((group) => (
                            <div key={group.groupLabel}>
                                <p className="m-0 mb-2 text-xs font-bold tracking-widest text-ink-muted uppercase">
                                    {group.groupLabel}
                                </p>
                                <div className="flex flex-col">
                                    {group.items.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            onClick={() => setMoreOpen(false)}
                                            className="flex min-h-12 items-center rounded-xl px-3 text-base font-medium no-underline hover:bg-wc-gray-50"
                                            // Inline, for the same specificity
                                            // reason: `a { color: … }` in the
                                            // unlayered sheet beats text-ink-*.
                                            style={{
                                                color: 'var(--wc-text-secondary)',
                                            }}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="flex min-h-12 w-full cursor-pointer items-center rounded-xl border-none bg-transparent px-3 text-left text-base font-semibold hover:bg-wc-error-light"
                            style={{ color: 'var(--wc-text-error)' }}
                        >
                            Log out
                        </Link>
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    );
}
