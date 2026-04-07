// resources/js/layouts/app/DashboardLayout.tsx

import type { ReactElement, ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

interface DashboardLayoutProps {
  activeId: string;
  children: ReactNode;
}

export function DashboardLayout({ activeId, children }: DashboardLayoutProps): ReactElement {
  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "var(--wc-gray-50)",
      fontFamily: "var(--font-sans, 'DM Sans')",
    }}>
      {/* ── Sidebar (Fixed) ────────────────────────────────────────────── */}
      <AppSidebar activeId={activeId} />

      {/* ── Scrollable Right Column ────────────────────────────────────── */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        minWidth: 0,
        height: "100vh",
        overflowY: "auto", // Right column handles the scroll now
        position: "relative"
      }}>
        
        {/* Sticky Topbar Wrapper */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(249, 250, 251, 0.8)", // Semi-transparent version of var(--wc-gray-50)
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
        }}>
          <AppTopbar />
        </div>

        {/* Main Content Area */}
        <main style={{ 
          flex: 1, 
          padding: "var(--space-8)",
          paddingTop: "var(--space-4)" // Reduced slightly since Topbar provides some spacing
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}