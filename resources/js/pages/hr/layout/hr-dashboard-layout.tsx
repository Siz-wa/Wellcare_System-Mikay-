// resources/js/layouts/app/HRDashboardLayout.tsx
import type { ReactElement, ReactNode } from "react";
import { HRAppSidebar }    from "@/pages/hr/layout/components/HRAppSidebar";
import { AppTopbar }       from "@/design-system/components/AppTopbar";
import { hrDashboardMeta } from "@/pages/hr/layout/hr-dashboard-data";

interface HRDashboardLayoutProps {
  activeId: string;
  children: ReactNode;
}

export function HRDashboardLayout({ activeId, children }: HRDashboardLayoutProps): ReactElement {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--wc-gray-50)", fontFamily: "var(--font-sans,'DM Sans')" }}>
      <HRAppSidebar activeId={activeId} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflowY: "auto", position: "relative" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <AppTopbar searchPlaceholder={hrDashboardMeta.searchPlaceholder} />
        </div>
        <main style={{ flex: 1, padding: "var(--space-8)", paddingTop: "var(--space-6)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}