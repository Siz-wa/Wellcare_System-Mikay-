// resources/js/components/NotificationBell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Centralized notification bell — reads from Inertia shared props.
// Drop this into any layout: Navbar, dashboard topbar, patient header, etc.
//
// FIX: backend sends `subject` (not `title`) — supports both fields so this
//      works with all roles (doctor, patient, HR) without backend changes.

import type { ReactElement }           from "react";
import { useState, useEffect, useRef } from "react";
import { router, usePage }             from "@inertiajs/react";
import type { PageProps }              from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id:         string;
  type:       string;
  // Backend sends `subject` for appointment notifications; some channels use `title`.
  // We support both — whichever is present wins.
  title?:     string;
  subject?:   string;
  body:       string;
  icon?:      string;
  action_url?: string | null;
  role_hint?:  string | null;
  read:       boolean;
  time:       string;
  created_at?: string;
}

interface SharedProps extends PageProps {
  notifications: NotificationItem[];
  unreadCount:   number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolves the display heading regardless of whether the backend sent `title` or `subject`. */
function getTitle(n: NotificationItem): string {
  return n.title ?? n.subject ?? "Notification";
}

// ── Icon resolver ─────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }): ReactElement {
  const iconMap: Record<string, ReactElement> = {
    "calendar": (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    "check-circle": (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    "x-circle": (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    "user-check": (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>
      </svg>
    ),
    "clipboard-check": (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  };

  const colorMap: Record<string, string> = {
    confirmed:              "#16a34a",
    appointment_confirmed:  "#16a34a",
    cancelled:              "#b91c1c",
    appointment_cancelled:  "#b91c1c",
    checked_in:             "#1d4ed8",
    patient_checked_in:     "#1d4ed8",
    consultation_done:      "#7c3aed",
    consultation_finalized: "#7c3aed",
    requested:              "#ca8a04",
    appointment_requested:  "#ca8a04",
  };

  const color = colorMap[type] ?? "var(--wc-blue-600)";

  // Resolve icon by type keyword
  let icon = iconMap["calendar"];
  if (type.includes("confirmed") || type.includes("done") || type.includes("finalized")) {
    icon = iconMap["check-circle"];
  } else if (type.includes("cancelled")) {
    icon = iconMap["x-circle"];
  } else if (type.includes("checked_in")) {
    icon = iconMap["user-check"];
  } else if (type.includes("consultation")) {
    icon = iconMap["clipboard-check"];
  }

  return (
    <div style={{
      width: 34, height: 34, borderRadius: "10px",
      background: `${color}18`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, flexShrink: 0,
    }}>
      {icon}
    </div>
  );
}

// ── Dropdown panel ────────────────────────────────────────────────────────────

function NotificationDropdown({
  notifications,
  unreadCount,
  onClose,
}: {
  notifications: NotificationItem[];
  unreadCount:   number;
  onClose:       () => void;
}): ReactElement {

  function markRead(id: string): void {
    router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
  }

  function markAllRead(): void {
    router.post("/notifications/read-all", {}, { preserveScroll: true });
  }

  function handleClick(n: NotificationItem): void {
    if (!n.read) markRead(n.id);
    if (n.action_url) {
      onClose();
      router.visit(n.action_url);
    }
  }

  function dismiss(e: React.MouseEvent, id: string): void {
    e.stopPropagation();
    router.delete(`/notifications/${id}`, { preserveScroll: true } as any);
  }

  return (
    <div
      style={{
        position:      "absolute",
        top:           "calc(100% + 8px)",
        right:         0,
        width:         380,
        maxHeight:     "min(520px, 80vh)",
        background:    "var(--wc-white)",
        borderRadius:  "var(--radius-2xl)",
        boxShadow:     "var(--shadow-2xl)",
        border:        "1px solid var(--wc-gray-100)",
        display:       "flex",
        flexDirection: "column",
        overflow:      "hidden",
        zIndex:        9999,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        padding:        "16px 20px",
        borderBottom:   "1px solid var(--wc-gray-100)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        flexShrink:     0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--wc-dark)" }}>
            Notifications
          </p>
          {unreadCount > 0 && (
            <span style={{
              fontSize: "10px", fontWeight: 700,
              background: "var(--wc-blue-600)", color: "#fff",
              padding: "2px 8px", borderRadius: "100px",
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "var(--text-xs)", fontWeight: 700,
              color: "var(--wc-blue-600)", padding: 0,
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-gray-500)" }}>
              You're all caught up
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--wc-gray-400)" }}>
              No notifications yet.
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                padding:      "12px 20px",
                borderBottom: "1px solid var(--wc-gray-100)",
                background:   n.read ? "var(--wc-white)" : "var(--wc-blue-50)",
                cursor:       "pointer",
                display:      "flex",
                gap:          "12px",
                alignItems:   "flex-start",
                transition:   "background 0.15s ease",
                position:     "relative",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = n.read ? "var(--wc-gray-50)" : "#e0edff";
                // Show dismiss button on hover
                const btn = el.querySelector<HTMLButtonElement>(".notif-dismiss");
                if (btn) btn.style.opacity = "1";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = n.read ? "var(--wc-white)" : "var(--wc-blue-50)";
                const btn = el.querySelector<HTMLButtonElement>(".notif-dismiss");
                if (btn) btn.style.opacity = "0";
              }}
            >
              <NotifIcon type={n.type} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* ── Title / Subject — THIS is the heading fix ── */}
                <p style={{
                  margin: "0 0 2px",
                  fontSize: "var(--text-sm)",
                  fontWeight: n.read ? 500 : 700,
                  color: "var(--wc-dark)",
                  lineHeight: 1.3,
                  paddingRight: "20px",
                }}>
                  {getTitle(n)}
                </p>
                <p style={{
                  margin: "0 0 4px",
                  fontSize: "var(--text-xs)",
                  color: "var(--wc-gray-500)",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {n.body}
                </p>
                <p style={{ margin: 0, fontSize: "10px", color: "var(--wc-gray-400)", fontWeight: 500 }}>
                  {n.time}
                </p>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <div style={{
                  width: 8, height: 8,
                  borderRadius: "50%",
                  background: "var(--wc-blue-600)",
                  flexShrink: 0,
                  marginTop: 4,
                }} />
              )}

              {/* Dismiss × */}
              <button
                onClick={e => dismiss(e, n.id)}
                style={{
                  position:   "absolute",
                  top:        "10px",
                  right:      "12px",
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  color:      "var(--wc-gray-400)",
                  padding:    "2px",
                  fontSize:   "16px",
                  lineHeight: 1,
                  opacity:    0,
                  transition: "opacity 0.15s",
                }}
                className="notif-dismiss"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--wc-gray-100)", flexShrink: 0 }}>
          <button
            onClick={() => router.delete("/notifications", { preserveScroll: true } as any)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "var(--text-xs)", color: "var(--wc-gray-400)",
              fontWeight: 600, padding: 0,
            }}
          >
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );
}

// ── Bell button ───────────────────────────────────────────────────────────────

export function NotificationBell(): ReactElement {
  const { props }       = usePage<SharedProps>();
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  const notifications = props.notifications ?? [];
  const unreadCount   = props.unreadCount   ?? 0;

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [props]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        style={{
          position:       "relative",
          background:     "none",
          border:         "none",
          cursor:         "pointer",
          padding:        "8px",
          borderRadius:   "var(--radius-lg)",
          color:          "var(--wc-gray-500)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          transition:     "background 0.15s, color 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-gray-100)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--wc-dark)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--wc-gray-500)";
        }}
      >
        {/* Bell icon */}
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position:       "absolute",
            top:            "4px",
            right:          "4px",
            minWidth:       "16px",
            height:         "16px",
            borderRadius:   "100px",
            background:     "var(--wc-error)",
            color:          "#fff",
            fontSize:       "9px",
            fontWeight:     800,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "0 3px",
            lineHeight:     1,
            border:         "2px solid var(--wc-white)",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}