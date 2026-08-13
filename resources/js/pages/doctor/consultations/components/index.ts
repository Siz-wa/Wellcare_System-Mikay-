// resources/js/pages/user/consultations/components/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel export — import any component from this single path.

// Use curly braces because the file uses 'export const' or 'export function'
export { SearchFilterBar } from '../../layout/components/search-filter-bar';
export { ConsultationsTable } from './consultation-table';

export { SessionEditor } from '../session-editor/session-editor';
export { SoapNotes } from '../session-editor/soap-notes';
export { PatientVitals } from '../session-editor/patient-vitals';
export { Prescription } from '../session-editor/prescription';
