// resources/js/layouts/app/AppTopbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ✅ SINGLE shared topbar for every dashboard page.
// Replaces: topbar.tsx (dashboard) AND schedule-topbar.tsx (schedule).
// Zero props needed — user info is read from shared meta.

import type { ReactElement } from "react";
import { dashboardMeta }     from "@/pages/user/dashboard/dashboard-data";
import {
  IconSearch,
  IconBell,
  IconChevronDown,
} from "@/pages/user/dashboard/icons";

export function AppTopbar(): ReactElement {
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
        zIndex:       "var(--z-nav)" as React.CSSProperties["zIndex"],
        flexShrink:   0,
      }}
    >
      {/* ── Search ──────────────────────────────────────────────────────── */}
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
        {/* ── Notification bell ─────────────────────────────────────────── */}
        <button
          type="button"
          aria-label="Notifications"
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
            flexShrink:     0,
          }}
        >
          <IconBell />
          {/* Unread dot */}
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

        {/* ── User chip ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
          {/* Avatar */}
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
            letterSpacing:  "0.04em",
          }}>
            DM
          </div>

          {/* Name + role */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{
              fontSize:   "var(--text-sm)",
              fontWeight: 600,
              color:      "var(--wc-dark)",
              lineHeight: 1.2,
            }}>
              {meta.userName}
            </span>
            <span style={{
              fontSize:   "var(--text-xs)",
              color:      "var(--wc-gray-400)",
              lineHeight: 1.2,
            }}>
              {meta.userRole}
            </span>
          </div>

          <span style={{ color: "var(--wc-gray-400)", flexShrink: 0 }}>
            <IconChevronDown />
          </span>
        </div>
      </div>
    </header>
  );
}