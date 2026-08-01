// resources/js/pages/admin/layout/admin-dashboard-layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Chrome for the System Administrator workspace. Mirrors HRDashboardLayout.

import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { adminDashboardMeta } from '@/pages/admin/layout/admin-dashboard-data';
import { AdminAppSidebar } from '@/pages/admin/layout/components/AdminAppSidebar';

interface AdminDashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

export function AdminDashboardLayout({
    activeId,
    children,
}: AdminDashboardLayoutProps): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                background: 'var(--wc-gray-50)',
                fontFamily: "var(--font-sans,'DM Sans')",
            }}
        >
            <AdminAppSidebar activeId={activeId} />
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    height: '100vh',
                    overflowY: 'auto',
                    position: 'relative',
                }}
            >
                <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                    <AppTopbar
                        searchPlaceholder={adminDashboardMeta.searchPlaceholder}
                    />
                </div>
                <main
                    style={{
                        flex: 1,
                        padding: 'var(--space-8)',
                        paddingTop: 'var(--space-6)',
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
