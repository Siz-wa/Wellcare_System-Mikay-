// resources/js/pages/user/dashboard/components/Sidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Sticky sidebar: logo, nav links, help box, logout button.

import type { ReactElement } from "react";
import { Link }              from "@inertiajs/react";
import { navItems, dashboardMeta } from "../dashboard-data";
import { WellcareLogo }      from "./well-care-logo";
import { NavIcon }           from "./shared";
import { IconLogout, IconChevronRight } from "../icons";

interface SidebarProps {
  activeId: string;
}

export function Sidebar({ activeId }: SidebarProps): ReactElement {
  const meta = dashboardMeta;

  return (
    <aside
      className="wc-sidebar"
      style={{
        display:       "flex",
        flexDirection: "column",
        height:        "100vh",
        position:      "sticky",
        top:           0,
        overflowY:     "auto",
        background:    "var(--wc-white)",
        borderRight:   "1px solid var(--wc-gray-100)",
        width:         "var(--sidebar-width, 260px)",
        flexShrink:    0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "var(--space-6) var(--space-5)", borderBottom: "1px solid var(--wc-gray-100)" }}>
        <WellcareLogo />
      </div>

      {/* Nav */}
      <nav className="wc-sidebar-nav" style={{ flex: 1, padding: "var(--space-4) var(--space-3)" }}>
        {navItems.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`wc-nav-link${isActive ? " active" : ""}`}
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            "var(--space-3)",
                padding:        "var(--space-3) var(--space-4)",
                borderRadius:   "var(--radius-lg)",
                marginBottom:   "var(--space-1)",
                fontSize:       "var(--text-sm)",
                fontWeight:     isActive ? 600 : 500,
                color:          isActive ? "var(--wc-white)" : "var(--wc-gray-600)",
                background:     isActive ? "var(--wc-blue-600)" : "transparent",
                textDecoration: "none",
                transition:     "all var(--duration-base) var(--ease-out)",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.7 }}>
                <NavIcon iconKey={item.iconKey} />
              </span>
              {item.label}
              {isActive && (
                <span style={{ marginLeft: "auto" }}>
                  <IconChevronRight />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help box */}
      <div style={{
        margin:       "0 var(--space-3) var(--space-3)",
        padding:      "var(--space-4)",
        borderRadius: "var(--radius-xl)",
        background:   "var(--wc-blue-50)",
        border:       "1px solid var(--wc-blue-100)",
      }}>
        <p style={{
          margin:        "0 0 var(--space-1)",
          fontSize:      "var(--text-xs)",
          fontWeight:    700,
          color:         "var(--wc-blue-700)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          {meta.helpTitle}
        </p>
        <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", color: "var(--wc-gray-500)", lineHeight: 1.5 }}>
          {meta.helpDesc}
        </p>
        <a
          href="/contact"
          style={{
            display:        "inline-flex",
            fontSize:       "var(--text-xs)",
            fontWeight:     700,
            color:          "var(--wc-blue-600)",
            textDecoration: "none",
          }}
        >
          {meta.helpLabel}
        </a>
      </div>

      {/* Logout */}
      <div style={{ padding: "var(--space-4) var(--space-3)", borderTop: "1px solid var(--wc-gray-100)" }}>
        <Link
          href="/logout"
          method="post"
          as="button"
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "var(--space-3)",
            width:          "100%",
            padding:        "var(--space-3) var(--space-4)",
            borderRadius:   "var(--radius-lg)",
            border:         "none",
            background:     "transparent",
            fontSize:       "var(--text-sm)",
            fontWeight:     500,
            color:          "var(--wc-gray-500)",
            cursor:         "pointer",
            textDecoration: "none",
            transition:     "all var(--duration-base) var(--ease-out)",
          }}
        >
          <IconLogout />
          {meta.logoutLabel}
        </Link>
      </div>
    </aside>
  );
}