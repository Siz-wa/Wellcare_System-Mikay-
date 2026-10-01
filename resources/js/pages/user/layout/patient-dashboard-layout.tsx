// resources/js/pages/user/layout/patient-dashboard-layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The patient shell.

import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { PatientAppSidebar } from '@/pages/user/layout/components/PatientAppSidebar';
import { PatientTabBar } from '@/pages/user/layout/components/PatientTabBar';

interface PatientDashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

/**
 * Sidebar at >= 768px, bottom tab bar below it.
 *
 * Both are rendered on every request and swapped by media query. The previous
 * version picked between them in JavaScript with `useIsMobile()`, whose server
 * snapshot is `false` — so SSR always emitted the desktop tree and the phone
 * layout appeared only after hydration, as a visible reflow on the devices most
 * of this portal's traffic uses. The cost of rendering both is a nav's worth of
 * markup; the benefit is that the first paint is already correct.
 *
 * The document is the only scroll container. The old layout gave the content
 * column `height: 100vh; overflow-y: auto`, which on a handset both fights the
 * browser's collapsing URL bar and measures `100vh` against the viewport that
 * bar is covering — the bottom of every page sat under the chrome.
 */
export function PatientDashboardLayout({
    activeId,
    children,
}: PatientDashboardLayoutProps): ReactElement {
    return (
        <div className="flex min-h-[100dvh] bg-wc-gray-50 font-sans">
            <div className="hidden shrink-0 md:block">
                <PatientAppSidebar activeId={activeId} />
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col">
                <div
                    className="sticky top-0"
                    style={{ zIndex: 'var(--z-overlay)' }}
                >
                    <AppTopbar />
                </div>

                {/* `pb-28` clears the 64px tab bar plus the home indicator. A
                    phone cannot spare the 32px side padding the desktop uses. */}
                <main
                    id="main-content"
                    className="flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-8"
                >
                    {children}
                </main>
            </div>

            <PatientTabBar activeId={activeId} />
        </div>
    );
}
