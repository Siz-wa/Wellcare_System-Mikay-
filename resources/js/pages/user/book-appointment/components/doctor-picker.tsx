// resources/js/pages/generals/book-appointment/components/doctor-picker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Searchable dropdown that restricts doctor selection to the real roster.
// No free-text accepted — eliminates validation loops entirely.
// Reusable: pass any doctorsData-shaped list via the `doctors` prop.

import type { ReactElement }  from "react";
import { useState, useRef, useEffect } from "react";
import type { DoctorItem }    from "@/pages/generals/doctors/sections/doctors-data";

export interface DoctorPickerProps {
  doctors:  DoctorItem[];   // the roster to search — pass doctorsData
  value:    string;         // currently selected doctor name (or "" for none)
  onChange: (name: string) => void;
  error?:   string;
}

export function DoctorPicker({
  doctors,
  value,
  onChange,
  error,
}: DoctorPickerProps): ReactElement {
  const [query, setQuery] = useState(value);
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);

  // Keep display query in sync when parent resets the value (e.g. form reset)
  useEffect(() => { setQuery(value); }, [value]);

  // Close and revert unconfirmed text when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      if (!doctors.some((d) => d.name === query)) {
        setQuery(value); // revert to last confirmed value
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [query, value, doctors]);

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.specialization.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (name: string) => {
    setQuery(name || "");
    onChange(name);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <input
          className={`wc-input${error ? " wc-input-error" : ""}`}
          type="text"
          placeholder="Search by name or specialization…"
          value={query}
          autoComplete="off"
          style={{ paddingRight: query ? "var(--space-10)" : undefined }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange("");   // clear confirmed selection while user is typing
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />

        {/* Clear × button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear doctor selection"
            style={{
              position:   "absolute",
              right:      "var(--space-3)",
              top:        "50%",
              transform:  "translateY(-50%)",
              background: "none",
              border:     "none",
              cursor:     "pointer",
              color:      "var(--wc-gray-400)",
              fontSize:   "var(--text-lg)",
              lineHeight: 1,
              padding:    0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown list */}
      {open && query.length > 0 && (
        <div
          role="listbox"
          style={{
            position:     "absolute",
            top:          "calc(100% + 4px)",
            left:         0,
            right:        0,
            background:   "var(--wc-white)",
            border:       "1.5px solid var(--wc-gray-200)",
            borderRadius: "var(--radius-xl)",
            boxShadow:    "var(--shadow-xl)",
            zIndex:       "var(--z-overlay)" as React.CSSProperties["zIndex"],
            maxHeight:    260,
            overflowY:    "auto",
          }}
        >
          {/* Matched doctors */}
          {filtered.length === 0 ? (
            <div style={{
              padding:  "var(--space-4) var(--space-5)",
              fontSize: "var(--text-sm)",
              color:    "var(--wc-gray-400)",
            }}>
              No doctors found matching "{query}"
            </div>
          ) : (
            filtered.map((doc) => {
              const isSelected = value === doc.name;
              return (
                <button
                  key={doc.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(doc.name)}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "var(--space-3)",
                    width:        "100%",
                    padding:      "var(--space-3) var(--space-4)",
                    background:   isSelected ? "var(--wc-blue-50)" : "transparent",
                    border:       "none",
                    borderBottom: "1px solid var(--wc-gray-100)",
                    cursor:       "pointer",
                    textAlign:    "left",
                    transition:   "background var(--duration-fast) var(--ease-out)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-gray-50)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width:          32,
                    height:         32,
                    borderRadius:   "var(--radius-full)",
                    background:     doc.color,
                    color:          "#ffffff",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize:       "var(--text-xs)",
                    fontWeight:     700,
                    flexShrink:     0,
                  }}>
                    {doc.initials}
                  </div>

                  {/* Name + specialization */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize:     "var(--text-sm)",
                      fontWeight:   600,
                      color:        "var(--wc-dark)",
                      margin:       0,
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace:   "nowrap",
                    }}>
                      {doc.name}
                    </p>
                    <p style={{
                      fontSize: "var(--text-xs)",
                      color:    "var(--wc-gray-400)",
                      margin:   0,
                    }}>
                      {doc.specialization}
                    </p>
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <span style={{
                      color:      "var(--wc-blue-600)",
                      fontWeight: 700,
                      fontSize:   "var(--text-sm)",
                      flexShrink: 0,
                    }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}

          {/* No preference — always at the bottom */}
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            onClick={() => handleSelect("")}
            style={{
              display:    "flex",
              alignItems: "center",
              width:      "100%",
              padding:    "var(--space-3) var(--space-4)",
              background: value === "" ? "var(--wc-blue-50)" : "transparent",
              border:     "none",
              cursor:     "pointer",
              textAlign:  "left",
              fontSize:   "var(--text-sm)",
              color:      "var(--wc-gray-400)",
              fontStyle:  "italic",
            }}
          >
            No preference — assign next available doctor
          </button>
        </div>
      )}
    </div>
  );
}