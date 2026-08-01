// resources/js/layouts/app/PatientDashboardLayout.tsx
import type { ReactElement, ReactNode } from 'react';
import { AppTopbar } from '@/design-system/components/AppTopbar';
import { PatientAppSidebar } from '@/pages/user/layout/components/PatientAppSidebar';
import { patientDashboardMeta } from '@/pages/user/layout/patient-dashboard-data';

interface PatientDashboardLayoutProps {
    activeId: string;
    children: ReactNode;
}

export function PatientDashboardLayout({
    activeId,
    children,
}: PatientDashboardLayoutProps): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                background: 'var(--wc-gray-50)',
                fontFamily: "var(--font-sans,'DM Sans')",
            }}
        >
            <PatientAppSidebar activeId={activeId} />
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
                        searchPlaceholder={
                            patientDashboardMeta.searchPlaceholder
                        }
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
