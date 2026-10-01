// resources/js/pages/hr/layout/hr-dashboard-layout.tsx
import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { MobileNavDrawer } from '@/design-system/components/mobile-nav-drawer';
import { HRAppSidebar } from '@/pages/hr/layout/components/HRAppSidebar';

interface HRDashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

/**
 * Sidebar at >= 768px, off-canvas drawer below it.
 *
 * This shell had no mobile handling of any kind: the sidebar rendered at a hard
 * `width: 260, flexShrink: 0` with no media query, so a 390px phone was left
 * about 130px of content column and every page in the workspace was unusable on
 * one. The drawer is the fix, and the sidebar is rendered twice — once docked,
 * once inside the panel — so the two can never describe different navigation.
 *
 * The document is the only scroll container. `height: 100vh; overflow-y: auto`
 * on the content column measured `100vh` against the viewport the mobile URL
 * bar covers, so the last rows of every table sat under the browser chrome.
 */
export function HRDashboardLayout({
    activeId,
    children,
}: HRDashboardLayoutProps): ReactElement {
    return (
        <div className="flex min-h-[100dvh] bg-wc-gray-50 font-sans">
            <div className="hidden shrink-0 md:block">
                <HRAppSidebar activeId={activeId} />
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col">
                <div
                    className="sticky top-0"
                    style={{ zIndex: 'var(--z-overlay)' }}
                >
                    <AppTopbar
                        navSlot={
                            <MobileNavDrawer label="HR navigation">
                                <HRAppSidebar activeId={activeId} />
                            </MobileNavDrawer>
                        }
                    />
                </div>

                <main
                    id="main-content"
                    className="flex-1 px-4 pt-4 pb-8 md:px-8 md:pt-6"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
