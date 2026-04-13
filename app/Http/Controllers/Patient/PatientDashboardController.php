<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
/**
 * PatientDashboardController
 * ──────────────────────────────────────────────────────────────────────────────
 * Routes (add inside role:user middleware group):
 *   GET  /user/dashboard                                → dashboard
 *   POST /user/appointments/{appointment}/check-in     → checkIn
 *   POST /user/notifications/{notification}/read       → markRead
 *   POST /user/notifications/read-all                  → markAllRead
 */
class PatientDashboardController extends Controller
{
    public function __construct(
            private readonly NotificationService $notifications,  // ADD THIS
    ) {}
    // ── Dashboard ─────────────────────────────────────────────────────────────

    public function dashboard(): Response
    {
        $userId = Auth::id();
        $user   = Auth::user();

        // Upcoming appointments (not cancelled/completed)
        $appointments = Appointment::where('user_id', $userId)
            ->whereNotIn('status', ['cancelled', 'no_show', 'completed'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a));

        // Past appointments (completed/cancelled)
        $pastAppointments = Appointment::where('user_id', $userId)
            ->whereIn('status', ['completed', 'cancelled', 'no_show'])
            ->orderByDesc('appointment_date')
            ->limit(5)
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a));

        // Notifications
        $notifications = AppointmentNotification::where('user_id', $userId)
            ->with('appointment')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (AppointmentNotification $n) => [
                'id'      => $n->id,
                'type'    => $n->type,
                'subject' => $n->subject,
                'body'    => $n->body,
                'read'    => $n->read,
                'time'    => $n->created_at->diffForHumans(),
                'date'    => $n->created_at->format('d M Y'),
                'appointmentId' => $n->appointment_id,
            ]);

        $unreadCount = AppointmentNotification::where('user_id', $userId)
            ->where('read', false)
            ->count();

        return Inertia::render('user/dashboard', [
            'appointments'     => $appointments,
            'pastAppointments' => $pastAppointments,
            'stats'            => [
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
        // COMMENTED THIS OUT TEMPORARILY FOR TESTING THE APPOINTMENT CHECK-IN
        // if (! $appointment->appointment_date->isToday()) {
        //     return back()->withErrors([
        //         'checkin' => 'You can only check in on the day of your appointment.',
        //     ]);
        // }

        $appointment->update(['status' => 'checked_in']);
        $this->notifications->patientCheckedIn($appointment);

        return back()->with('success', 'You are checked in. Please wait for the doctor to call you.');
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

    private function mapAppointment(Appointment $a): array
    {   
        // Allow check-in if status is confirmed, regardless of date (TEMPORARY FOR TESTING)
        // $canCheckIn = $a->status === 'confirmed' && $a->appointment_date->isToday();
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
                ? ($a->doctor->doctorProfile->display_name ?? null)
                : null,
        ];
    }
}