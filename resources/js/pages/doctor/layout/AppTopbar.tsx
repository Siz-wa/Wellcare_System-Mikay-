// resources/js/layouts/app/AppTopbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Spammable topbar — works for any role (doctor, patient, admin…).
//
// Doctor dashboard (zero config — defaults apply):
//   <AppTopbar />
//
// Patient dashboard (pass own user meta):
//   <AppTopbar userMeta={patientTopbarMeta} avatarColor="var(--wc-sky-500)" />

import type { ReactElement }  from "react";
import { dashboardMeta }      from "@/pages/doctor/dashboard-data";
import {
  IconSearch,
  IconBell,
  IconChevronDown,
} from "@/pages/doctor/icons";

// ── Shared interface — any page that uses AppTopbar provides this shape ────────

export interface TopbarUserMeta {
  searchPlaceholder: string;
  userName:          string;
  userRole:          string;
  userInitials:      string;
}

// ── Default doctor meta ───────────────────────────────────────────────────────

const DOCTOR_TOPBAR_META: TopbarUserMeta = {
  searchPlaceholder: dashboardMeta.searchPlaceholder,
  userName:          dashboardMeta.userName,
  userRole:          dashboardMeta.userRole,
  userInitials:      "DM",
};

// ── AppTopbar ─────────────────────────────────────────────────────────────────

interface AppTopbarProps {
  /**
   * User meta to display in the topbar.
   * Defaults to DOCTOR_TOPBAR_META. Pass patientTopbarMeta for patient pages.
   */
  userMeta?:     TopbarUserMeta;
  /**
   * Avatar background color.
   * Defaults to var(--wc-blue-600) for doctor.
   * Pass "var(--wc-sky-500)" for patient to visually distinguish the role.
   */
  avatarColor?:  string;
}

export function AppTopbar({
  userMeta    = DOCTOR_TOPBAR_META,
  avatarColor = "var(--wc-blue-600)",
}: AppTopbarProps): ReactElement {
  return (
    <header
      className="wc-topbar"
      style={{
        display:              "flex",
        alignItems:           "center",
        gap:                  "var(--space-4)",
        padding:              "0 var(--space-8)",
        height:               "var(--header-height, 72px)",
        background:           "rgba(255, 255, 255, 0.75)",
        backdropFilter:       "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom:         "1px solid rgba(0, 0, 0, 0.05)",
        position:             "sticky",
        top:                  0,
        zIndex:               100,
        flexShrink:           0,
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
          placeholder={userMeta.searchPlaceholder}
          style={{
            paddingLeft: "calc(var(--space-3) + 24px)",
            fontSize:    "var(--text-sm)",
            background:  "rgba(0, 0, 0, 0.03)",
            border:      "1px solid var(--wc-gray-200)",
          }}
        />
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        {/* Bell */}
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
            background:     "rgba(255, 255, 255, 0.5)",
            cursor:         "pointer",
            color:          "var(--wc-gray-500)",
            position:       "relative",
            flexShrink:     0,
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
            border:       "2px solid white",
          }} />
        </button>

        {/* User chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
          <div style={{
            width:          40,
            height:         40,
            borderRadius:   "var(--radius-full)",
            background:     avatarColor,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            color:          "#ffffff",
            fontSize:       "var(--text-xs)",
            fontWeight:     700,
            flexShrink:     0,
            letterSpacing:  "0.04em",
          }}>
            {userMeta.userInitials}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-dark)", lineHeight: 1.2 }}>
              {userMeta.userName}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--wc-gray-400)", lineHeight: 1.2 }}>
              {userMeta.userRole}
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