<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HmoApprovalController extends Controller
{
    public function index(): Response
    {
        $pending = Appointment::where('status', 'pending_hmo_approval')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn (Appointment $a) => $this->mapAppointment($a));

        $stats = [
            'pending'       => $pending->count(),
            'approvedToday' => Appointment::where('coverage', 'hmo')
                ->where('status', 'requested')
                ->whereDate('updated_at', today())
                ->count(),
            'rejectedToday' => Appointment::where('coverage', 'hmo')
                ->where('status', 'cancelled')
                ->whereDate('cancelled_at', today())
                ->count(),
        ];

        return Inertia::render('hr/hmo-approvals/hmo-approvals', [
            'appointments' => $pending,
            'stats'        => $stats,
        ]);
    }

    public function approve(Appointment $appointment): RedirectResponse
    {
        abort_if(
            $appointment->status !== 'pending_hmo_approval',
            422,
            'Only pending HMO appointments can be approved.'
        );

        $appointment->update(['status' => 'requested']);

        // Notify patient their HMO was approved and appointment is pending doctor confirmation
        if ($appointment->user_id) {
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id'        => $appointment->user_id,
                'type'           => 'hmo_approved',
                'subject'        => 'HMO Approved — Appointment Pending',
                'body'           => "Your HMO coverage for your appointment on {$appointment->appointment_date->format('M j, Y')} at {$appointment->appointment_time} has been verified. Your appointment is now pending doctor confirmation.",
                'read'           => false,
            ]);
        }

        return back()->with('success',
            "HMO appointment for {$appointment->first_name} {$appointment->last_name} approved and forwarded to the doctor."
        );
    }

    public function reject(Request $request, Appointment $appointment): RedirectResponse
    {
        // Allow rejection of pending_hmo_approval OR requested (HMO appointments
        // that were approved but not yet confirmed by doctor)
        abort_if(
            ! in_array($appointment->status, ['pending_hmo_approval', 'requested'], true)
            || $appointment->coverage !== 'hmo',
            422,
            'This appointment cannot be rejected.'
        );

        $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ], [
            'reason.required' => 'Please provide a reason for rejecting this HMO appointment.',
        ]);

        $appointment->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $request->string('reason')->toString(),
            'cancelled_at'        => now(),
        ]);

        if ($appointment->user_id) {
            AppointmentNotification::create([
                'appointment_id' => $appointment->id,
                'user_id'        => $appointment->user_id,
                'type'           => 'hmo_rejected',
                'subject'        => 'HMO Appointment Rejected',
                'body'           => "We're sorry, your HMO appointment on {$appointment->appointment_date->format('M j, Y')} has been rejected. Reason: {$request->string('reason')}",
                'read'           => false,
            ]);
        }

        return back()->with('success', 'Appointment rejected. The patient has been notified.');
    }

    private function mapAppointment(Appointment $a): array
    {
        return [
            'id'            => $a->id,
            'patient'       => trim($a->first_name . ' ' . $a->last_name),
            'initials'      => strtoupper(substr($a->first_name, 0, 1) . substr($a->last_name, 0, 1)),
            'email'         => $a->email,
            'contactNumber' => $a->contact_number,
            'age'           => $a->age,
            'gender'        => $a->gender,
            'service'       => ucwords(str_replace('-', ' ', $a->service)),
            'date'          => $a->appointment_date->format('d M Y'),
            'rawDate'       => $a->appointment_date->toDateString(),
            'time'          => $a->appointment_time,
            'hmo'           => $a->hmo,
            'hmoId'         => $a->hmo_id,
            'coverage'      => $a->coverage,
            'patientStatus' => $a->patient_status,
            'isToday'       => $a->appointment_date->isToday(),
            'isTomorrow'    => $a->appointment_date->isTomorrow(),
        ];
    }
}