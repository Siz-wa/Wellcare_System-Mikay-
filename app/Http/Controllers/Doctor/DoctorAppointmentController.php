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
use App\Services\NotificationService;

/**
 * DoctorAppointmentController
 * ──────────────────────────────────────────────────────────────────────────────
 * Manages the doctor's Appointments page — shows requested/confirmed upcoming
 * appointments and allows the doctor to confirm them.
 *
 * Industry practice:
 *   Confirming an appointment is done here (Appointments page), NOT on the
 *   Consultations page. Consultations = active clinical sessions (checked_in,
 *   in_progress, completed). Appointments = scheduled upcoming visits.
 *   Mixing them would force doctors to hunt through active sessions to find
 *   pending requests — a common UX mistake in clinic software.
 *
 * Routes (add inside role:doctor middleware group):
 *   GET  /doctor/appointments                        → index
 *   POST /doctor/appointments/{appointment}/confirm  → confirm
 *   POST /doctor/appointments/{appointment}/cancel   → cancel
 */
class DoctorAppointmentController extends Controller
{
    // ── Index ─────────────────────────────────────────────────────────────────

    public function __construct(
    private readonly NotificationService $notifications,  // ADD THIS
    ) {}

    public function index(Request $request): Response
    {
        $doctorId = Auth::id();

        $upcoming = Appointment::where('doctor_id', $doctorId)
            ->whereIn('status', ['requested', 'confirmed'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a));

        // Stats for the top cards
        $stats = [
            'pending'   => Appointment::where('doctor_id', $doctorId)->where('status', 'requested')->count(),
            'confirmed' => Appointment::where('doctor_id', $doctorId)->where('status', 'confirmed')->count(),
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

        $appointment->update(['status' => 'confirmed']);
        $this->notifications->appointmentConfirmed($appointment);


        // Send confirmation email to patient
        Mail::to($appointment->email)->send(new AppointmentConfirmedMail($appointment));

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
        $this->notifications->appointmentCancelled(
            $appointment,
            $request->string('reason', '')->toString()
        );

        return back()->with('success', 'Appointment cancelled.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function authorizeDoctor(Appointment $appointment): void
    {
        abort_if($appointment->doctor_id !== Auth::id(), 403);
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