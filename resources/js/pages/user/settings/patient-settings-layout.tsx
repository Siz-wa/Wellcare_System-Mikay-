// resources/js/pages/user/settings/patient-settings-layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared layout shell for every patient settings page.
// Injects the patient sidebar (patientNavGroups + PATIENT_ICON_MAP) and
// builds settings-nav hrefs as /user/settings/{id} — NOT /settings/{id}.

import type { ReactElement, ReactNode } from "react";
import { Head }                         from "@inertiajs/react";
import { DashboardLayout }              from "@/pages/doctor/layout/dashboard-layout";
import { patientNavGroups, patientTopbarMeta } from "@/pages/user/patient-nav-data";
import { PATIENT_ICON_MAP }             from "@/pages/user/constants/patient-icons";
import { patientTabs, settingsPageMeta } from "@/pages/settings/settings-data";
import type { SettingsTab }             from "@/pages/settings/settings-data";
import { Link, usePage }                from "@inertiajs/react";

// ── Patient settings nav (hrefs → /user/settings/{id}) ────────────────────────

const TabIcons: Record<string, ReactElement> = {
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  heart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
};

function PatientSettingsNav({ activeId }: { activeId: string }): ReactElement {
  const { url } = usePage();

  return (
    <nav style={{
      flexShrink: 0, background: "#fff",
      borderRadius: "var(--radius-3xl)",
      border: "1px solid var(--wc-gray-100)",
      padding: "var(--space-3)", boxShadow: "var(--shadow-sm)",
      position: "sticky", top: "var(--space-6)",
    }}>
      {patientTabs.map((tab) => {
        // ← KEY FIX: patient hrefs always use /user/settings/{id}
        const href = `/user/settings/${tab.id}`;
        const isActive = activeId === tab.id || url.includes(`/user/settings/${tab.id}`);

        return (
          <Link
            key={tab.id}
            href={href}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-xl)",
              background: isActive ? "var(--wc-blue-50)" : "transparent",
              color:      isActive ? "var(--wc-blue-600)" : "var(--wc-gray-500)",
              fontSize: "var(--text-sm)", fontWeight: isActive ? 700 : 500,
              textDecoration: "none", marginBottom: "var(--space-1)",
              transition: "all var(--duration-base) var(--ease-out)",
            }}
          >
            <span style={{
              width: 3, height: 20, borderRadius: "var(--radius-full)",
              background: isActive ? "var(--wc-blue-600)" : "transparent",
              flexShrink: 0,
            }} />
            <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              {TabIcons[tab.icon]}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

interface PatientSettingsLayoutProps {
  /** Must match a patientTabs id: "profile" | "security" | "health-information" | "notifications" */
  activeId:      string;
  pageTitle:     string;
  panelIcon:     ReactElement;
  panelTitle:    string;
  panelSubtitle: string;
  children:      ReactNode;
}

export function PatientSettingsLayout({
  activeId, pageTitle,
  panelIcon, panelTitle, panelSubtitle,
  children,
}: PatientSettingsLayoutProps): ReactElement {
  const meta = settingsPageMeta;

  return (
    <DashboardLayout
      activeId="settings"
      navGroups={patientNavGroups}
      iconMap={PATIENT_ICON_MAP}
      userMeta={patientTopbarMeta}
      avatarColor="var(--wc-sky-500)"
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>

        {/* Page header */}
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h1 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "var(--wc-dark)" }}>
            {meta.pageTitle}
          </h1>
          <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--wc-gray-500)" }}>
            {meta.pageSubtitle}
          </p>
        </div>

        {/* Two-column: patient settings nav + content card */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "var(--space-8)", alignItems: "flex-start" }}>

          <PatientSettingsNav activeId={activeId} />

          <main style={{
            background: "#fff", borderRadius: "var(--radius-3xl)",
            border: "1px solid var(--wc-gray-100)", padding: "var(--space-8)",
            boxShadow: "var(--shadow-sm)", minHeight: 600,
          }}>
            {/* Panel header */}
            <div style={{ marginBottom: "var(--space-8)", paddingBottom: "var(--space-6)", borderBottom: "1px solid var(--wc-gray-100)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-xl)",
                  background: "var(--wc-blue-50)", display: "flex",
                  alignItems: "center", justifyContent: "center", color: "var(--wc-blue-600)",
                }}>
                  {panelIcon}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--wc-dark)" }}>
                    {panelTitle}
                  </h2>
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--wc-gray-500)" }}>
                    {panelSubtitle}
                  </p>
                </div>
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}