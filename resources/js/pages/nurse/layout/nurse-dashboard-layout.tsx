// resources/js/pages/nurse/layout/nurse-dashboard-layout.tsx
import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { NurseAppSidebar } from '@/pages/nurse/layout/components/NurseAppSidebar';
import { nurseDashboardMeta } from '@/pages/nurse/layout/nurse-dashboard-data';

interface NurseDashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

export function NurseDashboardLayout({
    activeId,
    children,
}: NurseDashboardLayoutProps): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                background: 'var(--wc-gray-50)',
                fontFamily: "var(--font-sans,'DM Sans')",
            }}
        >
            <NurseAppSidebar activeId={activeId} />
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
                        searchPlaceholder={nurseDashboardMeta.searchPlaceholder}
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
