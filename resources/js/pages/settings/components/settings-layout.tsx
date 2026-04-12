// resources/js/pages/settings/components/settings-layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared inner layout for every settings page.
// Renders: page header + 2-col grid (nav | content card).
// Each settings page just passes its nav tab list, activeHref, card header,
// and children — no duplication of the outer shell.

import type { ReactElement, ReactNode } from "react";
import { DashboardLayout }              from "@/pages/doctor/layout/dashboard-layout";
import { settingsPageMeta }             from "../settings-data";
import type { SettingsTab }             from "../settings-data";
import SettingsNav                      from "./settings-nav";

interface SettingsLayoutProps {
  tabs:        SettingsTab[];
  activeHref:  string;
  /** Icon element shown in the panel header */
  panelIcon:   ReactElement;
  panelTitle:  string;
  panelSubtitle: string;
  children:    ReactNode;
  /** Optional: pass navGroups / iconMap for patient sidebar */
  layoutProps?: Record<string, unknown>;
}

export function SettingsLayout({
  tabs, activeHref,
  panelIcon, panelTitle, panelSubtitle,
  children, layoutProps = {},
}: SettingsLayoutProps): ReactElement {
  const meta = settingsPageMeta;

  return (
    <DashboardLayout activeId="settings" {...(layoutProps as any)}>

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

        {/* Two-column: nav + content */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "var(--space-8)", alignItems: "flex-start" }}>

          <SettingsNav tabs={tabs} activeHref={activeHref} />

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