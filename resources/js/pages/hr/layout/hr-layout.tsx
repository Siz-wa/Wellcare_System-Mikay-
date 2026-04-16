// resources/js/pages/hr/layout/HrLayout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HR page shell. Same structure as DashboardLayout.
//
// Usage:
//   <HrLayout activeId="hmo-applications">
//     <YourContent />
//   </HrLayout>

import type { ReactElement, ReactNode } from "react";
import { HrSidebar }                    from "./hr-sidebar";
import { HrTopbar }                     from "./hr-topbar";

interface HrLayoutProps {
  activeId: string;
  children: ReactNode;
}

export function HrLayout({ activeId, children }: HrLayoutProps): ReactElement {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--wc-gray-50)", fontFamily: "var(--font-sans,'DM Sans')" }}>
      <HrSidebar activeId={activeId} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflowY: "auto", position: "relative" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(249,250,251,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <HrTopbar />
        </div>

        <main
          className="animate-in fade-in duration-500"
          style={{ flex: 1, padding: "var(--space-8)", paddingTop: "var(--space-4)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}