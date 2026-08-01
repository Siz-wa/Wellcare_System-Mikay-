import { Breadcrumbs } from '@/components/breadcrumbs';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { AppLayoutProps } from '@/types';

/**
 * Layout for the patient settings pages (profile, security, appearance).
 *
 * These used to route through the Inertia starter kit's app-sidebar-layout,
 * which rendered <AppSidebar /> from a component that had been deleted — so
 * every settings page threw a ReferenceError and rendered blank. They are
 * patient-facing pages, so they now use the same shell as the rest of the
 * patient area.
 */
export default function AppLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <PatientDashboardLayout activeId="settings">
            {breadcrumbs.length > 0 && (
                <div className="mb-6">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            )}
            {children}
        </PatientDashboardLayout>
    );
}
