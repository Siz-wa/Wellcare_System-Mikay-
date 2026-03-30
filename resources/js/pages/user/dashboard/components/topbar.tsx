// resources/js/pages/user/dashboard/components/Topbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Sticky top header: search bar, notification bell, user chip.

import type { ReactElement } from "react";
import { dashboardMeta }     from "../dashboard-data";
import { IconSearch, IconBell, IconChevronDown } from "../icons";

export function Topbar(): ReactElement {
  const meta = dashboardMeta;

  return (
    <header
      className="wc-topbar"
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "var(--space-4)",
        padding:      "0 var(--space-8)",
        height:       "var(--header-height, 72px)",
        background:   "var(--wc-white)",
        borderBottom: "1px solid var(--wc-gray-100)",
        position:     "sticky",
        top:          0,
        zIndex:       "var(--z-nav)",
      }}
    >
      {/* Search */}
      <div style={{ flex: 1, position: "relative", maxWidth: 420 }}>
        <span style={{
          position:      "absolute",
          left:          "var(--space-3)",
          top:           "50%",
          transform:     "translateY(-50%)",
          color:         "var(--wc-gray-400)",
          display:       "flex",
          pointerEvents: "none",
        }}>
          <IconSearch />
        </span>
        <input
          type="search"
          className="wc-input"
          placeholder={meta.searchPlaceholder}
          style={{
            paddingLeft: "calc(var(--space-3) + 24px)",
            fontSize:    "var(--text-sm)",
            background:  "var(--wc-gray-50)",
            border:      "1px solid var(--wc-gray-200)",
          }}
        />
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        {/* Bell */}
        <button
          type="button"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            width:          40,
            height:         40,
            borderRadius:   "var(--radius-full)",
            border:         "1px solid var(--wc-gray-200)",
            background:     "var(--wc-white)",
            cursor:         "pointer",
            color:          "var(--wc-gray-500)",
            position:       "relative",
          }}
        >
          <IconBell />
          <span style={{
            position:     "absolute",
            top:          8,
            right:        8,
            width:        8,
            height:       8,
            borderRadius: "var(--radius-full)",
            background:   "var(--wc-error, #dc2626)",
            border:       "2px solid var(--wc-white)",
          }} />
        </button>

        {/* User chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
          <div style={{
            width:          40,
            height:         40,
            borderRadius:   "var(--radius-full)",
            background:     "var(--wc-blue-600)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            color:          "#ffffff",
            fontSize:       "var(--text-xs)",
            fontWeight:     700,
            flexShrink:     0,
          }}>
            DM
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.2 }}>
              {meta.userName}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.2 }}>
              {meta.userRole}
            </span>
          </div>
          <span style={{ color: "var(--wc-gray-400)" }}>
            <IconChevronDown />
          </span>
        </div>
      </div>
    </header>
  );
}