<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Mail\AppointmentConfirmedMail;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
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
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a));

        // Stats (kept without date filter — accurate counts regardless of date)
        $stats = [
            'pending'   => Appointment::where(fn ($q) => $q->where('doctor_id', $doctorId)->orWhereNull('doctor_id'))
                ->where('status', 'requested')
                ->whereDate('appointment_date', '>=', today())
                ->count(),
            'confirmed' => Appointment::where(fn ($q) => $q->where('doctor_id', $doctorId)->orWhereNull('doctor_id'))
                ->where('status', 'confirmed')
                ->whereDate('appointment_date', '>=', today())
                ->count(),
            'today'     => Appointment::where('doctor_id', $doctorId)
                ->whereIn('status', ['confirmed', 'checked_in'])
                ->whereDate('appointment_date', today())
                ->count(),
        ];

        return Inertia::render('doctor/appointments/appointments', [
            'appointments' => $upcoming,
            'stats'        => $stats,
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
            'status'    => 'confirmed',
            'doctor_id' => $appointment->doctor_id ?? Auth::id(),
        ]);

        // Send confirmation email to patient
        Mail::to($appointment->email)->send(new AppointmentConfirmedMail($appointment));

        // Create in-app notification for the patient
        if ($appointment->user_id) {
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id'        => $appointment->user_id,
                'type'           => 'confirmed',
                'subject'        => 'Your appointment has been confirmed',
                'body'           => "Your appointment on {$appointment->appointment_date->format('F j, Y')} at {$appointment->appointment_time} has been confirmed by your doctor. Please check in when you arrive at the clinic.",
                'read'           => false,
            ]);
        }

        return back()->with('success', "Appointment confirmed. A confirmation email has been sent to {$appointment->email}.");
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

        $appointment->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $request->string('reason', 'Cancelled by doctor')->toString(),
            'cancelled_at'        => now(),
        ]);

        if ($appointment->user_id) {
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id'        => $appointment->user_id,
                'type'           => 'cancelled',
                'subject'        => 'Your appointment has been cancelled',
                'body'           => "We're sorry, your appointment on {$appointment->appointment_date->format('F j, Y')} at {$appointment->appointment_time} has been cancelled. Please book a new appointment at your convenience.",
                'read'           => false,
            ]);
        }

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
            'id'             => $a->id,
            'patientId'      => 'A-' . str_pad($a->id, 4, '0', STR_PAD_LEFT),
            'patient'        => trim($a->first_name . ' ' . $a->last_name),
            'initials'       => strtoupper(substr($a->first_name, 0, 1) . substr($a->last_name, 0, 1)),
            'email'          => $a->email,
            'contactNumber'  => $a->contact_number,
            'age'            => $a->age,
            'gender'         => $a->gender,
            'service'        => ucwords(str_replace('-', ' ', $a->service)),
            'date'           => $a->appointment_date->format('d M Y'),
            'rawDate'        => $a->appointment_date->toDateString(),
            'time'           => $a->appointment_time,
            'patientStatus'  => $a->patient_status,
            'coverage'       => $a->coverage,
            'hmo'            => $a->hmo,
            'status'         => $a->status,
            'additionalInfo' => $a->additional_info,
            'isToday'        => $a->appointment_date->isToday(),
            'isTomorrow'     => $a->appointment_date->isTomorrow(),
        ];
    }
}