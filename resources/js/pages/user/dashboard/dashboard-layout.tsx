// resources/js/pages/user/dashboard/DashboardLayout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Layout shell: sidebar + topbar + main content area.
// Accepts children so it can wrap any dashboard section.

import type { ReactElement, ReactNode } from "react";
import { dashboardMeta }                from "./dashboard-data";
import { Sidebar }                      from "./components/sidebar";
import { Topbar }                       from "./components/topbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  const meta = dashboardMeta;

  return (
    <div style={{
      display:    "flex",
      minHeight:  "100vh",
      background: "var(--wc-gray-50)",
      fontFamily: "var(--font-sans, 'DM Sans')",
    }}>
      {/* Sidebar */}
      <Sidebar activeId={meta.activeNav} />

      {/* Right column: topbar + scrollable content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar />
        <main style={{ flex: 1, padding: "var(--space-8)", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}