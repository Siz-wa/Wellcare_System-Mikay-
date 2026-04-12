// resources/js/pages/settings/components/shared/notifications-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared notifications panel — works for both doctor and patient.

import { type ReactElement, useState } from "react";
import { notificationsStrings }        from "../../settings-data";

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label, desc, enabled, onChange,
}: { label: string; desc: string; enabled: boolean; onChange: (v: boolean) => void }): ReactElement {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "var(--space-4) var(--space-5)",
      background: "#f8fafc", borderRadius: "var(--radius-2xl)",
      border: "1px solid #f1f5f9",
    }}>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: 700, color: "#0f172a" }}>{label}</p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#94a3b8" }}>{desc}</p>
      </div>
      {/* Toggle switch */}
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none",
          background: enabled ? "var(--wc-blue-600)" : "#e2e8f0",
          cursor: "pointer", position: "relative", flexShrink: 0,
          transition: "background 200ms ease",
        }}
      >
        <span style={{
          position: "absolute", top: 3,
          left: enabled ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          transition: "left 200ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </button>
    </div>
  );
}

// ── Notifications Form ────────────────────────────────────────────────────────

export default function NotificationsForm(): ReactElement {
  const s = notificationsStrings;

  const [channels, setChannels] = useState<Record<string, boolean>>({
    email: true, sms: true, system: true,
  });

  const [events, setEvents] = useState<Record<string, boolean>>(
    Object.fromEntries(s.events.map(e => [e.id, e.default]))
  );

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

      {/* Channels */}
      <div>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-gray-700)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Delivery Channels
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {s.channels.map(ch => (
            <ToggleRow
              key={ch.id} label={ch.label} desc={ch.desc}
              enabled={channels[ch.id] ?? false}
              onChange={v => setChannels(prev => ({ ...prev, [ch.id]: v }))}
            />
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: "var(--wc-gray-100)" }} />

      {/* Events */}
      <div>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--wc-gray-700)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Notify Me When...
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {s.events.map(ev => (
            <ToggleRow
              key={ev.id} label={ev.label} desc=""
              enabled={events[ev.id] ?? false}
              onChange={v => setEvents(prev => ({ ...prev, [ev.id]: v }))}
            />
          ))}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button type="button" onClick={handleSave} className="wc-btn wc-btn-primary wc-btn-md">
          {s.saveLabel}
        </button>
        {saved && (
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--wc-success)", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {s.savedLabel}
          </span>
        )}
      </div>
    </div>
  );
}