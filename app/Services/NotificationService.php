<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\User;
use App\Notifications\AppointmentRequestedNotification;
use App\Notifications\AppointmentConfirmedNotification;
use App\Notifications\AppointmentCancelledNotification;
use App\Notifications\PatientCheckedInNotification;
use App\Notifications\ConsultationFinalizedNotification;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

/**
 * NotificationService
 * ──────────────────────────────────────────────────────────────────────────────
 * Central dispatch point for all Wellcare notifications.
 * Controllers call one method here — this service decides who gets notified.
 *
 * Role targeting:
 *   notifyRole('admin')  → all users with role "admin"
 *   notifyRole('doctor') → only the assigned doctor on the appointment
 *   notifyRole('nurse')  → all users with role "nurse"
 *   notifyRole('user')   → the patient (user_id on the appointment)
 */
class NotificationService
{
    // ── Appointment booked by patient ─────────────────────────────────────────
    // Notifies: admin + HR (they manage the schedule)

    public function appointmentRequested(Appointment $appointment): void
    {
        $admins = $this->getUsersByRoles(['admin', 'hr']);
        Notification::send($admins, new AppointmentRequestedNotification($appointment));
    }

    // ── Doctor confirms appointment ───────────────────────────────────────────
    // Notifies: the patient

    public function appointmentConfirmed(Appointment $appointment): void
    {
        $patient = $this->getPatient($appointment);
        if ($patient) {
            $patient->notify(new AppointmentConfirmedNotification($appointment));
        }
    }

    // ── Appointment cancelled (by doctor or admin) ────────────────────────────
    // Notifies: the patient

    public function appointmentCancelled(Appointment $appointment, string $reason = ''): void
    {
        $patient = $this->getPatient($appointment);
        if ($patient) {
            $patient->notify(new AppointmentCancelledNotification($appointment, $reason));
        }
    }

    // ── Patient checks in ─────────────────────────────────────────────────────
    // Notifies: assigned doctor + all nurses

    public function patientCheckedIn(Appointment $appointment): void
    {
        $recipients = collect();

        // Assigned doctor
        if ($appointment->doctor_id) {
            $doctor = User::find($appointment->doctor_id);
            if ($doctor) $recipients->push($doctor);
        }

        // All nurses
        $nurses = $this->getUsersByRoles(['nurse']);
        $recipients = $recipients->merge($nurses)->unique('id');

        Notification::send($recipients, new PatientCheckedInNotification($appointment));
    }

    // ── Consultation finalized ────────────────────────────────────────────────
    // Notifies: the patient

    public function consultationFinalized(Appointment $appointment): void
    {
        $patient = $this->getPatient($appointment);
        if ($patient) {
            $patient->notify(new ConsultationFinalizedNotification($appointment));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function getPatient(Appointment $appointment): ?User
    {
        return $appointment->user_id ? User::find($appointment->user_id) : null;
    }

    private function getUsersByRoles(array $roleNames): \Illuminate\Support\Collection
    {
        return User::whereHas('roles', fn ($q) => $q->whereIn('name', $roleNames))->get();
    }
}