// resources/js/layouts/app/AppSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Spammable sidebar — works for any role (doctor, patient, admin…).
//
// Doctor dashboard (zero config — defaults apply):
//   <AppSidebar activeId="dashboard" />
//
// Patient dashboard (pass own nav + icons):
//   <AppSidebar activeId="appointments" navGroups={patientNavGroups} iconMap={PATIENT_ICONS} />
//
// Any future role: same pattern — just pass different navGroups + iconMap.

import { useState, type ReactElement } from "react";
import { Link }                         from "@inertiajs/react";
import {
  LayoutDashboard, CalendarCheck2, Users, MessageSquare,
  FlaskConical, FolderOpen, Settings, LogOut, ChevronRight,
} from "lucide-react";
import { navGroups as doctorNavGroups } from "@/pages/doctor/dashboard-data";
import type { NavItem, NavGroup }       from "@/pages/doctor/dashboard-data";
import { WellcareLogo }                 from "./components/wellcare-logo";

// ── Design tokens ─────────────────────────────────────────────────────────────

const BRAND          = "#0056b3";
const BRAND_BG       = "#eff6ff";
const BRAND_TXT      = "#0056b3";
const ACTIVE_SHADOW  = "0 4px 14px -2px rgba(0,86,179,0.35), 0 2px 6px -1px rgba(0,86,179,0.2)";
const NAV_TRANSITION = "transform 180ms cubic-bezier(0.16,1,0.3,1), background 150ms ease, color 150ms ease, box-shadow 150ms ease";

// ── Default doctor icon map (exported so callers can extend it) ───────────────

export const DOCTOR_ICON_MAP: Record<string, ReactElement> = {
  dashboard:     <LayoutDashboard size={17} strokeWidth={1.8} />,
  schedule:      <CalendarCheck2  size={17} strokeWidth={1.8} />,
  patients:      <Users           size={17} strokeWidth={1.8} />,
  consultations: <MessageSquare   size={17} strokeWidth={1.8} />,
  labreviews:    <FlaskConical    size={17} strokeWidth={1.8} />,
  records:       <FolderOpen      size={17} strokeWidth={1.8} />,
  settings:      <Settings        size={17} strokeWidth={1.8} />,
};

// ── Sub-components ────────────────────────────────────────────────────────────

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

interface NavLinkItemProps {
  item:    NavItem;
  active:  boolean;
  iconMap: Record<string, ReactElement>;
}

function NavLinkItem({ item, active, iconMap }: NavLinkItemProps): ReactElement {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium no-underline select-none"
      style={{
        transform:  hovered && !active ? "translateX(4px)" : "translateX(0)",
        transition: NAV_TRANSITION,
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
        {/* Fallback to FolderOpen if iconKey not found in the provided map */}
        {iconMap[item.iconKey] ?? <FolderOpen size={17} strokeWidth={1.8} />}
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
        transition: NAV_TRANSITION,
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

// ── AppSidebar ────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  /** Active nav item id — must match a NavItem.id in the provided navGroups */
  activeId:   string;
  /**
   * Nav groups to render.
   * Defaults to doctorNavGroups. Pass patientNavGroups for patient pages.
   */
  navGroups?: NavGroup[];
  /**
   * Icon map keyed by NavItem.iconKey string.
   * Defaults to DOCTOR_ICON_MAP. Pass PATIENT_ICON_MAP for patient pages.
   */
  iconMap?:   Record<string, ReactElement>;
}

export function AppSidebar({
  activeId,
  navGroups = doctorNavGroups,
  iconMap   = DOCTOR_ICON_MAP,
}: AppSidebarProps): ReactElement {
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
      <div style={{ height: 1, background: "#f1f5f9", marginBottom: "8px" }} />

      {/* Grouped nav */}
      <nav style={{
        flex:          1,
        padding:       "8px 16px",
        display:       "flex",
        flexDirection: "column",
        overflowY:     "auto",
      }}>
        {navGroups.map((group, gi) => (
          <div key={group.groupLabel} style={{ marginBottom: gi < navGroups.length - 1 ? 16 : 0 }}>
            <GroupHeader label={group.groupLabel} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map((item) => (
                <NavLinkItem
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  iconMap={iconMap}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
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