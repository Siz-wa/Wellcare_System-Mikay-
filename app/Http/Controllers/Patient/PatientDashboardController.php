<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * PatientDashboardController
 * ──────────────────────────────────────────────────────────────────────────────
 * FIX: Notification mapping now exposes both `title` and `subject` so the
 *      NotificationBell component shows a heading regardless of which field
 *      it reads (it falls back gracefully via `n.title ?? n.subject`).
 */
class PatientDashboardController extends Controller
{
    // ── Dashboard ─────────────────────────────────────────────────────────────

    public function dashboard(): Response
    {
        $userId = Auth::id();

        // Upcoming appointments (not cancelled/completed)
        $appointments = Appointment::where('user_id', $userId)
            ->whereNotIn('status', ['cancelled', 'no_show', 'completed'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a));

        // Past appointments — grouped by patient (first+last name)
        $pastRaw = Appointment::where('user_id', $userId)
            ->whereIn('status', ['completed', 'cancelled', 'no_show'])
            ->with(['doctor.doctorProfile', 'consultationSession'])
            ->orderByDesc('appointment_date')
            ->get();

        $pastByPatient = $pastRaw
            ->groupBy(fn (Appointment $a) => trim($a->first_name . ' ' . $a->last_name))
            ->map(fn ($group, $patientName) => [
                'patient'  => $patientName,
                'initials' => strtoupper(
                    substr(explode(' ', $patientName)[0], 0, 1) .
                    substr(explode(' ', $patientName)[1] ?? '', 0, 1)
                ),
                'records' => $group->map(fn (Appointment $a) => $this->mapPastAppointment($a))->values(),
            ])
            ->values();

        // Notifications — FIX: include `title` (alias for `subject`) so the
        // NotificationBell component always has a heading to display.
        $notifications = AppointmentNotification::where('user_id', $userId)
            ->with('appointment')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (AppointmentNotification $n) => [
                'id'            => $n->id,
                'type'          => $n->type,
                'title'         => $n->subject,   // ← NotificationBell reads `title`
                'subject'       => $n->subject,   // ← kept for backwards compat
                'body'          => $n->body,
                'read'          => $n->read,
                'time'          => $n->created_at->diffForHumans(),
                'date'          => $n->created_at->format('d M Y'),
                'action_url'    => null,
                'appointmentId' => $n->appointment_id,
            ]);

        $unreadCount = AppointmentNotification::where('user_id', $userId)
            ->where('read', false)
            ->count();

        return Inertia::render('user/dashboard', [
            'appointments'  => $appointments,
            'pastByPatient' => $pastByPatient,
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
            'stats'         => [
                'upcoming'  => $appointments->count(),
                'confirmed' => $appointments->where('status', 'confirmed')->count(),
                'pending'   => $appointments->where('status', 'requested')->count(),
            ],
        ]);
    }

    // ── Self check-in (confirmed → checked_in) ────────────────────────────────

    public function checkIn(Appointment $appointment): RedirectResponse
    {
        abort_if($appointment->user_id !== Auth::id(), 403);

        if ($appointment->status !== 'confirmed') {
            return back()->withErrors([
                'checkin' => 'You can only check in after your appointment has been confirmed by the doctor.',
            ]);
        }

        $appointment->update(['status' => 'checked_in']);

        // Notify the assigned doctor that the patient has arrived
        if ($appointment->doctor_id) {
            $name = trim($appointment->first_name . ' ' . $appointment->last_name);
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id'        => $appointment->doctor_id,
                'type'           => 'checked_in',
                'subject'        => 'Patient Has Checked In',
                'body'           => "{$name} has checked in for their {$appointment->appointment_time} appointment and is ready to be seen.",
                'read'           => false,
            ]);
        }

        return back()->with('success', 'You are checked in! Please wait — the doctor will call you shortly.');
    }

    // ── Cancel appointment ────────────────────────────────────────────────────

    public function cancel(Appointment $appointment): RedirectResponse
    {
        abort_if($appointment->user_id !== Auth::id(), 403);

        if (! in_array($appointment->status, ['requested', 'confirmed', 'pending_hmo_approval'], true)) {
            return back()->withErrors(['cancel' => 'This appointment cannot be cancelled.']);
        }

        $appointment->update([
            'status'              => 'cancelled',
            'cancellation_reason' => 'Cancelled by patient',
            'cancelled_at'        => now(),
        ]);

        return back()->with('success', 'Your appointment has been cancelled.');
    }

    // ── Mark notification read ────────────────────────────────────────────────

    public function markRead(AppointmentNotification $notification): RedirectResponse
    {
        abort_if($notification->user_id !== Auth::id(), 403);
        $notification->update(['read' => true]);
        return back();
    }

    // ── Mark all notifications read ───────────────────────────────────────────

    public function markAllRead(): RedirectResponse
    {
        AppointmentNotification::where('user_id', Auth::id())
            ->where('read', false)
            ->update(['read' => true]);
        return back();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function mapPastAppointment(Appointment $a): array
    {
        $session = $a->consultationSession;
        return [
            'id'             => $a->id,
            'service'        => ucwords(str_replace('-', ' ', $a->service)),
            'date'           => $a->appointment_date->format('d M Y'),
            'rawDate'        => $a->appointment_date->toDateString(),
            'time'           => $a->appointment_time,
            'status'         => $a->status,
            'coverage'       => $a->coverage,
            'patientStatus'  => $a->patient_status,
            'cancellationReason' => $a->cancellation_reason,
            'doctor'         => $a->doctor_id
                ? ($a->doctor?->doctorProfile?->display_name ?? null)
                : null,
            'soap' => $session ? [
                'subjective' => $session->subjective ?? null,
                'objective'  => $session->objective  ?? null,
                'assessment' => $session->assessment ?? null,
                'plan'       => $session->plan       ?? null,
            ] : null,
            'vitals' => $session ? [
                'bloodPressure'    => $session->blood_pressure    ?? null,
                'heartRate'        => $session->heart_rate        ?? null,
                'temperature'      => $session->temperature       ?? null,
                'oxygenSaturation' => $session->oxygen_saturation ?? null,
                'weight'           => $session->weight            ?? null,
                'height'           => $session->height            ?? null,
            ] : null,
        ];
    }

    private function mapAppointment(Appointment $a): array
    {
        $canCheckIn = $a->status === 'confirmed';

        return [
            'id'             => $a->id,
            'service'        => ucwords(str_replace('-', ' ', $a->service)),
            'date'           => $a->appointment_date->format('d M Y'),
            'rawDate'        => $a->appointment_date->toDateString(),
            'time'           => $a->appointment_time,
            'status'         => $a->status,
            'coverage'       => $a->coverage,
            'patientStatus'  => $a->patient_status,
            'additionalInfo' => $a->additional_info,
            'canCheckIn'     => $canCheckIn,
            'isToday'        => $a->appointment_date->isToday(),
            'isTomorrow'     => $a->appointment_date->isTomorrow(),
            'doctor'         => $a->doctor_id
                ? ($a->doctor?->doctorProfile?->display_name ?? null)
                : null,
        ];
    }
}