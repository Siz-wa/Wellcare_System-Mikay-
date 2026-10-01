// resources/js/pages/doctor/layout/dashboard-layout.tsx

import type { ReactElement, ReactNode } from 'react';
import { MobileNavDrawer } from '@/design-system/components/mobile-nav-drawer';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

interface DashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

/**
 * Sidebar at >= 768px, off-canvas drawer below it.
 *
 * See HRDashboardLayout for the shared reasoning. The doctor shell additionally
 * kept its own translucent wrapper around the topbar, which is preserved — the
 * other three roles let AppTopbar carry its own backdrop.
 */
export function DashboardLayout({
    activeId,
    children,
}: DashboardLayoutProps): ReactElement {
    return (
        <div className="flex min-h-[100dvh] bg-wc-gray-50 font-sans">
            <div className="hidden shrink-0 md:block">
                <AppSidebar activeId={activeId} />
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col">
                <div
                    className="sticky top-0 border-b border-b-black/5"
                    style={{
                        zIndex: 'var(--z-overlay)',
                        // A semi-transparent --wc-gray-50.
                        background: 'rgba(249, 250, 251, 0.8)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                    }}
                >
                    <AppTopbar
                        navSlot={
                            <MobileNavDrawer label="Doctor navigation">
                                <AppSidebar activeId={activeId} />
                            </MobileNavDrawer>
                        }
                    />
                </div>

                <main
                    id="main-content"
                    className="flex-1 px-4 pt-4 pb-8 md:px-8"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
