// resources/js/layouts/app/DashboardLayout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Spammable page shell — works for any role by passing optional props.
//
// Doctor dashboard (zero config):
//   <DashboardLayout activeId="dashboard">…</DashboardLayout>
//
// Patient dashboard:
//   <DashboardLayout
//     activeId="appointments"
//     navGroups={patientNavGroups}
//     iconMap={PATIENT_ICON_MAP}
//     userMeta={patientTopbarMeta}
//     avatarColor="var(--wc-sky-500)"
//   >
//     …
//   </DashboardLayout>

import type { ReactElement, ReactNode } from "react";
import { AppSidebar, DOCTOR_ICON_MAP }  from "./AppSidebar";
import { AppTopbar }                    from "./AppTopbar";
import type { TopbarUserMeta }          from "./AppTopbar";
import type { NavGroup }                from "@/pages/doctor/dashboard-data";

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  /** Active nav item id */
  activeId:     string;
  children:     ReactNode;
  /** Override nav groups (pass patientNavGroups for patient pages) */
  navGroups?:   any[]; 
  /** Override icon map (pass PATIENT_ICON_MAP for patient pages) */
  iconMap?:     Record<string, ReactElement>;
  /** Override topbar user meta (pass patientTopbarMeta for patient pages) */
  userMeta?:    TopbarUserMeta;
  /** Override avatar color (pass "var(--wc-sky-500)" for patient pages) */
  avatarColor?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardLayout({
  activeId,
  children,
  navGroups,
  iconMap,
  userMeta,
  avatarColor,
}: DashboardLayoutProps): ReactElement {
  return (
    <div style={{
      display:    "flex",
      minHeight:  "100vh",
      background: "var(--wc-gray-50)",
      fontFamily: "var(--font-sans, 'DM Sans')",
    }}>
      {/* Sidebar — receives role-specific nav + icons */}
      <AppSidebar
        activeId={activeId}
        navGroups={navGroups}
        iconMap={iconMap}
      />

      {/* Right column */}
      <div style={{
        flex:          1,
        display:       "flex",
        flexDirection: "column",
        minWidth:      0,
        height:        "100vh",
        overflowY:     "auto",
        position:      "relative",
      }}>
        {/* Sticky topbar wrapper */}
        <div style={{
          position:             "sticky",
          top:                  0,
          zIndex:               100,
          background:           "rgba(249, 250, 251, 0.8)",
          backdropFilter:       "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom:         "1px solid rgba(0, 0, 0, 0.05)",
        }}>
          {/* Topbar — receives role-specific user meta + avatar color */}
          <AppTopbar
            userMeta={userMeta}
            avatarColor={avatarColor}
          />
        </div>

        {/* Page content — v1.6: fade-in on mount */}
        <main
          className="animate-in fade-in duration-500"
          style={{
            flex:       1,
            padding:    "var(--space-8)",
            paddingTop: "var(--space-4)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}