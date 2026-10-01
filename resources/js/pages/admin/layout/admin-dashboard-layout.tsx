// resources/js/pages/admin/layout/admin-dashboard-layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Chrome for the System Administrator workspace. Mirrors HRDashboardLayout.

import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { MobileNavDrawer } from '@/design-system/components/mobile-nav-drawer';
import type { NavGroup } from '@/pages/admin/layout/admin-dashboard-data';
import { AdminAppSidebar } from '@/pages/admin/layout/components/AdminAppSidebar';

interface AdminDashboardLayoutProps {
    activeId: string;
    /**
     * Nav override for the two governance workspaces (owner, DPO), which share
     * this chrome and differ only in their links. Omitted everywhere else, so
     * the administrator's own pages are unchanged. See AdminAppSidebar's
     * `groups` prop for why these are parameterised rather than copied.
     */
    groups?: NavGroup[];
    children: ReactNode;
}

/**
 * Sidebar at >= 768px, off-canvas drawer below it.
 *
 * Twelve destinations is why this role gets a drawer rather than the patient
 * portal's five-tab bar — see mobile-nav-drawer.tsx. `groups` is threaded
 * through to both copies of the sidebar so the governance workspaces get their
 * own nav on a phone too, rather than silently falling back to the admin's.
 */
export function AdminDashboardLayout({
    activeId,
    groups,
    children,
}: AdminDashboardLayoutProps): ReactElement {
    return (
        <div className="flex min-h-[100dvh] bg-wc-gray-50 font-sans">
            <div className="hidden shrink-0 md:block">
                <AdminAppSidebar activeId={activeId} groups={groups} />
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col">
                <div
                    className="sticky top-0"
                    style={{ zIndex: 'var(--z-overlay)' }}
                >
                    <AppTopbar
                        navSlot={
                            <MobileNavDrawer label="Administrator navigation">
                                <AdminAppSidebar
                                    activeId={activeId}
                                    groups={groups}
                                />
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
