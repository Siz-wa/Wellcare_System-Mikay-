// resources/js/pages/patient/records/components/record-type-icon.tsx
import type { ReactElement } from "react";
import type { RecordType }   from "../../patient-data";

interface Props {
  type:  RecordType;
  size?: number;
}

const ICONS: Record<RecordType, ReactElement> = {
  lab: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
    </svg>
  ),
  xray: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 9h6M9 12h6M9 15h4"/>
    </svg>
  ),
  prescription: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  ),
  consult: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  imaging: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
};

const BG_COLORS: Record<RecordType, string> = {
  lab:          "#eff6ff",
  xray:         "#f3f0ff",
  prescription: "#fef9c3",
  consult:      "#dcfce7",
  imaging:      "#fff7ed",
};

const FG_COLORS: Record<RecordType, string> = {
  lab:          "#0056b3",
  xray:         "#7c3aed",
  prescription: "#a16207",
  consult:      "#16a34a",
  imaging:      "#c2410c",
};

export function RecordTypeIcon({ type, size = 44 }: Props): ReactElement {
  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   "var(--radius-xl)",
      background:     BG_COLORS[type],
      color:          FG_COLORS[type],
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      flexShrink:     0,
    }}>
      {ICONS[type]}
    </div>
  );
}