// resources/js/layouts/app/AppSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ✅ SINGLE shared sidebar for every dashboard page.
// Replaces: sidebar.tsx (dashboard) AND schedule-sidebar.tsx (schedule).
// Feed any NavItem.id as activeId to highlight the correct link.

import type { ReactElement } from "react";
import { Link }              from "@inertiajs/react";
import { navGroups }         from "@/pages/user/dashboard/dashboard-data";
import { WellcareLogo }      from "@/pages/user/dashboard/components/well-care-logo";
import { NavIcon }           from "../icons/index";
import {
  IconLogout,
  IconChevronRight,
} from "@/pages/user/dashboard/icons";

// ── Shared meta pulled from dashboard-data ────────────────────────────────────
// These strings are already in dashboardMeta — we import selectively
// to avoid a circular dep through the layout.
const HELP_TITLE  = "Need help?";
const HELP_DESC   = "Contact our support for any issues.";
const HELP_LABEL  = "Get Support";
const LOGOUT_LABEL = "Logout";

interface AppSidebarProps {
  activeId: string;
}

export function AppSidebar({ activeId }: AppSidebarProps): ReactElement {
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
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div style={{
        padding:      "var(--space-6) var(--space-5)",
        borderBottom: "1px solid var(--wc-gray-100)",
      }}>
        <WellcareLogo />
      </div>

      {/* ── Grouped nav ─────────────────────────────────────────────────── */}
      <nav
        className="wc-sidebar-nav"
        style={{ flex: 1, padding: "var(--space-4) var(--space-3)", overflowY: "auto" }}
      >
        {navGroups.map((group) => (
          <div key={group.groupLabel} style={{ marginBottom: "var(--space-4)" }}>
            {/* Section label */}
            <p style={{
              margin:        "0 0 var(--space-2) var(--space-4)",
              fontSize:      "var(--text-xs)",
              fontWeight:    700,
              color:         "var(--wc-gray-400)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily:    "var(--font-sans)",
            }}>
              {group.groupLabel}
            </p>

            {/* Nav items */}
            {group.items.map((item) => {
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
                  <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>
                    <NavIcon iconKey={item.iconKey} />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && (
                    <span style={{ marginLeft: "auto", opacity: 0.8 }}>
                      <IconChevronRight />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Help box ────────────────────────────────────────────────────── */}
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
          {HELP_TITLE}
        </p>
        <p style={{
          margin:     "0 0 var(--space-3)",
          fontSize:   "var(--text-xs)",
          color:      "var(--wc-gray-500)",
          lineHeight: 1.5,
        }}>
          {HELP_DESC}
        </p>
        <Link
          href="/contact"
          style={{
            display:        "inline-flex",
            fontSize:       "var(--text-xs)",
            fontWeight:     700,
            color:          "var(--wc-blue-600)",
            textDecoration: "none",
          }}
        >
          {HELP_LABEL}
        </Link>
      </div>

      {/* ── Logout ──────────────────────────────────────────────────────── */}
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
          {LOGOUT_LABEL}
        </Link>
      </div>
    </aside>
  );
}