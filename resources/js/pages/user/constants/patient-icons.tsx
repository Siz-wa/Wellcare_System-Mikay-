// resources/js/pages/patient/constants/patient-icons.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the patient icon map.
// Import this in every patient page — never re-declare inline.
// NOTE: Must be .tsx (not .ts) because it contains JSX elements.

import type { ReactElement } from "react";
import {
  LayoutDashboard, CalendarCheck2, Activity,
  FolderOpen, Stethoscope, UserRound, Settings,
} from "lucide-react";

export const PATIENT_ICON_MAP: Record<string, ReactElement> = {
  dashboard:    <LayoutDashboard size={17} strokeWidth={1.8} />,
  appointments: <CalendarCheck2  size={17} strokeWidth={1.8} />,
  vitals:       <Activity        size={17} strokeWidth={1.8} />,
  records:      <FolderOpen      size={17} strokeWidth={1.8} />,
  doctors:      <Stethoscope     size={17} strokeWidth={1.8} />,
  profile:      <UserRound       size={17} strokeWidth={1.8} />,
  settings:     <Settings        size={17} strokeWidth={1.8} />,
};