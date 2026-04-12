// resources/js/pages/settings/components/settings-nav.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable sidebar nav for all Settings pages.
// Appearance tab removed. Bell + Heart icons added for new tabs.

import type { ReactElement } from "react";
import { Link, usePage }     from "@inertiajs/react";
import type { SettingsTab }  from "../settings-data";

// ── Icon map ──────────────────────────────────────────────────────────────────

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
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  heart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface SettingsNavProps {
  tabs:       SettingsTab[];
  activeHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsNav({ tabs, activeHref }: SettingsNavProps): ReactElement {
  const { url } = usePage();
  const currentPath = activeHref || url;

  return (
    <nav style={{
      flexShrink: 0,
      background: "#fff",
      borderRadius: "var(--radius-3xl)",
      border: "1px solid var(--wc-gray-100)",
      padding: "var(--space-3)",
      boxShadow: "var(--shadow-sm)",
      position: "sticky",
      top: "var(--space-6)",
    }}>
      {tabs.map((tab) => {
        const href = tab.href ?? `/settings/${tab.id}`;
        const isActive = currentPath.includes(tab.id);

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
            {/* Active stripe */}
            <span style={{
              width: 3, height: 20, borderRadius: "var(--radius-full)",
              background: isActive ? "var(--wc-blue-600)" : "transparent",
              flexShrink: 0,
              transition: "background var(--duration-base) var(--ease-out)",
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