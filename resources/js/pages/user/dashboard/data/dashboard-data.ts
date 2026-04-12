// resources/js/pages/patient/dashboard/data/dashboard-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Re-exports everything the dashboard page needs from the shared patient-data.
// If dashboard-specific data grows, add it here without touching patient-data.ts.

export {
  mockAppointments,
  mockPatientProfile,
  mockPatientMedical,
  mockPreferredDoctor,
  patientMeta as patientDashboardMeta,
  type Appointment,
  type AppointmentStatus,
  type PatientProfile,
  type PatientMedical,
  type DoctorProfile,
} from "../../patient-data";