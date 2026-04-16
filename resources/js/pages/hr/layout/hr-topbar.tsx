// resources/js/pages/hr/layout/HrTopbar.tsx
import type { ReactElement } from "react";
import { Bell, Search, ChevronDown, ShieldCheck } from "lucide-react";
import { hrMeta } from "../hr-data";

export function HrTopbar(): ReactElement {
  return (
    <header style={{
      display:              "flex",
      alignItems:           "center",
      gap:                  "var(--space-4)",
      padding:              "0 var(--space-8)",
      height:               "var(--header-height, 72px)",
      background:           "rgba(255,255,255,0.75)",
      backdropFilter:       "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom:         "1px solid rgba(0,0,0,0.05)",
      position:             "sticky",
      top:                  0,
      zIndex:               100,
      flexShrink:           0,
    }}>
      {/* Search */}
      <div style={{ flex: 1, position: "relative", maxWidth: 420 }}>
        <span style={{ position: "absolute", left: "var(--space-3)", top: "50%", transform: "translateY(-50%)", color: "var(--wc-gray-400)", display: "flex", pointerEvents: "none" }}>
          <Search size={15} strokeWidth={2} />
        </span>
        <input
          type="search"
          className="wc-input"
          placeholder={hrMeta.searchPlaceholder}
          style={{ paddingLeft: "calc(var(--space-3) + 24px)", fontSize: "var(--text-sm)", background: "rgba(0,0,0,0.03)", border: "1px solid var(--wc-gray-200)" }}
        />
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        {/* Bell */}
        <button type="button" aria-label="Notifications" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "var(--radius-full)", border: "1px solid var(--wc-gray-200)", background: "rgba(255,255,255,0.5)", cursor: "pointer", color: "var(--wc-gray-500)", position: "relative", flexShrink: 0 }}>
          <Bell size={18} strokeWidth={1.8} />
          <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "var(--radius-full)", background: "var(--wc-error, #dc2626)", border: "2px solid white" }} />
        </button>

        {/* User chip — uses emerald/teal to distinguish HR role */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0, letterSpacing: "0.04em" }}>
            {hrMeta.userInitials}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.2 }}>
              {hrMeta.userName}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.2, display: "flex", alignItems: "center", gap: "3px" }}>
              <ShieldCheck size={10} strokeWidth={2.5} />
              {hrMeta.userRole}
            </span>
          </div>
          <span style={{ color: "var(--wc-gray-400)", flexShrink: 0 }}>
            <ChevronDown size={14} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </header>
  );
}