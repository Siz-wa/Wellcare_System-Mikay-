<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Models\NotificationPreference;
use App\Services\AppointmentCancellationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * DoctorAppointmentController
 * ──────────────────────────────────────────────────────────────────────────────
 * Manages the doctor's Appointments page — shows requested/confirmed upcoming
 * appointments and allows the doctor to confirm or cancel them.
 *
 * FIXES applied:
 *   1. Index now filters to appointment_date >= today so past-date pending
 *      appointments no longer appear in the Upcoming section.
 *   2. authorizeDoctor now allows unassigned appointments (doctor_id = null)
 *      so doctors can confirm/cancel walk-in or HMO-routed bookings.
 */
class DoctorAppointmentController extends Controller
{
    // ── Index ─────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $doctorId = Auth::id();

        // pending_hmo_approval is NOT shown to doctors — it goes to HR first.
        // Only after HR approves (status → requested) does it appear here.
        // Unassigned appointments (doctor_id = null) are included so they can
        // be claimed / confirmed by any available doctor.
        //
        // FIX: whereDate('appointment_date', '>=', today()) removes stale past
        //      appointments that were never actioned from the Upcoming list.
        $upcoming = Appointment::where(function ($q) use ($doctorId) {
            $q->where('doctor_id', $doctorId)
                ->orWhereNull('doctor_id');
        })
            ->whereIn('status', ['requested', 'confirmed'])
            ->whereDate('appointment_date', '>=', today())   // ← ONLY today & future
            ->orderBy('appointment_at')
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a));

        // Stats (kept without date filter — accurate counts regardless of date)
        $stats = [
            'pending' => Appointment::where(fn ($q) => $q->where('doctor_id', $doctorId)->orWhereNull('doctor_id'))
                ->where('status', 'requested')
                ->whereDate('appointment_date', '>=', today())
                ->count(),
            'confirmed' => Appointment::where(fn ($q) => $q->where('doctor_id', $doctorId)->orWhereNull('doctor_id'))
                ->where('status', 'confirmed')
                ->whereDate('appointment_date', '>=', today())
                ->count(),
            'today' => Appointment::where('doctor_id', $doctorId)
                ->whereIn('status', ['confirmed', 'checked_in'])
                ->whereDate('appointment_date', today())
                ->count(),
        ];

        return Inertia::render('doctor/appointments/appointments', [
            'appointments' => $upcoming,
            'stats' => $stats,
        ]);
    }

    // ── Confirm (requested → confirmed) ──────────────────────────────────────

    public function confirm(Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);

        if ($appointment->status !== 'requested') {
            return back()->withErrors(['status' => 'Only requested appointments can be confirmed.']);
        }

        // Assign doctor if the appointment was unassigned
        $appointment->update([
            'status' => 'confirmed',
            'doctor_id' => $appointment->doctor_id ?? Auth::id(),
        ]);

        // The confirmation email used to be sent here, and it was the only
        // outbound mail in the application — one type out of fifteen.
        //
        // Task 1.2 moved delivery to AppointmentNotification::booted(), which
        // dispatches DeliverNotification for every notification the system
        // creates. Sending here as well would deliver this one twice.

        // Create in-app notification for the patient
        if ($appointment->user_id) {
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->user_id,
                'type' => 'confirmed',
                'subject' => 'Your appointment has been confirmed',
                'body' => "Your appointment on {$appointment->appointment_date->format('F j, Y')} at {$appointment->appointment_time} has been confirmed by your doctor. "
                    .($appointment->consultation_type === 'virtual'
                        ? 'On the day, check in from your dashboard and wait for your doctor to open the video room.'
                        : 'Please check in when you arrive at the clinic.'),
                'read' => false,
            ]);
        }

        // Delivery itself is decided in AppointmentNotification::booted(); this
        // only reports which way it went. Read from the same preference the
        // dispatcher consults, so the message cannot drift from what was sent.
        $emailAllowed = NotificationPreference::allows(
            $appointment->user_id,
            'email',
            'confirmed',
        );

        return back()->with('success', $emailAllowed
            ? "Appointment confirmed. A confirmation email has been sent to {$appointment->email}."
            : 'Appointment confirmed. The patient has turned off appointment emails, so none was sent.');
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    public function cancel(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizeDoctor($appointment);

        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        if (! in_array($appointment->status, ['requested', 'confirmed'], true)) {
            return back()->withErrors(['status' => 'This appointment cannot be cancelled.']);
        }

        app(AppointmentCancellationService::class)->cancel(
            $appointment,
            $request->string('reason', 'Cancelled by doctor')->toString() ?: 'Cancelled by doctor',
            AppointmentCancellationService::BY_DOCTOR,
        );

        return back()->with('success', 'Appointment cancelled and patient has been notified.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Allow the action when:
     *   - The appointment is assigned to this doctor, OR
     *   - The appointment is unassigned (walk-in / HMO-routed, doctor_id = null)
     *
     * This fixes the original bug where confirming an unassigned appointment
     * would 403 because null !== Auth::id().
     */
    private function authorizeDoctor(Appointment $appointment): void
    {
        abort_if(
            $appointment->doctor_id !== null && $appointment->doctor_id !== Auth::id(),
            403
        );
    }

    private function mapAppointment(Appointment $a): array
    {
        return [
            'id' => $a->id,
            'patientId' => 'A-'.str_pad($a->id, 4, '0', STR_PAD_LEFT),
            'patient' => trim($a->first_name.' '.$a->last_name),
            'initials' => strtoupper(substr($a->first_name, 0, 1).substr($a->last_name, 0, 1)),
            'email' => $a->email,
            'contactNumber' => $a->contact_number,
            'age' => $a->age,
            'gender' => $a->gender,
            'service' => ucwords(str_replace('-', ' ', $a->service)),
            'date' => $a->appointment_date->format('d M Y'),
            'rawDate' => $a->appointment_date->toDateString(),
            'time' => $a->appointment_time,
            'patientStatus' => $a->patient_status,
            'coverage' => $a->coverage,
            // So a doctor can tell a video visit from an in-person one before
            // confirming it — they prepare differently for each.
            'consultationType' => $a->consultation_type,
            'hmo' => $a->hmo,
            'status' => $a->status,
            'additionalInfo' => $a->additional_info,
            'isToday' => $a->appointment_date->isToday(),
            'isTomorrow' => $a->appointment_date->isTomorrow(),
        ];
    }
}
