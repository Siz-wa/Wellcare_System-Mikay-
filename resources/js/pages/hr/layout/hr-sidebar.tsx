// resources/js/pages/hr/layout/HrSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HR sidebar — minimal: Dashboard overview + HMO Applications only.
// Reuses the exact same visual DNA as AppSidebar (same tokens, motion, hover).

import { useState, type ReactElement } from "react";
import { Link }                         from "@inertiajs/react";
import {
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { hrNavGroups }  from "../hr-data";
import type { HrNavItem, HrNavGroup } from "../hr-data";
import { WellcareLogo }  from "../../doctor/components/well-care-logo"

// ── Design tokens — identical to AppSidebar ───────────────────────────────────

const BRAND         = "#0056b3";
const BRAND_BG      = "#eff6ff";
const BRAND_TXT     = "#0056b3";
const ACTIVE_SHADOW = "0 4px 14px -2px rgba(0,86,179,0.35), 0 2px 6px -1px rgba(0,86,179,0.2)";
const TRANSITION    = "transform 180ms cubic-bezier(0.16,1,0.3,1), background 150ms ease, color 150ms ease, box-shadow 150ms ease";

// ── Icon map ──────────────────────────────────────────────────────────────────

const HR_ICON_MAP: Record<string, ReactElement> = {
  dashboard:        <LayoutDashboard size={17} strokeWidth={1.8} />,
  "hmo-applications": <ShieldCheck   size={17} strokeWidth={1.8} />,
};

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }): ReactElement {
  return (
    <p style={{
      margin:        "0 0 6px 0",
      fontSize:      "10px",
      fontWeight:    700,
      color:         "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.15em",
      fontFamily:    "var(--font-sans,'DM Sans')",
      paddingLeft:   "var(--space-4)",
    }}>
      {label}
    </p>
  );
}

// ── Nav link ──────────────────────────────────────────────────────────────────

function NavLinkItem({ item, active }: { item: HrNavItem; active: boolean }): ReactElement {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium no-underline select-none"
      style={{
        transform:  hovered && !active ? "translateX(4px)" : "translateX(0)",
        transition: TRANSITION,
        background: active ? BRAND : hovered ? BRAND_BG : "transparent",
        color:      active ? "#ffffff" : hovered ? BRAND_TXT : "#64748b",
        boxShadow:  active ? ACTIVE_SHADOW : "none",
        fontFamily: "var(--font-sans,'DM Sans')",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="flex-shrink-0 flex" style={{ opacity: active ? 1 : hovered ? 1 : 0.65 }}>
        {HR_ICON_MAP[item.id] ?? <LayoutDashboard size={17} strokeWidth={1.8} />}
      </span>
      <span className="flex-1">{item.label}</span>
      {active && (
        <span className="flex" style={{ opacity: 0.7 }}>
          <ChevronRight size={14} strokeWidth={2.5} />
        </span>
      )}
    </Link>
  );
}

// ── Logout button ─────────────────────────────────────────────────────────────

function LogoutButton(): ReactElement {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href="/logout"
      method="post"
      as="button"
      className="flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-medium no-underline"
      style={{
        transform:  hovered ? "translateX(4px)" : "translateX(0)",
        transition: TRANSITION,
        background: hovered ? "#fef2f2" : "transparent",
        color:      hovered ? "#ef4444" : "#64748b",
        border:     "none",
        cursor:     "pointer",
        fontFamily: "var(--font-sans,'DM Sans')",
        fontWeight: 500,
        textAlign:  "left",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="flex-shrink-0 flex" style={{ opacity: hovered ? 1 : 0.55 }}>
        <LogOut size={17} strokeWidth={1.8} />
      </span>
      Logout
    </Link>
  );
}

// ── HrSidebar ────────────────────────────────────────────────────────────────

interface HrSidebarProps {
  activeId: string;
}

export function HrSidebar({ activeId }: HrSidebarProps): ReactElement {
  return (
    <aside style={{
      width:         260,
      minHeight:     "100vh",
      height:        "100vh",
      position:      "sticky",
      top:           0,
      flexShrink:    0,
      display:       "flex",
      flexDirection: "column",
      background:    "#ffffff",
      borderRight:   "1px solid #f1f5f9",
      overflowY:     "auto",
      overflowX:     "hidden",
    }}>
      {/* Logo */}
      <div className="px-5 py-6 select-none">
        <WellcareLogo />
      </div>

      {/* HR role pill */}
      <div style={{ padding: "0 var(--space-5) var(--space-4)" }}>
        <span style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           "var(--space-2)",
          padding:       "4px 10px",
          borderRadius:  "var(--radius-full)",
          background:    "var(--wc-blue-50)",
          color:         "var(--wc-blue-700)",
          fontSize:      "10px",
          fontWeight:    800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          <ShieldCheck size={11} strokeWidth={2.5} />
          HR Staff
        </span>
      </div>

      <div style={{ height: 1, background: "#f1f5f9", marginBottom: "8px" }} />

      {/* Grouped nav */}
      <nav style={{
        flex:          1,
        padding:       "8px 16px",
        display:       "flex",
        flexDirection: "column",
        overflowY:     "auto",
      }}>
        {hrNavGroups.map((group: HrNavGroup, gi: number) => (
          <div key={group.groupLabel} style={{ marginBottom: gi < hrNavGroups.length - 1 ? 16 : 0 }}>
            <GroupHeader label={group.groupLabel} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map((item) => (
                <NavLinkItem
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{
        borderTop:     "1px solid #f1f5f9",
        padding:       "12px 16px 16px",
        display:       "flex",
        flexDirection: "column",
        gap:           2,
      }}>
        <LogoutButton />
      </div>
    </aside>
  );
}