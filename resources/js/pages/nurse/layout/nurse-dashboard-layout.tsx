// resources/js/pages/nurse/layout/nurse-dashboard-layout.tsx
import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { MobileNavDrawer } from '@/design-system/components/mobile-nav-drawer';
import { NurseAppSidebar } from '@/pages/nurse/layout/components/NurseAppSidebar';

interface NurseDashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

/**
 * Sidebar at >= 768px, off-canvas drawer below it.
 *
 * The nurse shell matters most of the four on a narrow screen: this is the role
 * most likely to be on a ward tablet rather than at a desk, and it previously
 * rendered a fixed 260px sidebar with no media query at all.
 *
 * See HRDashboardLayout for why the sidebar is rendered twice and why the
 * document, not the content column, owns the scroll.
 */
export function NurseDashboardLayout({
    activeId,
    children,
}: NurseDashboardLayoutProps): ReactElement {
    return (
        <div className="flex min-h-[100dvh] bg-wc-gray-50 font-sans">
            <div className="hidden shrink-0 md:block">
                <NurseAppSidebar activeId={activeId} />
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col">
                <div
                    className="sticky top-0"
                    style={{ zIndex: 'var(--z-overlay)' }}
                >
                    <AppTopbar
                        navSlot={
                            <MobileNavDrawer label="Nurse navigation">
                                <NurseAppSidebar activeId={activeId} />
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
