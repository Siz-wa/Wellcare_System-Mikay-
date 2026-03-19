// resources/js/pages/generals/book-appointment/components/time-slot-picker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Grid of clickable time slot buttons.
// Highlights the currently selected slot.

import type { ReactElement } from "react";

interface TimeSlotPickerProps {
  slots:    string[];
  value:    string;
  onChange: (slot: string) => void;
}

export function TimeSlotPicker({ slots, value, onChange }: TimeSlotPickerProps): ReactElement {
  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap:                 "var(--space-2)",
        marginTop:           "var(--space-1)",
      }}
    >
      {slots.map((slot) => {
        const active = value === slot;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onChange(slot)}
            style={{
              padding:      "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-lg)",
              border:       `1.5px solid ${active ? "var(--wc-blue-600)" : "var(--wc-gray-200)"}`,
              background:   active ? "var(--wc-blue-50)" : "var(--wc-white)",
              color:        active ? "var(--wc-blue-600)" : "var(--wc-gray-600)",
              fontWeight:   active ? 700 : 400,
              fontSize:     "var(--text-sm)",
              cursor:       "pointer",
              transition:   "all var(--duration-base) var(--ease-out)",
              boxShadow:    active ? "0 0 0 3px rgba(0,86,179,0.1)" : "none",
            }}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}