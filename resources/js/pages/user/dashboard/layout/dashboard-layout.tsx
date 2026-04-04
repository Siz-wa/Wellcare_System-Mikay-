// resources/js/layouts/app/DashboardLayout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ✅ REUSABLE layout shell for every dashboard page.
//
// Usage — just pass the activeId that matches a NavItem id in dashboard-data:
//
//   import { DashboardLayout } from "@/layouts/app/DashboardLayout";
//
//   export default function ConsultationsPage(): ReactElement {
//     return (
//       <DashboardLayout activeId="consultations">
//         <YourPageContent />
//       </DashboardLayout>
//     );
//   }
//
// All pages (Dashboard, My Schedule, Consultations, My Patients, Lab Reviews,
// Patient Records, Settings) use this single component — no more duplicate
// sidebars or topbars.

import type { ReactElement, ReactNode } from "react";
import { AppSidebar }                   from "./AppSidebar";
import { AppTopbar }                    from "./AppTopbar";

interface DashboardLayoutProps {
  /** Must match a NavItem.id from dashboard-data navGroups */
  activeId: string;
  children: ReactNode;
}

export function DashboardLayout({ activeId, children }: DashboardLayoutProps): ReactElement {
  return (
    <div style={{
      display:    "flex",
      minHeight:  "100vh",
      background: "var(--wc-gray-50)",
      fontFamily: "var(--font-sans, 'DM Sans')",
    }}>
      {/* ── Shared sidebar ─────────────────────────────────────────────── */}
      <AppSidebar activeId={activeId} />

      {/* ── Right column: topbar + scrollable main ──────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppTopbar />
        <main style={{ flex: 1, padding: "var(--space-8)", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}