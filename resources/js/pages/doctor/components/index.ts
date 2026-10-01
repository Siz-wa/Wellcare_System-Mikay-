// resources/js/pages/doctor/components/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// What remains after the mock doctor dashboard was removed.
//
// StatCards, PatientActivity, ClinicWorkflow, AppointmentList and
// PendingLabReviews lived here to render `/doctor/dashboard`, a route with no
// controller behind it — every figure they drew came from the hardcoded arrays
// in dashboard-data.ts. That route is now a redirect to /doctor/appointments
// and the components went with it, so nothing in the app can render invented
// clinical numbers.

export { WellcareLogo } from './well-care-logo';
export { NavIcon, StatIcon, WorkflowIcon, StatusBadge } from '../icons/index';
